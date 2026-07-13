// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

interface IAssemblyManager {
    enum ProductStatus { Assembling, Completed, Shipped }
    
    // Allows logistics to verify the factory floor finished the build
    function finalProducts(string calldata _productQrCode) external view returns (
        string memory qrCode,
        ProductStatus status,
        uint256 componentCount,
        uint256 timestamp
    );
    
    // Allows logistics to alter assembly tracker state when things shift
    function updateProductStatus(string calldata _productQrCode, uint8 _newStatus) external;

    function setComponentStatus(string calldata _qrCode, uint8 _newStatus) external;

    function archiveLegacyParent(string calldata _componentQrCode, string calldata _parentProductQrCode) external;

    // Overwrites the product slot with a fresh replacement part
    function assignComponentToSlot(
        string calldata _productQrCode, 
        string calldata _componentType, 
        string calldata _replacementComponentQrCode
    ) external returns (string memory oldComponentQr);

    function preAllocateFinalUnit(uint256 _modelId, uint256 _ts) external returns (string memory);

    function components(string calldata qr) external view returns (string memory qrCode, bytes32 componentType, uint8 status, string memory defectNotes, string memory finalProductId);
}

interface IAssetPurchase {
    
    // Allows logistics to verify the factory floor finished the build
    function processReturn(bytes32 purchaseHash, bool isRepair) external;
}

