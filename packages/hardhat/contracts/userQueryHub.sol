// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./libraries/userQueryHubLib.sol";

contract UserQueryHub is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // Removed 'using UserQueryLib for address;'

    address public transferTracker;
    address public assetPurchase;
    address public smartVault;
    address public stableSwapGateway;

    function initialize(
        address _owner,
        address _transferTracker,
        address _assetPurchase,
        address _smartVault,
        address _stableSwapGateway
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        transferTracker = _transferTracker;
        assetPurchase = _assetPurchase;
        smartVault = _smartVault;
        stableSwapGateway = _stableSwapGateway;
    }

    // Helper internal functions for calls
    function _callAddress(address target, string memory sig, bytes memory params) internal view returns (bytes memory) {
        bytes memory data = abi.encodeWithSignature(sig, params);
        (bool success, bytes memory returnData) = target.staticcall(data);
        require(success, "Call failed");
        return returnData;
    }

    // Modular query wrappers with plain address calls
    function getUserTransfers(address user) external view returns (UserQueryLib.Transfer[] memory) {
        bytes memory returnData = _callAddress(transferTracker, "getTransfers(address)", abi.encode(user));
        return abi.decode(returnData, (UserQueryLib.Transfer[]));
    }

    function getUserPurchases(address user) external view returns (UserQueryLib.Purchase[] memory) {
        bytes memory returnData = _callAddress(assetPurchase, "getPurchases(address)", abi.encode(user));
        return abi.decode(returnData, (UserQueryLib.Purchase[]));
    }

    function getUserRedemptions(address user) external view returns (UserQueryLib.Redemption[] memory) {
        bytes memory returnData = _callAddress(smartVault, "getVaultInfo(address)", abi.encode(user));
        (
            ,
            ,
            ,
            ,
            UserQueryLib.Redemption[] memory redemptions
        ) = abi.decode(returnData, (uint256, uint256, uint256, uint256, UserQueryLib.Redemption[]));
        return redemptions;
    }

    function getUserVaultStatus(address user) external view returns (
        uint256 depositAmount,
        uint256 depositStartTime,
        uint256 elapsedDays,
        uint256 remainingDays,
        bool isPending,
        bool isClosed
    ) {
        bytes memory returnData = _callAddress(smartVault, "getDepositStatus(address)", abi.encode(user));
        return abi.decode(returnData, (uint256, uint256, uint256, uint256, bool, bool));
    }

    function getUserMultiplier(address user) external view returns (uint256) {
        bytes memory returnData = _callAddress(smartVault, "getMultiplier(address)", abi.encode(user));
        return abi.decode(returnData, (uint256));
    }


    function getUserSwaps(address user) external view returns (UserQueryLib.SwapRecord[] memory) {
        bytes memory returnData = _callAddress(stableSwapGateway, "getSwaps(address)", abi.encode(user));
        return abi.decode(returnData, (UserQueryLib.SwapRecord[]));
    }

    function getUserSwapsByStatus(address user, UserQueryLib.SwapStatus status) external view returns (UserQueryLib.SwapRecord[] memory) {
        bytes memory returnData = _callAddress(stableSwapGateway, "getSwapsByStatus(address,uint8)", abi.encode(user, uint8(status)));
        return abi.decode(returnData, (UserQueryLib.SwapRecord[]));
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}