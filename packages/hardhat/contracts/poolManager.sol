// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IPool {
    function getAllDepositors() external view returns (address[] memory);
    function getDepositedAmount(address user) external view returns (uint256);
    function getCommittedQuarters(address user) external view returns (uint256);
    function getDepositStartTime(address user) external view returns (uint256);
    function getPoolBalance() external view returns (uint256);
}

interface IQueryHub {
    function getMultiplier(address user) external view returns (uint256);
}

contract PoolManager is Initializable, UUPSUpgradeable {
    // Storage variables must be in the same order if you plan to upgrade
    address public poolAddress;
    address public queryHubAddress;

    uint256 public redemptionPeriod;

    // Optional: store an admin address for upgrade control
    address public admin;

    // Initialize function instead of constructor
    function initialize(address _pool, address _queryHub, address _admin) public initializer {
        poolAddress = _pool;
        queryHubAddress = _queryHub;
        redemptionPeriod = 3 * 90 days; // Example: 3 quarters (approx)
        admin = _admin;
    }

    // UUPS upgrade authorization
    function _authorizeUpgrade(address /* newImplementation */) internal override {
        require(msg.sender == admin, "Not authorized");
    }

    struct PayoutResult {
        address user;
        uint256 payout;
        bool redeemed;
    }

    function calculatePayouts() external view returns (PayoutResult[] memory results) {
        IPool pool = IPool(poolAddress);
        IQueryHub queryHub = IQueryHub(queryHubAddress);

        address[] memory users = pool.getAllDepositors();
        uint256 totalBalance = pool.getPoolBalance();

        uint256 redemptionReserve = 0;
        uint256 totalWeight = 0;

        bool[] memory redeemed = new bool[](users.length);
        uint256[] memory deposits = new uint256[](users.length);
        uint256[] memory multipliers = new uint256[](users.length);

        // First loop: determine redemption status and gather data
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            deposits[i] = pool.getDepositedAmount(user);
            uint256 depositTime = pool.getDepositStartTime(user);
            uint256 multiplier = queryHub.getMultiplier(user);
            multipliers[i] = multiplier;

            // Check if user has reached redemption period
            if (block.timestamp >= depositTime + redemptionPeriod) {
                // User is eligible for redemption
                redemptionReserve += deposits[i];
                redeemed[i] = true;
            } else {
                // Not redeemed yet, include for profit sharing
                totalWeight += multiplier;
            }
        }

        // Calculate remaining pool for profit sharing
        uint256 profitPool = totalBalance - redemptionReserve;

        // Prepare results array
        results = new PayoutResult[](users.length);

        // Second loop: assign payouts
        for (uint256 i = 0; i < users.length; i++) {
            uint256 payout;
            if (redeemed[i]) {
                // Redeemed depositor gets back deposit amount
                payout = deposits[i];
            } else {
                // Not redeemed: distribute profit proportionally
                payout = (profitPool * multipliers[i]) / totalWeight;
            }

            results[i] = PayoutResult({
                user: users[i],
                payout: payout,
                redeemed: redeemed[i]
            });
        }
    }
}