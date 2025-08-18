// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "./libraries/assetPurchaseLib.sol";

contract AssetPurchase is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using AssetPurchaseLib for AssetPurchaseLib.Data;

    AssetPurchaseLib.Data private data;
    uint256 public feeBasisPoints;


    function initialize(address _owner, uint256 _initialFeeBps) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        _transferOwnership(_owner);
        feeBasisPoints = _initialFeeBps;
    }

    // --- Asset Setup ---
    function setAsset(
        string calldata name,
        uint128 priceInGBDO,
        string calldata cid,
        uint32 baseDays,
        uint32 delayPerUnit
    ) external onlyOwner {
        data.addAsset(name, priceInGBDO, cid, baseDays, delayPerUnit);
    }

    function setFeeBasisPoints(uint256 newBps) external onlyOwner {
        require(newBps <= 5000, "Fee too high");
        feeBasisPoints = newBps;
    }

    // --- Purchase Entry ---
    function purchase(
        uint64 assetId,
        uint32 quantity,
        address token,
        uint256 rate,
        address feeRecipient
    ) external returns (uint256 id) {
        id = data.purchase(
            msg.sender,
            token,
            assetId,
            quantity,
            rate,
            feeRecipient,
            feeBasisPoints
        );
    }

    // --- Delivery Management ---
    function uploadProgress(uint256 id, string calldata cid) external onlyOwner {
        data.uploadProgress(id, cid);
    }

    function uploadCompletion(uint256 id, string calldata cid) external onlyOwner {
        data.uploadCompletion(id, cid);
    }

    // --- Escrow & Refunds ---
    function releaseEscrow(uint256 id) external onlyOwner {
        data.releaseEscrow(id, owner());
    }

    function refund(uint256 id) external {
        data.autoRefund(id);
    }

    function cancelPurchase(uint256 id, uint256 graceDays) external {
        data.cancelPurchase(id, graceDays);
    }

    // --- Extensions ---
    function proposeExtension(uint256 id, uint256 extraDays) external {
        data.proposeExtension(id, extraDays);
    }

    function approveExtension(uint256 id) external {
        data.approveExtension(id);
    }

    // --- Admin Withdrawals ---
    function withdrawTokens(
        address token,
        uint128 amount,
        uint256 lockedEscrow,
        uint256 withinGracePeriod
    ) external onlyOwner {
        data.withdrawTokens(token, owner(), amount, lockedEscrow, withinGracePeriod);
    }

    // --- Read-only Views ---
    function getUserPurchases(address user)
        external
        view
        returns (AssetPurchaseLib.Purchase[] memory)
    {
        return data.getUserPurchases(user);
    }

    function getPurchase(uint256 id)
        external
        view
        returns (AssetPurchaseLib.Purchase memory)
    {
        return data.purchases[id];
    }

    // --- Upgrade Logic ---
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
