// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "./libraries/smartVaultLib.sol"; // Import your external library

contract SmartVault is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    ERC20Upgradeable public stableToken;
    address public seedNode;

    SmartVaultLib.Redemption[] public redemptionQueue;

    uint256 public totalDeposits;
    uint256 public totalProfits;
    uint256 public currentDistributionId;

    uint256 public investmentReserve;
    uint256 public productReserve;
    uint256 public redemptionReserve;

    // Map user address to their info
    mapping(address => SmartVaultLib.UserInfo) public users;

    // Track user redemption IDs
    mapping(address => uint256[]) public userRedemptionIds;
    // Lock status for redemptions
    mapping(address => bool) public hasLockedRedemption;
    // Profits per distribution
    mapping(uint256 => uint256) public distributionProfits;

    // Events
    event Deposited(address indexed user, uint128 amount, uint32 committedQuarters);
    event Recommitted(address indexed user, uint32 newQuartersCommitted);
    event ProfitAdded(address indexed from, uint128 amount);
    event Distributed(uint256 id, uint256 totalProfit);
    event Claimed(address indexed user, uint256 reward);
    event Withdrawn(address indexed user, uint128 amount);
    event CapitalAllocated(uint256 investment, uint256 products, uint256 redemptions);
    event CapitalSpent(address indexed target, uint128 amount, string purpose);

    function initialize(address _owner, address _stableToken, address _seedNode) public initializer {
        require(_stableToken != address(0), "Invalid stable token");
        require(_seedNode != address(0), "Invalid seed node");

        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        stableToken = ERC20Upgradeable(_stableToken);
        seedNode = _seedNode;
    }

    // Internal: get current quarter based on timestamp
    function getQuarter(uint32 ts) internal pure returns (uint32) {
        return SmartVaultLib.getQuarter(ts);
    }

    // Helper to update user's multiplier based on committedQuarters
    function _updateUserMultiplier(address userAddress) internal {
        SmartVaultLib.UserInfo storage user = users[userAddress];
        user.multiplier = SmartVaultLib.computeMultiplier(user.committedQuarters);
    }

    // Deposit function
    function deposit(uint128 amount, uint32 committedQuarters) external {
        require(amount > 0, "Zero amount");
        require(committedQuarters >= 1, "Minimum 1 quarter");

        // Transfer tokens from user
        stableToken.transferFrom(msg.sender, address(this), amount);

        SmartVaultLib.UserInfo storage user = users[msg.sender];

        if (user.amount == 0) {
            // New user
            user.depositTime = uint64(block.timestamp);
            user.committedQuarters = committedQuarters;
            user.eligibleQuarter = SmartVaultLib.computeEligibilityQuarter(uint32(block.timestamp), committedQuarters);
            user.unlockQuarter = getQuarter(uint32(block.timestamp)) + committedQuarters;
            user.recommitCount = 0;
        } else {
            // Existing user; optionally update committedQuarters
            // Or keep previous, depending on your logic
            user.committedQuarters = committedQuarters;
            user.eligibleQuarter = SmartVaultLib.computeEligibilityQuarter(uint32(block.timestamp), committedQuarters);
            user.unlockQuarter = getQuarter(uint32(block.timestamp)) + committedQuarters;
        }

        // Update user's multiplier based on commitment
        _updateUserMultiplier(msg.sender);

        // Increase user deposit
        user.amount += amount;
        totalDeposits += amount;
        hasLockedRedemption[msg.sender] = true;

        emit Deposited(msg.sender, amount, committedQuarters);
    }

    // Recommit function to extend or change commitment
    function recommit(uint32 newQuarters) external {
        SmartVaultLib.UserInfo storage user = users[msg.sender];

        // Ensure lock period has passed
        require(block.timestamp >= user.depositTime + (user.committedQuarters * 90 days), "Still locked");

        // Update commitment
        user.depositTime = uint32(block.timestamp);
        user.recommitCount += 1;
        user.committedQuarters = newQuarters;
        user.eligibleQuarter = SmartVaultLib.computeEligibilityQuarter(uint32(block.timestamp), newQuarters);
        user.unlockQuarter = getQuarter(uint32(block.timestamp)) + newQuarters;

        // Recalculate multiplier
        _updateUserMultiplier(msg.sender);

        emit Recommitted(msg.sender, newQuarters);
    }

    // Fetch user vault info
    function getUserVaultInfo(address user)
        external
        view
        returns (
            uint128 amount,
            uint32 committedQuarters,
            uint32 unlockQuarter,
            uint256[] memory redemptionIds,
            SmartVaultLib.Redemption[] memory redemptions
        )
    {
        SmartVaultLib.UserInfo memory u = users[user];

        // Prepare redemption IDs
        uint256[] memory redIds = userRedemptionIds[user];

        // Prepare redemption array
        SmartVaultLib.Redemption[] memory redemptionsArr = new SmartVaultLib.Redemption[](redIds.length);
        for (uint256 i = 0; i < redIds.length; i++) {
            redemptionsArr[i] = redemptionQueue[redIds[i]];
        }

        return (
            u.amount,
            u.committedQuarters,
            u.unlockQuarter,
            redIds,
            redemptionsArr
        );
    }

    // Check user's deposit status
    function getUserDepositStatus(address user)
        external
        view
        returns (
            uint256 depositAmount,
            uint256 depositStartTime,
            uint256 elapsedDays,
            uint256 remainingDays,
            bool isPending,
            bool isClosed
        )
    {
        SmartVaultLib.UserInfo memory u = users[user];

        if (u.amount == 0) {
            return (0, 0, 0, 0, false, true);
        }

        uint256 lockPeriodSeconds = u.committedQuarters * 90 days;
        uint256 depositEndTime = u.depositTime + lockPeriodSeconds;
        uint256 currentTime = block.timestamp;

        if (currentTime < depositEndTime) {
            elapsedDays = (currentTime - u.depositTime) / 1 days;
            remainingDays = (depositEndTime - currentTime) / 1 days;
            return (u.amount, u.depositTime, elapsedDays, remainingDays, true, false);
        } else {
            elapsedDays = u.committedQuarters * 90;
            remainingDays = 0;
            return (u.amount, u.depositTime, elapsedDays, remainingDays, false, true);
        }
    }

    // Example: Add profits and distribute (stub functions)
    function addProfit(uint128 amount) external {
        // Logic for adding profit
        totalProfits += amount;
        emit ProfitAdded(msg.sender, amount);
    }

    function distribute(uint256 profitAmount) external {
        // Logic to distribute profit
        currentDistributionId += 1;
        distributionProfits[currentDistributionId] = profitAmount;
        emit Distributed(currentDistributionId, profitAmount);
    }

    // Authorization for upgrade
    function _authorizeUpgrade(address) internal override onlyOwner {}
}