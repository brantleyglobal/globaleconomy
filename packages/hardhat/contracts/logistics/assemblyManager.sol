// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract AssemblyManager is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {

    address public logisticsManager;

    enum ComponentStatus { InInventory, Defective, Consumed, InTransitReturn, Refurbishing }
    enum ProductStatus { Assembling, Defective, Completed, Shipped }
    
    struct ComponentType {
        string name;       // e.g., "E_CHAMBER_COVER_L"
        bool isRegistered; // Lets you instantly add or deprecate parts
    }

    struct Component {
        string qrCode;
        bytes32 componentType;
        ComponentStatus status;
        string defectNotes; // Kept empty unless signaled defective
        string finalProductId; // Links to the parent product once consumed
    }

    struct ModelConfig {
        string modelName;
        bytes32[] requiredComponents; 
    }

    struct FinalProduct {
        string qrCode;
        ProductStatus status;
        string[] componentQrCodes; 
        uint256 componentCount;
        uint256 expectedCount;
        uint256 modelId;
        uint256 timestamp;
    }

    error NotAuthorized();
    error InvalidAddress();
    error InvalidModelNumber();
    error InvalidModel();
    error ModelExists();
    error ProductNotAssembled();
    error ProductBeingAssembled();
    error DamagedOrAssignedItem();
    error ProductNeverShipped();
    error AlreadyMarkedDefective();
    error ComponentNotInSpecifiedParent();
    error MismatchedComponentCount(uint256 current, uint256 expected);
    error ComponentNotAllowedForModel();
    error ComponentTypeExists();
    error ComponentTypeNotFound();
    error InvalidComponentStatusTransition();

    uint256 private totalBuildsRegistered;

    address[] private admins;
    bytes32[] private componentTypeList;

    // Storage
    // Changed to internal to drop the compiler's auto-generated getter bloat
    mapping(string => Component) internal components;
    mapping(uint256 => ModelConfig) internal models;
    mapping(string => FinalProduct) internal finalProducts;
    
    // Mappings that return string arrays generate massive bytecode getters. Keep internal!
    mapping(string => string[]) internal productComponentHistory;
    mapping(string => string[]) internal componentBuildHistory;
    
    // Nested mappings are also a major source of bytecode size inflation
    mapping(string => mapping(string => string)) internal activeProductSlots;
    mapping(bytes32 => ComponentType) internal registeredComponentTypes;

    mapping(string => string) internal componentLegacyParent;
    
    // Explicitly group your private whitelists and indices together
    mapping(uint256 => bool) private modelWhitelistMap;
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => uint256) private adminIndex;

    event logisticsManagerUpdated(address indexed newlogisticsManager);
    event ComponentReceived(string indexed qrCode, string componentType);
    event ModelRegistered(uint256 indexed modelId, string modelName);
    event ComponentDefective(string indexed qrCode, string reason);
    event ProductPreAllocated(string indexed productQrCode);
    event ComponentLinked(string indexed productQrCode, string indexed componentQrCode);
    event AssemblyCompleted(string indexed productQrCode);
    event ProductStatusUpdated(string indexed productQrCode, ProductStatus indexed status);
    event ComponentTypeAdded(bytes32 indexed typeId, string name);
    event ComponentTypeRemoved(bytes32 indexed typeId);

    function initialize(address _owner) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _transferOwnership(_owner);
        
    }

    /**
     * @notice Authorizes upgrades for the UUPS proxy pattern. Restricted to owner.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function _isRegistered(uint256 modelId) internal view returns (bool) {
        return modelWhitelistMap[modelId];
    }

    /**
     * @notice Explicitly sets the standalone ProductLogistics contract address allowed to alter statuses.
     */
    function setlogisticsManager(address _logisticsManager) external {
        if (_logisticsManager == address(0)) revert InvalidAddress();
        logisticsManager = _logisticsManager;
        emit logisticsManagerUpdated(_logisticsManager);
    }

    /**
     * @notice Registers a new unit model structure (The Recipe)
     * @param _modelId Unique identifier you assign to this model (e.g., 1)
     * @param _modelName Human readable name (e.g., "Model Alpha")
     * @param _components The exact sequence of components required
     */
    function registerModel(
        uint256 _modelId, 
        string calldata _modelName, 
        bytes32[] calldata _components
    ) external {
        if (_isRegistered(_modelId)) revert ModelExists();
        if (_components.length == 0) revert InvalidModel();

        // 1. Point to the storage slot
        ModelConfig storage newModel = models[_modelId];
        
        // 2. Assign the string name
        newModel.modelName = _modelName;
        
        // 3. Solidity handles copying the calldata array straight into storage
        newModel.requiredComponents = _components;

        modelWhitelistMap[_modelId] = true;

        emit ModelRegistered(_modelId, _modelName);
    }

    // --- COMPONENT LOGISTICS & QC ---
    
    function receiveComponent(string memory _qrCode, bytes32 _type) public {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();

        if (components[_qrCode].componentType != bytes32(0)) {
            // Revert if it's already assigned, defective, or in refurbishment 
            if (components[_qrCode].status != ComponentStatus.InTransitReturn) { 
                revert DamagedOrAssignedItem(); 
            }
        }
        components[_qrCode] = Component(_qrCode, _type, ComponentStatus.InInventory, "", "");
    }

    /**
     * @notice External cross-contract status management injection setter.
     */
    function setComponentStatus(string calldata _qrCode, uint8 _newStatus) external {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        components[_qrCode].status = ComponentStatus(_newStatus);
    }

    /**
     * @notice Keeps a permanent historical trace of a component's old parent box environment.
     */
    function archiveLegacyParent(string calldata _componentQrCode, string calldata _parentProductQrCode) external {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        componentLegacyParent[_componentQrCode] = _parentProductQrCode;
    }

    /**
     * @notice Overwrites a specific active assembly slot with a fresh replacement part string.
     * @dev Automatically extracts the old component from the tracking array and maintains count integrity.
     */
    function assignComponentToSlot(
        string calldata _productQrCode, 
        string calldata _componentType, 
        string calldata _replacementComponentQrCode
    ) external returns (string memory oldComponentQr){
        if (!_isAdmin(msg.sender)) revert NotAuthorized();

        bytes32 targetTypeBytes = keccak256(abi.encodePacked(_componentType));
        if (components[_replacementComponentQrCode].componentType != targetTypeBytes) revert ComponentNotAllowedForModel();
        
        // Ensure replacement component is available inventory
        if (components[_replacementComponentQrCode].status != ComponentStatus.InInventory) revert DamagedOrAssignedItem();

        // --- AUTOMATED EXTRACTION LAYER ---
        // Find the component currently occupying this slot
        oldComponentQr = activeProductSlots[_productQrCode][_componentType];
        
        if (bytes(oldComponentQr).length > 0) {
            _extractDefectiveComponent(_productQrCode, oldComponentQr, "Replaced via slot rewrite swap");
        }

        // --- INJECTION LAYER ---
        _injectReplacementComponent(_productQrCode, _replacementComponentQrCode);

        // Overwrite the slot registry tracking map
        activeProductSlots[_productQrCode][_componentType] = _replacementComponentQrCode;
    }

    // Mechanism to signal defects/damage
    // --- COMPONENT LEVEL REVERSE LOGISTICS & REPLACEMENT ---

    /**
     * @notice Safely extracts a broken component out of an active parent product array.
     * @dev Removes the element from the array and marks it defective. Called by LogisticsManager.
     * @param _productQrCode The parent box identifier.
     * @param _defectiveComponentQrCode The broken internal sub-part to extract.
     * @param _reason The engineering or transit failure notes.
     */
    function _extractDefectiveComponent(
        string memory _productQrCode,
        string memory _defectiveComponentQrCode,
        string memory _reason
    ) internal {
        if (components[_defectiveComponentQrCode].status == ComponentStatus.Defective) revert AlreadyMarkedDefective();

        // 1. Mark the extracted part as Defective
        components[_defectiveComponentQrCode].status = ComponentStatus.Defective;
        components[_defectiveComponentQrCode].defectNotes = _reason;

        // 2. Locate and remove the component string from the parent array tracking index
        string[] storage activeParts = finalProducts[_productQrCode].componentQrCodes;
        uint256 totalParts = activeParts.length;
        bool found = false;

        for (uint256 i = 0; i < totalParts; i++) {
            if (keccak256(bytes(activeParts[i])) == keccak256(bytes(_defectiveComponentQrCode))) {
                // Delete by shifting the last element to this slot, then popped
                activeParts[i] = activeParts[totalParts - 1];
                activeParts.pop();
                
                // Decrement the explicit tracker counter metric
                finalProducts[_productQrCode].componentCount--;
                found = true;
                break;
            }
        }
        if (!found) revert ComponentNotInSpecifiedParent();
        emit ComponentDefective(_defectiveComponentQrCode, _reason);
    }

    /**
     * @notice Links a fresh replacement component into an existing assembly/returned record.
     * @param _productQrCode The parent box container identifier.
     * @param _replacementComponentQrCode The brand new sub-part being injected.
     */
    function _injectReplacementComponent(
        string memory _productQrCode, 
        string memory _replacementComponentQrCode
    ) internal {
        if (components[_replacementComponentQrCode].status != ComponentStatus.InInventory) revert DamagedOrAssignedItem();

        // Consume the replacement item
        components[_replacementComponentQrCode].status = ComponentStatus.Consumed;
        components[_replacementComponentQrCode].finalProductId = _productQrCode;
        componentBuildHistory[_replacementComponentQrCode].push(_productQrCode);
        
        // Feed it back directly into the parent product structure logs
        finalProducts[_productQrCode].componentQrCodes.push(_replacementComponentQrCode);
        productComponentHistory[_productQrCode].push(_replacementComponentQrCode);
        finalProducts[_productQrCode].componentCount++;

        emit ComponentLinked(_productQrCode, _replacementComponentQrCode);
    }

    // --- PRE-ALLOCATION & ASSEMBLY ---

    // Tag the unit ahead of time
    /**
     * @notice Formats the master asset string internally using hidden counters and returns the string.
     */
    function preAllocateFinalUnit(uint256 _modelId, uint256 _ts) 
        external 
        returns (string memory assignedBuildId) 
    {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        if (!_isRegistered(_modelId)) revert InvalidModelNumber();

        uint256 currentBuildNum = totalBuildsRegistered;
        totalBuildsRegistered++;

        assignedBuildId = string(abi.encodePacked("BLD-", _toString(_modelId), "-", _toString(currentBuildNum)));

        uint256 requiredCeiling = models[_modelId].requiredComponents.length;
        string[] memory emptyList;

        finalProducts[assignedBuildId] = FinalProduct({
            qrCode: assignedBuildId,
            status: ProductStatus.Assembling,
            componentQrCodes: emptyList,
            componentCount: 0,
            expectedCount: requiredCeiling,
            modelId: _modelId,
            timestamp: _ts
        });

        emit ProductPreAllocated(assignedBuildId);
    }

    /**
     * @notice Helper to convert uint values to strings inside contract execution.
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) { return "0"; }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // Link a component to the final unit during assembly
    function linkComponentToProduct(string memory _productQrCode, string memory _componentQrCode, uint256 modelId) public {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        
        FinalProduct storage product = finalProducts[_productQrCode];
        if (product.status != ProductStatus.Assembling) revert ProductBeingAssembled();
        
        if (product.componentCount >= product.expectedCount) revert MismatchedComponentCount(product.componentCount + 1, product.expectedCount);
        if (product.modelId != modelId) revert InvalidModelNumber();
        if (!_isRegistered(modelId)) revert InvalidModelNumber();

        bytes32 inputType = components[_componentQrCode].componentType;
        bytes32[] memory allowedTypes = models[modelId].requiredComponents;
        
        bool isAllowed = false;
        uint256 allowedLen = allowedTypes.length;
        
        // Find the index or slot name to record context
        for (uint256 i = 0; i < allowedLen;) {
            if (allowedTypes[i] == inputType) {
                isAllowed = true;
                break;
            }
            unchecked { i++; }
        }

        if (!isAllowed) revert ComponentNotAllowedForModel();

        // --- ADDED FOR SLOT CONFIGURATION ALIGNMENT ---
        // Dynamically reverse resolve structural slot type string representation using component type name data
        string memory typeName = registeredComponentTypes[inputType].name;
        activeProductSlots[_productQrCode][typeName] = _componentQrCode;

        _injectReplacementComponent(_productQrCode, _componentQrCode);
    }

    // --- FINALIZATION ---
    
    function completeAssembly(string memory _productQrCode) public {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        FinalProduct storage product = finalProducts[_productQrCode];
        if (product.status != ProductStatus.Assembling) revert ProductNotAssembled();
        
        // Fix: Read the static recipe requirement ceiling saved during pre-allocation
        uint256 requiredCeiling = product.expectedCount; 
        
        // Count how many items were actually pushed into the array during assembly
        uint256 actualPushedCount = product.componentQrCodes.length;
        
        // Double-check both metrics against the fixed ceiling requirement
        if (actualPushedCount != requiredCeiling || product.componentCount != requiredCeiling) {
            revert MismatchedComponentCount(product.componentCount, requiredCeiling);
        }

        product.status = ProductStatus.Completed;
    }

    function updateProductStatus(string memory _productQrCode, uint8 _newStatus) public {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        finalProducts[_productQrCode].status = ProductStatus(_newStatus);
    }

    /**
     * @notice Explicitly fetch the component recipe array for a model
     * @param _modelId The model to look up
     * @return name The model name
     * @return componentRecipe The array of enumerated component requirements
     */
    function getModelRecipe(uint256 _modelId) 
        external 
        view 
        returns (string memory name, bytes32[] memory componentRecipe) 
    {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        if (!_isRegistered(_modelId)) revert InvalidModelNumber();
        ModelConfig storage config = models[_modelId];
        return (config.modelName, config.requiredComponents);
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

    /**
     * @notice Dynamically add a brand new component to your factory blueprint catalog
     * @param _name The exact text key (e.g., "HYDROGEN_VALVE_V2")
     */
    function addComponentType(string calldata _name) external onlyOwner {
        bytes32 typeId = keccak256(abi.encodePacked(_name));
        if (registeredComponentTypes[typeId].isRegistered) revert ComponentTypeExists();
        
        registeredComponentTypes[typeId] = ComponentType({
            name: _name,
            isRegistered: true
        });
        
        componentTypeList.push(typeId);
        
        emit ComponentTypeAdded(typeId, _name);
    }

    /**
     * @notice Dynamically deprecate an old component type so it can no longer be used
     */
    function removeComponentType(bytes32 _typeId) external onlyOwner {
        if (!registeredComponentTypes[_typeId].isRegistered) revert ComponentTypeNotFound();
        
        // Instead of messing with array deletions which is gas-heavy, 
        // simply turn off the valid usage flag instantly.
        registeredComponentTypes[_typeId].isRegistered = false;
        
        emit ComponentTypeRemoved(_typeId);
    }

    /**
     * @notice Processes a refurbished component with flexible routing options.
     */
    function processRefurbishedComponentExtended(
        string calldata _componentQrCode, 
        bool _returnToLegacy
    ) external {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        
        ComponentStatus currentStatus = components[_componentQrCode].status;
        if (currentStatus != ComponentStatus.Defective && currentStatus != ComponentStatus.InTransitReturn) {
            revert InvalidComponentStatusTransition();
        }

        string memory oldParent = components[_componentQrCode].finalProductId;
        components[_componentQrCode].status = ComponentStatus.InInventory;

        if (_returnToLegacy) {
            components[_componentQrCode].defectNotes = "Refurbished: Locked to Legacy Build Assignment";
        } else {
            // --- ADDED FOR PARENT CONFIGURATION INTEGRITY ---
            if (bytes(oldParent).length > 0) {
                bytes32 inputType = components[_componentQrCode].componentType;
                string memory typeName = registeredComponentTypes[inputType].name;
                
                // Clear the slot registry assignment reference completely
                if (keccak256(bytes(activeProductSlots[oldParent][typeName])) == keccak256(bytes(_componentQrCode))) {
                    delete activeProductSlots[oldParent][typeName];
                }
            }

            components[_componentQrCode].finalProductId = ""; 
            components[_componentQrCode].defectNotes = "Refurbished: Released to General Inventory Pool";
        }
    }

    function getComponent(string calldata qrCode) external view returns (Component memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return components[qrCode];
    }

    function getModelConfig(uint256 modelId) external view returns (ModelConfig memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return models[modelId];
    }

    function getFinalProduct(string calldata productQr) external view returns (FinalProduct memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return finalProducts[productQr];
    }

    // Efficiently read the dynamic history arrays
    function getProductComponentHistory(string calldata productQr) external view returns (string[] memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return productComponentHistory[productQr];
    }

    function getComponentBuildHistory(string calldata componentQr) external view returns (string[] memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return componentBuildHistory[componentQr];
    }

    // Read manufacturing layout active slots
    function getActiveProductSlot(string calldata parentProductQr, string calldata componentType) external view returns (string memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return activeProductSlots[parentProductQr][componentType];
    }
}