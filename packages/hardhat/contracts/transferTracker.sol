// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./libraries/transferTrackerLib.sol";

contract TransferTracker is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using TransferTrackerLib for TransferTrackerLib.Data;

    TransferTrackerLib.Data private data;


    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    function recordTransfer(
        address recipient,
        address token,
        uint128 amount,
        uint8 status,
        bytes32 txhash
    ) external {
        data.recordTransfer(msg.sender, recipient, token, amount, status, txhash);
    }

    function getAllTransfersCount() external view returns (uint256) {
        return data.getAllTransfersCount();
    }

    function getTransfer(uint256 index) external view returns (
        address sender,
        address recipient,
        address token,
        uint128 amount,
        uint8 status,
        bytes32 txhash,
        uint64 timestamp
    ) {
        return data.getTransfer(index);
    }

    function getTransfersInvolvingUser(address user) external view returns (TransferTrackerLib.Transfer[] memory) {
        return data.getTransfersInvolvingUser(user);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}