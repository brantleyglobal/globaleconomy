// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/ISmartVault.sol";

struct Payout {
    address user;
    uint256 amount;
}

contract PoolManager is UUPSUpgradeable, OwnableUpgradeable {
    // Vault reference
    address public vaultAddress;
    address public payoutAddress;

    // Bitmask flags
    mapping(address => uint8) public userFlags;

    // Distribution tracking
    mapping(address => uint256) public lastProcessedDistribution;

    // Bitmask definitions
    uint8 constant FLAG_ACTIVE    = 1 << 0;
    uint8 constant FLAG_REDEEMED  = 1 << 1;
    uint8 constant FLAG_ELIGIBLE  = 1 << 2;
    uint8 constant FLAG_DIVIDEND_PAID = 1 << 3;
    uint8 constant FLAG_REDEMPTION_PAID = 1 << 4;
    uint8 constant FLAG_COMMITTED = 1 << 5;
    uint8 constant FLAG_PENDING_REDEMPTION = 1 << 6;

    // Events
    event FlagUpdated(address indexed user, uint8 newFlags);
    event PayoutTriggered(address indexed user, uint256 amount);
    event VaultUpdated(address indexed newVault);
    event PayoutSkipped(address indexed user, uint256 attemptedAmount);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);

    // Initializer for upgradeable contract
    function initialize(address _owner, address _vaultAddress) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        vaultAddress = _vaultAddress;
    }

    function setPayoutAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Invalid address");
        payoutAddress = _newAddress;
    }

    // Required for UUPS upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Flag logic
    function setFlag(address user, uint8 flag) external onlyOwner {
        userFlags[user] |= flag;
        emit FlagUpdated(user, userFlags[user]);
    }

    function markCommitted(address user) external onlyOwner {
        userFlags[user] |= FLAG_COMMITTED;
        emit FlagUpdated(user, userFlags[user]);
    }


    function clearFlag(address user, uint8 flag) external onlyOwner {
        userFlags[user] &= ~flag;
        emit FlagUpdated(user, userFlags[user]);
    }

    function hasFlag(address user, uint8 flag) public view returns (bool) {
        return (userFlags[user] & flag) != 0;
    }

    // Batch flagging
    function batchSetFlags(address[] calldata users, uint8 flag) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            userFlags[users[i]] |= flag;
            emit FlagUpdated(users[i], userFlags[users[i]]);
        }
    }

    function batchClearFlags(address[] calldata users, uint8 flag) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            userFlags[users[i]] &= ~flag;
            emit FlagUpdated(users[i], userFlags[users[i]]);
        }
    }

    function deployCapital(address recipient, uint256 amount, string calldata reason) external onlyOwner {
        ISmartVault vault = ISmartVault(vaultAddress);
        vault.spendCapital(recipient, amount, reason);
    }

    // Payout logic
    function triggerDividend(address user, uint256 amount) external onlyOwner {
        require(hasFlag(user, FLAG_ACTIVE), "User not active");

        ISmartVault vault = ISmartVault(vaultAddress);
        vault.dispatchDividend(user, amount);

        lastProcessedDistribution[user] = block.timestamp;
        userFlags[user] |= FLAG_DIVIDEND_PAID;

        emit PayoutTriggered(user, amount);
    }

    function triggerRedemption(address user, uint256 amount) external onlyOwner {
        require(hasFlag(user, FLAG_ELIGIBLE), "User not eligible");
        require(!hasFlag(user, FLAG_REDEMPTION_PAID), "Already redeemed");

        ISmartVault vault = ISmartVault(vaultAddress);
        vault.processRedemption(user, amount);

        userFlags[user] |= FLAG_REDEMPTION_PAID;
        emit PayoutTriggered(user, amount);
    }

    // Batch payout
    function batchTriggerUnifiedPayout(address[] calldata users, uint256[] calldata amounts) external onlyOwner {
        require(users.length == amounts.length, "Length mismatch");
        ISmartVault vault = ISmartVault(vaultAddress);

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 amount = amounts[i];

            if (hasFlag(user, FLAG_ELIGIBLE) && !hasFlag(user, FLAG_REDEMPTION_PAID)) {
                vault.processRedemption(user, amount);
                userFlags[user] |= FLAG_REDEMPTION_PAID;
                emit PayoutTriggered(user, amount);
            } else if (hasFlag(user, FLAG_ACTIVE) && !hasFlag(user, FLAG_DIVIDEND_PAID)) {
                vault.dispatchDividend(user, amount);
                userFlags[user] |= FLAG_DIVIDEND_PAID;
                emit PayoutTriggered(user, amount);
            } else {
                // Fallback: user not eligible for any payout
                emit PayoutSkipped(user, amount);
            }

            lastProcessedDistribution[user] = block.timestamp;
        }
    }

    function batchDispatchDividend(address[] calldata users, uint256[] calldata amounts) external onlyOwner {
        require(users.length == amounts.length, "Length mismatch");
        ISmartVault vault = ISmartVault(vaultAddress);

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 amount = amounts[i];

            if (hasFlag(user, FLAG_ACTIVE)) {
                vault.dispatchDividend(user, amount);
                lastProcessedDistribution[user] = block.timestamp;
                userFlags[user] |= FLAG_DIVIDEND_PAID;
                emit PayoutTriggered(user, amount);
            }
        }
    }

    function batchProcessRedemption(address[] calldata users, uint256[] calldata amounts) external onlyOwner {
        require(users.length == amounts.length, "Length mismatch");
        ISmartVault vault = ISmartVault(vaultAddress);

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 amount = amounts[i];

            if (hasFlag(user, FLAG_ELIGIBLE) && !hasFlag(user, FLAG_REDEMPTION_PAID)) {
                vault.processRedemption(user, amount);
                userFlags[user] |= FLAG_REDEMPTION_PAID;
                emit PayoutTriggered(user, amount);
            }
        }
    }

    // Vault management
    function updateVault(address newVault) external onlyOwner {
        vaultAddress = newVault;
        emit VaultUpdated(newVault);
    }

        function getVaultUserInfo(address user) external view returns (
        uint256 amount,
        uint32 committedQuarters,
        uint32 multiplier,
        uint256 unlockQuarter,
        uint256 dividendsReceived,
        uint256 redemptionsReceived
    ) {
        return ISmartVault(vaultAddress).getUserInfo(user);
    }

    function routeCapitalToPayout(uint256 amount, string calldata reason) external onlyOwner {
        require(payoutAddress != address(0), "Payout address not set");
        ISmartVault vault = ISmartVault(vaultAddress);
        vault.spendCapital(payoutAddress, amount, reason);
    }


}
