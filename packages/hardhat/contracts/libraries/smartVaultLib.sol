// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

library SmartVaultLib {
    struct UserInfo {
        uint128 amount;              // covers up to ~10^38
        uint64 depositTime;          // good for 500+ years
        uint64 claimedDistribution;  // compressed
        uint32 recommitCount;        // small number
        uint32 eligibleQuarter;
        uint32 committedQuarters;
        uint32 unlockQuarter;
        uint32 multiplier;
    }

    struct Redemption {
        address user;         // 20 bytes
        uint128 amount;       // compressed
        uint32 requestQuarter;
        bool fulfilled;       // 1 byte
    }

    // Calculation Functions

    function computeEligibilityQuarter(uint64 timestamp, uint32 committedQuarters) internal pure returns (uint32) {
        uint32 quarter = getQuarter(uint32(timestamp));
        uint32 startOfQ = getQuarterStart(uint32(timestamp));
        uint32 daysIntoQuarter = uint32(timestamp - startOfQ) / 1 days;
        uint32 graceWindow = committedQuarters >= 3 ? 20 : 0;
        return uint32(daysIntoQuarter <= graceWindow ? quarter : quarter + 1);
    }

    function getQuarter(uint32 ts) internal pure returns (uint32) {
        uint32 yearsSince1970 = ts / 31556926;
        uint32 year = 1970 + yearsSince1970;
        uint32 month = ((ts / 2592000) % 12) + 1;
        uint32 quarter = ((month - 1) / 3) + 1;
        return uint32(year * 4 + quarter);
    }

    function getQuarterStart(uint32 ts) internal pure returns (uint32) {
        uint32 yearsSince1970 = ts / 31556926;
        uint32 year = 1970 + yearsSince1970;
        uint32 month = ((ts / 2592000) % 12) + 1;
        uint32 quarterStartMonth = ((month - 1) / 3) * 3 + 1;
        return toTimestamp(year, quarterStartMonth, 1);
    }

    function toTimestamp(uint32 year, uint32 month, uint32 day) internal pure returns (uint32) {
        return (year - 1970) * 365 days + (month - 1) * 30 days + (day - 1) * 1 days;
    }

    // Utility Views

    function getUserVaultInfo(
        UserInfo memory u,
        uint256[] memory redIds,
        Redemption[] memory redemptionQueue
    ) internal pure returns (
        uint128 amount,
        uint32 committedQuarters,
        uint32 unlockQuarter,
        uint256[] memory redemptionIds,
        Redemption[] memory redemptions
    ) {
        amount = u.amount;
        committedQuarters = u.committedQuarters;
        unlockQuarter = u.unlockQuarter;

        redemptions = new Redemption[](redIds.length);
        for (uint256 i = 0; i < redIds.length; i++) {
            redemptions[i] = redemptionQueue[redIds[i]];
        }
        redemptionIds = redIds;
    }

    function getUserDepositStatus(
        UserInfo memory u,
        uint64 blockTimestamp
    ) internal pure returns (
        uint256 depositAmount,
        uint256 depositStartTime,
        uint256 elapsedDays,
        uint256 remainingDays,
        bool isPending,
        bool isClosed
    ) {
        depositAmount = u.amount;
        depositStartTime = u.depositTime;

        if (depositAmount == 0) {
            return (0, 0, 0, 0, false, true);
        }

        uint256 lockPeriodSeconds = u.committedQuarters * 90 days;
        uint256 depositEndTime = u.depositTime + lockPeriodSeconds;

        if (blockTimestamp < depositEndTime) {
            elapsedDays = (blockTimestamp - u.depositTime) / 1 days;
            remainingDays = (depositEndTime - blockTimestamp) / 1 days;
            isPending = true;
            isClosed = false;
        } else {
            elapsedDays = u.committedQuarters * 90;
            remainingDays = 0;
            isPending = false;
            isClosed = true;
        }
    }

    // Compute multiplier based on committedQuarters
    function computeMultiplier(uint32 committedQuarters) internal pure returns (uint32) {
        if (committedQuarters >= 6) {
            return 200;
        } else if (committedQuarters >= 3) {
            return 150;
        } else {
            return 125;
        }
    }

    // Update user's multiplier based on current committedQuarters
    function updateUserMultiplier(UserInfo storage user) internal {
        user.multiplier = computeMultiplier(user.committedQuarters);
    }
}