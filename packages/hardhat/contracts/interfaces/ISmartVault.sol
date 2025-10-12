// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


interface ISmartVault {
    function dispatchDividend(address user, uint256 amount) external;
    function processRedemption(address user, uint256 amount) external;
    function spendCapital(address recipient, uint256 amount, string calldata reason) external;
    function getUserInfo(address user) external view returns (
        uint256 amount,
        uint32 committedQuarters,
        uint32 multiplier,
        uint256 unlockQuarter,
        uint256 dividendsReceived,
        uint256 redemptionsReceived
    );
    function getMultiplier(address user) external view returns (uint32);
    function isRedemptionEligible(address user) external view returns (bool);
}