// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

library TransferTrackerLib {
    uint8 constant STATUS_PENDING = 0;
    uint8 constant STATUS_COMPLETED = 1;
    uint8 constant STATUS_FAILED = 2;

    struct Transfer {
        address sender;         // Slot 0 (20 bytes)
        address recipient;      // Slot 0 (next 12 bytes, spills into Slot 1)
        address token;          // Slot 1 (remaining 8 bytes) + Slot 2 (12 bytes)
        uint128 amount;         // Slot 2 (next 16 bytes)
        bytes32 txhash;         // Slot 3 (32 bytes)
        uint64 timestamp;       // Slot 4 (8 bytes)
        uint8 status;           // Slot 4 (1 byte)
    }

    struct Data {
        Transfer[] allTransfers;
        mapping(address => uint256[]) userTransferIndices;
    }

    function recordTransfer(
        Data storage self,
        address sender,
        address recipient,
        address token,
        uint128 amount,
        uint8 status,
        bytes32 txhash
    ) internal {
        Transfer memory newTransfer = Transfer({
            sender: sender,
            recipient: recipient,
            token: token,
            amount: amount,
            status: status,
            txhash: txhash,
            timestamp: uint64(block.timestamp)
        });

        self.allTransfers.push(newTransfer);
        uint256 index = self.allTransfers.length - 1;

        self.userTransferIndices[sender].push(index);
        self.userTransferIndices[recipient].push(index);
    }

    function getAllTransfersCount(Data storage self) internal view returns (uint256) {
        return self.allTransfers.length;
    }

    function getTransfer(Data storage self, uint256 index) internal view returns (
        address sender,
        address recipient,
        address token,
        uint128 amount,
        uint8 status,
        bytes32 txhash,
        uint64 timestamp
    ) {
        require(index < self.allTransfers.length, "Index out of bounds");
        Transfer memory t = self.allTransfers[index];
        return (t.sender, t.recipient, t.token, t.amount, t.status, t.txhash, t.timestamp);
    }

    function getTransfersInvolvingUser(Data storage self, address user) internal view returns (Transfer[] memory) {
        uint256 total = self.userTransferIndices[user].length;
        Transfer[] memory involvedTransfers = new Transfer[](total);
        for (uint256 i = 0; i < total; i++) {
            involvedTransfers[i] = self.allTransfers[self.userTransferIndices[user][i]];
        }
        return involvedTransfers;
    }
}