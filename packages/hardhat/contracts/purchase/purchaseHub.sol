// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

struct ShippingDetails {
    string street;
    string city;
    string state;
    string zip;
    string country;
}

enum ReturnProcess { 
    None, 
    RefundPending, 
    RepairPending, 
    RefundComplete,
    RepairComplete
}

struct Purchase {
    address user;
    address token;
    address purchaseSetter;
    address refundSetter;
    uint256 region;
    uint256 purchaseIndex;
    uint256 quantity;
    uint256 id;
    uint256 timestamp;
    uint256 amount;
    uint256 shipping;
    uint256 customizations;
    uint256 rate;
    ReturnProcess status; // Make sure ReturnProcess enum is also accessible here
    bytes32 purchaseTxHash;
    bytes32 refundHash;
    bytes32 configs;
}

interface IAssetPurchase {
    // Mirrors your existing purchase function signature (update to match your exact naming)
    function purchase(
        address buyer,
        address stable,
        uint256 productId,
        uint256 amount,
        uint256 shipping,
        uint256 customizations,
        bytes32 configs,
        uint256 quantity,
        uint256 rate,
        address affiliate,
        uint256 commission,
        uint256 region,
        bytes32 depositHash,
        uint256 purchaseTimeStamp
    ) external payable;
    
    // Allows us to check the user's array length to find their exact index/term count
    function getUserTermCount(address user) external view returns (uint256);

    function refundsByUserIndex(address user, uint256 index) external view returns (address userAddress, uint256 purchaseIndex, uint256 adjustedAmount);
    
    function getPurchaseReference(bytes32 purchaseHash) external view returns (address user, uint256 purchaseIndex);

    function getUserTerm(address user, uint256 index) external view returns (Purchase memory);

    function processReturn(bytes32 purchaseHash, bool isRepair) external;
}

enum ShippingStatus { 
    Pending, InTransit, OutForDelivery, Delivered, AwaitingAssembly,
    Exception, ReturnedToSender, ReturnRequested, 
    ReturnInTransit, ReturnReceived, Refunded, ReturnDisputed 
}

interface ILogisticsManager {
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
    ) external returns (string memory);

    function processReturn(
        bytes32 _purchaseHash,
        ShippingStatus _carrierStatus,
        bool _isRepair
    ) external;

    function setShippingDetails(
        bytes32 _trackingNumber,
        ShippingDetails calldata _details
    ) external;
}

