// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

library AssetPurchaseLib {
    // --- Status Constants ---
    uint8 constant STATUS_PENDING = 0;
    uint8 constant STATUS_IN_PROGRESS = 1;
    uint8 constant STATUS_COMPLETED = 2;
    uint8 constant STATUS_CANCELLED = 3;

    // --- Data Types ---
    struct Purchase {
        address buyer;
        address tokenUsed;
        uint64 assetId;
        uint32 quantity;
        uint128 depositAmount;
        uint128 escrowAmount;
        uint64 purchaseTime;
        uint64 deliveryDeadline;
        string progressCID;
        string completionCID;
        uint8 status;
        uint64 proposedExtension;
        bool extensionPending;
    }

    struct Asset {
        string name;
        string metadataCID;
        uint128 priceInGBDO;
        uint32 baseDays;
        uint32 perUnitDelay;
        bool active;
    }

    struct Data {
        mapping(uint256 => Asset) assets;
        mapping(uint256 => Purchase) purchases;
        uint256 nextAssetId;
        uint256 nextPurchaseId;
    }

    // --- Events ---
    event AssetAdded(uint256 id, string name);
    event Purchased(uint256 indexed id, address indexed buyer, uint64 assetId);
    event ProgressUploaded(uint256 id, string cid);
    event CompletionUploaded(uint256 id, string cid);
    event EscrowReleased(uint256 id);
    event Refunded(uint256 id);
    event ExtensionProposed(uint256 id, uint256 extraDays);
    event ExtensionApproved(uint256 id, uint256 newDeadline);

    // --- Asset Management ---
    function addAsset(
        Data storage self,
        string calldata name,
        uint128 usdPrice,
        string calldata cid,
        uint32 baseDays,
        uint32 perUnitDelay
    ) internal {
        uint256 id = self.nextAssetId++;
        self.assets[id] = Asset(name, cid, usdPrice, baseDays, perUnitDelay, true);
        emit AssetAdded(id, name);
    }

    // --- Purchase Entry Point ---
    function purchase(
        Data storage self,
        address buyer,
        address token,
        uint64 assetId,
        uint32 quantity,
        uint256 rate,
        address feeRecipient,
        uint256 feeBps
    ) internal returns (uint256 id) {
        Asset memory asset = self.assets[assetId];
        (uint128 deposit, uint128 escrow, uint64 deadline) = _preparePurchase(
            token,
            buyer,
            quantity,
            rate,
            feeBps,
            feeRecipient,
            asset
        );
        id = _finalizePurchase(self, buyer, token, assetId, quantity, deposit, escrow, deadline);
    }

    // --- Internal Helpers ---
    function _preparePurchase(
        address token,
        address buyer,
        uint32 quantity,
        uint256 rate,
        uint256 feeBps,
        address feeRecipient,
        Asset memory asset
    ) internal returns (uint128 deposit, uint128 escrow, uint64 deadline) {
        require(asset.active, "Asset inactive");
        require(quantity > 0, "Invalid quantity");
        require(rate > 0, "Missing rate");

        uint256 totalGBDO = asset.priceInGBDO * quantity;
        uint256 totalToken = (totalGBDO * 1e18) / rate;
        deposit = uint128(totalToken / 2);
        escrow = uint128(totalToken - deposit);

        uint256 fee = (totalToken * feeBps) / 1e6;
        ERC20Upgradeable(token).transferFrom(buyer, address(this), totalToken - fee);
        if (fee > 0) ERC20Upgradeable(token).transferFrom(buyer, feeRecipient, fee);

        uint256 delay = asset.baseDays + asset.perUnitDelay * (quantity - 1);
        deadline = uint64(block.timestamp + (delay * 1 days));
    }

    function _finalizePurchase(
        Data storage self,
        address buyer,
        address token,
        uint64 assetId,
        uint32 quantity,
        uint128 deposit,
        uint128 escrow,
        uint64 deadline
    ) internal returns (uint256 id) {
        id = self.nextPurchaseId++;
        self.purchases[id] = Purchase(
            buyer,
            token,
            assetId,
            quantity,
            deposit,
            escrow,
            uint64(block.timestamp),
            deadline,
            "",
            "",
            STATUS_IN_PROGRESS,
            0,
            false
        );
        emit Purchased(id, buyer, assetId);
    }

    // --- Delivery & Completion ---
    function uploadProgress(Data storage self, uint256 id, string calldata cid) internal {
        Purchase storage p = self.purchases[id];
        require(p.status == STATUS_IN_PROGRESS, "Invalid status");
        p.progressCID = cid;
        emit ProgressUploaded(id, cid);
    }

    function uploadCompletion(Data storage self, uint256 id, string calldata cid) internal {
        Purchase storage p = self.purchases[id];
        require(p.status == STATUS_IN_PROGRESS, "Invalid status");
        p.completionCID = cid;
        emit CompletionUploaded(id, cid);
    }

    function releaseEscrow(Data storage self, uint256 id, address recipient) internal {
        Purchase storage p = self.purchases[id];
        require(p.status == STATUS_IN_PROGRESS, "Invalid status");
        require(bytes(p.progressCID).length > 0, "No progress");
        p.status = STATUS_COMPLETED;
        ERC20Upgradeable(p.tokenUsed).transfer(recipient, p.escrowAmount);
        emit EscrowReleased(id);
    }

    function autoRefund(Data storage self, uint256 id) internal {
        Purchase storage p = self.purchases[id];
        require(p.status == STATUS_IN_PROGRESS, "Invalid status");
        require(block.timestamp > p.deliveryDeadline, "Too early");
        require(bytes(p.completionCID).length == 0, "Already fulfilled");
        p.status = STATUS_CANCELLED;
        ERC20Upgradeable(p.tokenUsed).transfer(p.buyer, p.escrowAmount);
        emit Refunded(id);
    }

    function cancelPurchase(Data storage self, uint256 id, uint256 graceDays) internal {
        Purchase storage p = self.purchases[id];
        require(msg.sender == p.buyer, "Not buyer");
        require(p.status == STATUS_IN_PROGRESS, "Invalid status");
        require(block.timestamp < p.purchaseTime + graceDays * 1 days, "Grace expired");
        p.status = STATUS_CANCELLED;
        ERC20Upgradeable(p.tokenUsed).transfer(p.buyer, p.depositAmount + p.escrowAmount);
        emit Refunded(id);
    }

    // --- Extension Logic ---
    function proposeExtension(Data storage self, uint256 id, uint256 extraDays) internal {
        Purchase storage p = self.purchases[id];
        require(p.status == STATUS_IN_PROGRESS, "Invalid status");
        require(!p.extensionPending, "Already pending");
        p.proposedExtension = uint64(extraDays);
        p.extensionPending = true;
        emit ExtensionProposed(id, extraDays);
    }

    function approveExtension(Data storage self, uint256 id) internal {
        Purchase storage p = self.purchases[id];
        require(msg.sender == p.buyer, "Not buyer");
        require(p.extensionPending, "No proposal");
        p.deliveryDeadline += p.proposedExtension * 1 days;
        p.proposedExtension = 0;
        p.extensionPending = false;
        emit ExtensionApproved(id, p.deliveryDeadline);
    }

    // --- Read-Only Queries ---
    function getUserPurchases(Data storage self, address user)
        internal
        view
        returns (Purchase[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < self.nextPurchaseId; ++i) {
            if (self.purchases[i].buyer == user) count++;
        }

        Purchase[] memory result = new Purchase[](count);
        uint256 idx;
        for (uint256 i = 0; i < self.nextPurchaseId; ++i) {
            if (self.purchases[i].buyer == user) {
                result[idx++] = self.purchases[i];
            }
        }
        return result;
    }

    // --- Admin Withdrawals ---
    function withdrawTokens(
        Data storage self,
        address token,
        address recipient,
        uint128 amount,
        uint256 lockedEscrow,
        uint256 withinGracePeriod
    ) internal {
        uint256 balance = ERC20Upgradeable(token).balanceOf(address(this));
        uint256 freeCapital = balance - lockedEscrow - withinGracePeriod;
        require(amount <= freeCapital, "Insufficient free capital");
        ERC20Upgradeable(token).transfer(recipient, amount);
    }
}