contract LogisticsManager is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {

    IAssemblyManager public assemblyManager;
    IAssetPurchase public assetPurchase;
    
    enum ShippingStatus { 
        Pending, InTransit, OutForDelivery, Delivered, AwaitingAssembly,
        Exception, ReturnedToSender, ReturnRequested, 
        ReturnInTransit, ReturnReceived, Refunded, ReturnDisputed 
    }

    struct Order {
        bytes32 orderId;
        address buyer;
        uint256 purchaseIndex;     // The unique transaction count from your purchase contract
        uint256 modelId;
        string finalProductId;     // The unique build serial/QR from AssemblyTracker
        uint256 value;
        ShippingStatus status;
        bytes32 forwardTrackingHash; 
        bytes32 returnTrackingHash;  
    }

    struct ShippingDetails {
        string street;
        string city;
        string state;
        string zip;
        string country;
    }

    error NotAuthorized();
    error NotEligibleForSwap();
    error TrackingActive();
    error ShipmentLinked();
    error UnitAssignedToCustomer();
    error ReplacementInProcess();
    error ReplacementAllocated();
    error ReturnReceiptNotConfirmed();
    error OrderDoesNotExist();
    error BuildIncomplete();
    error TrackingNumberRequired();

    address[] private admins;
    
    // Changed to internal to stop bytecode bloat from auto-generated getters
    mapping(bytes32 => Order) internal orders;
    mapping(bytes32 => bytes32) internal trackingToPurchaseHash;

    // Safety checks to prevent double-allocations (Multi-nested = huge bytecode savings)
    mapping(address => mapping(uint256 => bool)) internal purchaseLinked;
    mapping(address => mapping(bytes32 => string)) internal userPurchaseBuilds;
    
    mapping(string => bytes32) internal buildIdAssigned;
    mapping(string => string) internal qrAssigned;
    mapping(string => bytes32) internal buildTrackingNumbers;
    mapping(bytes32 => ShippingDetails) internal trackingToDestination;
    
    // Explicitly marking visibility for clean architecture
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => uint256) private adminIndex;

    event ShippingDetailsUpdated(bytes32 indexed trackingNumber, string zip, string country);

    function initialize(address _owner, address _assemblyTracker, address _assetPurchase) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _transferOwnership(_owner);
        assemblyManager = IAssemblyManager(_assemblyTracker);
        assetPurchase = IAssetPurchase(_assetPurchase);

    }

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    // --- SHIPPING TO THE USER (THE LINK) ---
    /**
     * @notice Initiates a shipment or triggers a new factory build request.
     * @param _buyer The customer address.
     * @param _purchaseIndex The payment identifier index from your payment contract.
     * @param _purchaseHash The unified key that will act as the orderId.
     * @param _modelId The model layout blueprint required.
     * @param _existingBuildId For inventory allocation. Pass an empty string "" if this is a custom BTO request.
     */
    function initiateShipment(
        address _buyer,
        uint256 _purchaseIndex,
        bytes32 _purchaseHash,
        uint256 _modelId,
        bool _isBto,
        string calldata _existingBuildId,
        uint256 _value,
        bytes32 _trackingNumber,
        uint256 _ts
    ) external {
        if (msg.sender != owner() && !_isAdmin(msg.sender)) revert NotAuthorized();
        if (purchaseLinked[_buyer][_purchaseIndex]) revert ShipmentLinked();

        string memory targetBuildId;
        ShippingStatus initialShippingState;

        // --- BRANCH LOGIC WITH BTO FAIL-SAFE FALLBACK ---
        // Even if _isBto is false, if the string is empty it safely converts to BTO
        if (!_isBto && bytes(_existingBuildId).length > 0) {
                        
            (, IAssemblyManager.ProductStatus buildStatus, , ) = assemblyManager.finalProducts(_existingBuildId);
            if (buildStatus != IAssemblyManager.ProductStatus.Completed) revert BuildIncomplete();

            targetBuildId = _existingBuildId;
            initialShippingState = ShippingStatus.Pending; 

            assemblyManager.updateProductStatus(targetBuildId, 2); // Mark as Shipped
            
        } else {
            // Flow B: Build-To-Order (Assembler-Driven Configuration Path)
            
            // 1. Let the assembly floor handle the ID calculation and state modification atomically
            targetBuildId = assemblyManager.preAllocateFinalUnit(_modelId, _ts);
            initialShippingState = ShippingStatus.AwaitingAssembly; 
        }

        if (buildIdAssigned[targetBuildId] != bytes32(0)) revert UnitAssignedToCustomer();

        userPurchaseBuilds[_buyer][_purchaseHash] = targetBuildId;
        buildIdAssigned[targetBuildId] = _purchaseHash;
    
        buildTrackingNumbers[targetBuildId] = _trackingNumber;

        if (_trackingNumber != bytes32(0)) {
            trackingToPurchaseHash[_trackingNumber] = _purchaseHash;
        }

        // --- PERSIST UNIFIED ORDER DATA ---
        orders[_purchaseHash] = Order({
            orderId: _purchaseHash,
            buyer: _buyer,
            purchaseIndex: _purchaseIndex,
            modelId: _modelId,
            finalProductId: targetBuildId, // Safely receives the generated string from the assembler
            value: _value,
            status: initialShippingState,
            forwardTrackingHash: bytes32(0),
            returnTrackingHash: bytes32(0)
        });
    }

    /**
     * @notice Binds granular physical delivery metadata to an active tracking number.
     * @param _trackingNumber The carrier tracking identifier acting as the link.
     * @param _details The bundled street, city, state, zip, and country strings.
     */
    function setShippingDetails(
        bytes32 _trackingNumber,
        ShippingDetails calldata _details
    ) external {
        // Enforce the same admin controls you have on your other routing functions
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        if (_trackingNumber == bytes32(0)) revert TrackingNumberRequired();
        
        // Optional Fail-Safe: Ensure a shipment was actually initialized for this tracking number first
        if (trackingToPurchaseHash[_trackingNumber] == bytes32(0)) revert OrderDoesNotExist();

        // Store the data efficiently in your storage layout
        trackingToDestination[_trackingNumber] = _details;

        emit ShippingDetailsUpdated(_trackingNumber, _details.zip, _details.country);
    }

    // --- RETURNS FROM THE USER & REFUND POOL RELEASE ---
    /**
     * @notice Processes the refund or repair loop, coordinating local shipping tracking 
     * states with backend assets and factory registries.
     */
    function processReturn(
        bytes32 _purchaseHash,
        ShippingStatus _carrierStatus,
        bool _isRepair
    ) external nonReentrant {
        // Ensure only PurchaseHub (or authorized backend admin) can call this pipeline
        if (!_isAdmin(msg.sender)) revert NotAuthorized();

        Order storage order = orders[_purchaseHash];
        string memory targetBuildId = order.finalProductId;
        address buyerAddress = order.buyer;

        if (_isRepair) {
            // ===================================================
            //  TRACK A: HARDWARE REPAIR INTAKE ROUTE
            // ===================================================
            
            // Dynamically mirror the explicit status verified by the carrier network input
            order.status = _carrierStatus; 

            // RETAIN MAPPINGS: Do not wipe maps or free product IDs. 
            // The user remains the legal owner of this physical device.

            // Pass the call down to AssetPurchase to trigger internal state milestones
            assetPurchase.processReturn(_purchaseHash, true);

        } else {
            // ===================================================
            //  TRACK B: PURE INVENTORY REFUND ROUTE
            // ===================================================
            
            // Reject the transaction for pure inventory liquidation if the carrier hasn't dropped it off yet
            if (_carrierStatus != ShippingStatus.ReturnReceived) revert ReturnReceiptNotConfirmed();
            
            // 1. Update the local tracking state machine
            order.status = ShippingStatus.Refunded;

            // 2. UNASSIGNMENT LAYER: Wiping the relational mapping slots completely
            delete userPurchaseBuilds[buyerAddress][_purchaseHash];
            delete buildIdAssigned[targetBuildId];
            purchaseLinked[buyerAddress][order.purchaseIndex] = false;

            // 3. FACTORY STATE RELEASE: Re-pool the machine for new sales orders
            assemblyManager.updateProductStatus(targetBuildId, 1);

            // 4. FINANCIAL SETTLEMENT: Dispatch out to AssetPurchase for credit execution
            assetPurchase.processReturn(_purchaseHash, false); 
        }
    }

    // --- SCENARIO A: REPLACING DEFECTIVE UNITS (THE UNIT SWAP) ---
    /**
     * @notice Assembler-focused component swap. Resolves the active tracking record using 
     * EITHER the purchase hash OR the core Build ID for seamless floor operations.
     * @param _purchaseHash Optional: The master order hash (can pass bytes32(0) if unknown).
     * @param _targetBuildId Optional: The parent Build ID string (can pass "" if hash is provided).
     * @param _componentType The string identifier of the part slot (e.g., "JET_A", "E_CHAMBER").
     * @param _newComponentQrCode The fresh replacement component serial being inserted.
     * @param _newForwardTrackingHash The carrier tracking hash for shipping the replacement.
     */
    function swapDefectiveComponentByType(
        bytes32 _purchaseHash,
        string calldata _targetBuildId,
        string calldata _componentType,
        string calldata _newComponentQrCode,
        bytes32 _newForwardTrackingHash
    ) external {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        if (trackingToPurchaseHash[_newForwardTrackingHash] != 0) revert TrackingActive();

        // --- DUAL RESOLUTION LAYER ---
        bytes32 activeHash = _purchaseHash;
        string memory activeBuildId = _targetBuildId;

        if (activeHash == bytes32(0)) {
            activeHash = buildIdAssigned[_targetBuildId];
            if (activeHash == bytes32(0)) revert OrderDoesNotExist();
        } else if (bytes(activeBuildId).length == 0) {
            Order storage orderLookup = orders[activeHash];
            activeBuildId = orderLookup.finalProductId;
        }

        Order storage order = orders[activeHash];

        if (
            order.status != ShippingStatus.Exception && 
            order.status != ShippingStatus.ReturnReceived && 
            order.status != ShippingStatus.ReturnRequested
        ) revert NotEligibleForSwap();

        if (bytes(qrAssigned[_newComponentQrCode]).length > 0) revert ReplacementAllocated();

        // --- PRE-VALIDATION ENHANCEMENT LAYER ---
        // Query the factory floor registry directly to confirm the component is structurally ready for use
        (,, uint8 compStatus,,) = assemblyManager.components(_newComponentQrCode);
        if (compStatus != 0) revert NotEligibleForSwap(); // 0 = ComponentStatus.InInventory

        // 2. ATOMIC SUB-CONTRACT EXECUTION
        string memory extractedComponentQr = assemblyManager.assignComponentToSlot(activeBuildId, _componentType, _newComponentQrCode);
        
        // 3. LOGISTICS CLEANUP
        if (bytes(extractedComponentQr).length > 0) {
            delete qrAssigned[extractedComponentQr];
            assemblyManager.archiveLegacyParent(extractedComponentQr, activeBuildId);
        }
        
        qrAssigned[_newComponentQrCode] = activeBuildId;

        if (order.forwardTrackingHash != bytes32(0)) {
            delete trackingToPurchaseHash[order.forwardTrackingHash];
        }

        order.forwardTrackingHash = _newForwardTrackingHash;
        trackingToPurchaseHash[_newForwardTrackingHash] = activeHash;
        
        order.status = ShippingStatus.Pending; 
        assemblyManager.updateProductStatus(activeBuildId, 2); // 2 = Shipped
    }

    /**
     * @notice Authorizes a component return, binds tracking, and flags the part in the factory.
     */
    function _authorizeComponentReturn(
        bytes32 _purchaseHash,
        string memory _defectiveComponentQrCode,
        bytes32 _componentReturnTrackingHash
    ) internal {
        if (trackingToPurchaseHash[_componentReturnTrackingHash] != 0) revert TrackingActive();

        Order storage order = orders[_purchaseHash];
        
        // Converted Enum to raw uint8 (3 = InTransitReturn) for cross-contract compatibility
        assemblyManager.setComponentStatus(_defectiveComponentQrCode, 3);
        
        order.returnTrackingHash = _componentReturnTrackingHash;
        trackingToPurchaseHash[_componentReturnTrackingHash] = _purchaseHash;
        order.status = ShippingStatus.ReturnRequested;
    }

    function _dispatchReplacementComponent(
        bytes32 _purchaseHash,
        string memory _componentType,
        string memory _defectiveComponentQrCode,
        string memory _replacementComponentQrCode,
        bytes32 _newForwardTrackingHash
    ) internal {
        Order storage order = orders[_purchaseHash];
        
        string memory parentProduct = order.finalProductId;
        assemblyManager.archiveLegacyParent(_defectiveComponentQrCode, parentProduct);
        
        assemblyManager.assignComponentToSlot(parentProduct, _componentType, _replacementComponentQrCode);
        
        // --- CLEANUP TRACKING LEAK VULNERABILITY ---
        if (order.forwardTrackingHash != bytes32(0)) {
            delete trackingToPurchaseHash[order.forwardTrackingHash];
        }

        order.forwardTrackingHash = _newForwardTrackingHash;
        trackingToPurchaseHash[_newForwardTrackingHash] = _purchaseHash;
        order.status = ShippingStatus.Pending;
    }

    /**
     * @notice Evaluates a returned component at the facility and updates factory stock status.
     */
    function evaluateReturnedComponent(
        string calldata _componentQrCode, 
        bool _canBeRefurbished
    ) external {
        // Corrected access control for LogisticsManager scope
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        
        if (_canBeRefurbished) {
            // Converted Enum to raw uint8 (4 = Refurbishing)
            assemblyManager.setComponentStatus(_componentQrCode, 4);
        } else {
            // Converted Enum to raw uint8 (1 = Defective)
            assemblyManager.setComponentStatus(_componentQrCode, 1);
        }
    }
    
    // --- SCENARIO B: ISOLATING & SWAPPING A SINGLE COMPONENT ---
    /**
     * @notice Single entry-point that routes component logistics based on available lifecycle parameters.
     */
    function processComponentLogistics(
        bytes32 _purchaseHash,
        string calldata _componentType,
        string calldata _defectiveComponentQrCode,
        string calldata _replacementComponentQrCode,
        bytes32 _trackingHash,
        uint8 _evaluationAction // 0 = Skip, 1 = Scrap, 2 = Refurbish
    ) external {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        Order storage order = orders[_purchaseHash];
        if (order.buyer == address(0)) revert OrderDoesNotExist();

        // --- EVALUATION LAYER ---
        if (_evaluationAction > 0) {
            if (_evaluationAction == 2) {
                assemblyManager.setComponentStatus(_defectiveComponentQrCode, 4); // 4 = Refurbishing
            } else {
                assemblyManager.setComponentStatus(_defectiveComponentQrCode, 1); // 1 = Defective
            }
            return; 
        }

        // --- COMPONENT-SPECIFIC ELIGIBILITY GUARD ---
        // Allows swaps if the unit is out in the wild (Delivered) or already in a return/exception cycle
        if (
            order.status != ShippingStatus.Delivered && 
            order.status != ShippingStatus.Exception && 
            order.status != ShippingStatus.ReturnRequested &&
            order.status != ShippingStatus.ReturnInTransit &&
            order.status != ShippingStatus.ReturnReceived
        ) revert NotEligibleForSwap();

        // --- INITIAL RETURN AUTHORIZATION LAYER ---
        if (_trackingHash != bytes32(0) && bytes(_replacementComponentQrCode).length == 0) {
            // Transitions the component to InTransitReturn, updates return tracking, 
            // and sets order status to ReturnRequested to signal a sub-component loop is active
            _authorizeComponentReturn(_purchaseHash, _defectiveComponentQrCode, _trackingHash);
            return;
        }

        // --- FINAL DISPATCH & SWAP LAYER ---
        if (bytes(_replacementComponentQrCode).length > 0) {
            // Archives legacy part, overwrites the slot, updates forward tracking, 
            // and sets order status back to Pending so scripts track the new part delivery
            _dispatchReplacementComponent(_purchaseHash, _componentType, _defectiveComponentQrCode, _replacementComponentQrCode, _trackingHash);
            return;
        }
    }

    function _additionHelper(address[] memory addresses) internal {
        uint256 len = addresses.length;
        
        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];

            // Skip if ALREADY added to prevent array bloating
            if (!adminWhitelistMap[sc]) {
                adminIndex[sc] = admins.length; //error here
                admins.push(sc);
                adminWhitelistMap[sc] = true;
            }
            
            unchecked { i++; }
        }
    } 

    function _removalHelper(address[] memory addresses) internal {
        uint256 len = addresses.length;

        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];

            if (adminWhitelistMap[sc]) {
                uint256 index = adminIndex[sc];
                uint256 lastIndex = admins.length - 1;

                if (index != lastIndex) {
                    address lastAddr = admins[lastIndex];
                    admins[index] = lastAddr;
                    adminIndex[lastAddr] = index;
                }
                
                admins.pop();
                adminWhitelistMap[sc] = false;
                
                // Explicitly zero out the tracking map positions to prevent history pollution
                adminIndex[sc] = 0; 
            }

            unchecked { i++; }
        }
    }

    function addToAdminWhitelist(address[] memory adminToAdd) external onlyOwner {
       
        _additionHelper(adminToAdd);
    }

    function adminsIndex() external view onlyOwner returns(address[] memory admin) {
        
        return admins;
    }

    function removeFromAdminWhitelist(address[] memory adminToRemove) external onlyOwner {

        _removalHelper(adminToRemove);
    }

    // Fetches entire Order details safely for admins
    function getOrder(bytes32 orderHash) external view returns (Order memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return orders[orderHash];
    }

    // Check allocation safeguards
    function isPurchaseLinked(address user, uint256 index) external view returns (bool) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return purchaseLinked[user][index];
    }

    function getUserPurchaseBuild(address user, bytes32 purchaseHash) external view returns (string memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return userPurchaseBuilds[user][purchaseHash];
    }

    // Fetches structural Shipping Details
    function getShippingDetails(bytes32 trackingHash) external view returns (ShippingDetails memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return trackingToDestination[trackingHash];
    }

    // This satisfies UUPSUpgradeable so only the owner can upgrade the proxy implementation
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}