contract PurchaseHub is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable{
    
    IAssetPurchase public assetPurchase;
    ILogisticsManager public logisticsManager;

    address[] private admins;

    error NotAuthorized();
    error TrackingNumberRequired();

    mapping(address => bool) private adminWhitelistMap;
    mapping(address => uint256) private adminIndex;

    event SettleRefundPayout(bytes32 indexed purchaseHash, address indexed buyer, address token, uint256 payoutAmount);

    function initialize(
        address _owner,
        address _assetPurchase,
        address _productLogistics
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _transferOwnership(_owner);
        assetPurchase = IAssetPurchase(_assetPurchase);
        logisticsManager = ILogisticsManager(_productLogistics);
    }

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    /**
     * @notice The Atomic Bridge: Routes payment to your deployed contract and links tracking instantly.
     * @param buyer Buyer
     * @param stable Deposit Currency
     * @param productId The model ID being bought.
     * @param amount Raw Payment Amount
     * @param shipping Shipping Amount
     * @param customizations Custmizations
     * @param configs Configuration Selections
     * @param quantity Quantity
     * @param rate Exchange Rate
     * @param affiliate Assigned Affiliate
     * @param commission Comiision Amount
     * @param region Ship to Region
     * @param depositHash Deposit Hash
     * @param purchaseTimeStamp Time Stamp
     */
    function purchase(
        address buyer,
        address stable,
        uint256 productId,
        uint256 amount,
        uint256 shipping,
        uint256 customizations,
        bytes32 configs,
        uint256 quantity,
        uint256 rate,
        address affiliate,
        uint256 commission,
        uint256 region,
        bytes32 depositHash,
        uint256 purchaseTimeStamp
    ) external payable {

        // Forward the payment directly to your ALREADY DEPLOYED purchase contract
        assetPurchase.purchase{value: msg.value} (
            buyer,
            stable,
            productId,
            amount,
            shipping,
            customizations,
            configs,
            quantity,
            rate,
            affiliate,
            commission,
            region,
            depositHash,
            purchaseTimeStamp
        );
    }

    /**
     * @notice Passes the tracking identifier and the bundled destination data to Logistics.
     * @param _trackingNumber The key linking this data to the physical shipment.
     * @param _details The struct payload containing street, city, state, zip, and country.
     */
    function setShippingDetails(
        bytes32 _trackingNumber,
        ShippingDetails calldata _details
    ) external {
        // 1. Enforce admin access control at the gateway level
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        if (_trackingNumber == bytes32(0)) revert TrackingNumberRequired();

        // 2. Forward the exact struct memory layout directly to your logistics contract
        logisticsManager.setShippingDetails(
            _trackingNumber,
            _details
        );
    }

    function initiateShipment(
        address buyer,
        uint256 productId,
        uint256 amount,
        bytes32 depositHash,
        bytes32 trackingNumber,
        uint256 purchaseTimeStamp,
        bool _Bto,
        string calldata _existingBuildId
    ) external payable {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        if (trackingNumber == bytes32(0)) revert TrackingNumberRequired();

        uint256 nextPurchaseIndex = assetPurchase.getUserTermCount(buyer);

        logisticsManager.initiateShipment(
            buyer, 
            nextPurchaseIndex, 
            depositHash, 
            productId,
            _Bto,
            _existingBuildId,
            amount,
            trackingNumber,
            purchaseTimeStamp
        );
    }

    /**
     * @notice Centralized gateway endpoint to process a return using only the core tracking hash.
     */
    function processReturn(
        bytes32 _purchaseHash,
        ShippingStatus _carrierStatus,
        bool isRepair 
    ) external {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();

        if (isRepair) {
            // Track A: Hardware Repair
            logisticsManager.processReturn(_purchaseHash, _carrierStatus, true);
            assetPurchase.processReturn(_purchaseHash, true);
        } else {
            // Track B: Pure Inventory Refund
            if (_carrierStatus != ShippingStatus.ReturnReceived) revert ("Return receipt not confirmed");

            // 1. Alert logistics to clear mappings and re-pool inventory slots
            logisticsManager.processReturn(_purchaseHash, _carrierStatus, false);

            // 2. Fetch the user reference and storage index via the newly linked hash record
            (address buyer, uint256 purchaseIndex) = assetPurchase.getPurchaseReference(_purchaseHash);

            // 3. Execute the time-window depreciation math in AssetPurchase
            assetPurchase.processReturn(_purchaseHash, false); 

            // 4. Directly pull the updated payout amount out of the return ledger mapping
            (,, uint256 accuratePayoutAmount) = assetPurchase.refundsByUserIndex(buyer, purchaseIndex);
            Purchase memory userPurchase = assetPurchase.getUserTerm(buyer, purchaseIndex);
            address token = userPurchase.token;

            // 5. Emit the clean log signal right here from the Hub gateway
            emit SettleRefundPayout(_purchaseHash, buyer, token, accuratePayoutAmount);
        }
    }

    function _additionHelper(address[] memory addresses) internal {
        uint256 len = addresses.length;
        
        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];
            
            adminIndex[sc] = admins.length;
            admins.push(sc);
            adminWhitelistMap[sc] = true;
            
            unchecked { i++; }
        }
    } 

    function _removalHelper(address[] memory addresses) internal {
        uint256 len = addresses.length;

        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];

            uint256 index = adminIndex[sc];
            uint256 lastIndex = admins.length - 1;

            if (index != lastIndex) {
                address lastAddr = admins[lastIndex];
                admins[index] = lastAddr;
                adminIndex[lastAddr] = index;
            }
            admins.pop();
            adminWhitelistMap[sc] = false;
            delete adminIndex[sc];

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

    function _authorizeUpgrade(address) internal override onlyOwner {}
}