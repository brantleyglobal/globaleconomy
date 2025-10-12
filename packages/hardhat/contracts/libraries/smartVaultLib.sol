// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library SmartVaultLib {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant BASE_MULTIPLIER = 100;
    address constant NATIVE_TOKEN = address(0);

    // User staking and term info
    struct UserInfo {
        uint256 amount;           // Native currency amount staked/tracked for this user
        uint32 committedQuarters; // Number of quarters committed in this term
        uint32 multiplier;        // Dividend multiplier based on commitment, for rewards scaling
        uint256 unlockQuarter;    // Quarter timestamp from which user can redeem
    }

    // Redemption request info
    struct Redemption {
        address user;
        uint256 amount;
        uint256 requestQuarter;
        bool fulfilled;
    }

    // Events for modular usage in consuming contracts
    event FundsTransferred(address indexed to, uint256 amount, address token);

    // Validation helpers

    function validateDeposit(uint256 amount) internal pure {
        require(amount > 0, "Deposit must be greater than zero");
    }

    function validateCapitalSpend(address recipient, uint256 amount, string calldata reason) internal pure {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");
        require(bytes(reason).length > 0, "Reason required");
    }

    function validateRedemption(UserInfo storage u, uint256 amount) internal view {
        require(u.amount >= amount, "Insufficient balance for redemption");
    }

    function validateDividend(address user, uint256 amount) internal pure {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Dividend must be greater than zero");
    }

    function getMultiplier(uint8 committedQuarters) internal pure returns (uint16) {
        if (committedQuarters == 2) {
            return 110;
        } else if (committedQuarters == 3) {
            return 115;
        } else if (committedQuarters == 4) {
            return 120;
        } else if (committedQuarters == 5) {
            return 130;
        } else if (committedQuarters == 6) {
            return 140;
        } else if (committedQuarters == 7) {
            return 150;
        } 
        return 100; // default base multiplier
    }

    // Create redemption struct
    function createRedemption(address user, uint256 amount, uint256 currentQuarter) internal pure returns (Redemption memory) {
        return Redemption({
            user: user,
            amount: amount,
            requestQuarter: currentQuarter,
            fulfilled: false
        });
    }

    // Fulfill redemption, transferring payoutToken to user
    function fulfillRedemption(mapping(uint256 => Redemption) storage queue, uint256 redemptionId, address payoutToken) internal {
        Redemption storage r = queue[redemptionId];
        require(!r.fulfilled, "Already fulfilled");
        require(r.amount > 0, "Invalid redemption");

        r.fulfilled = true;
        transferFunds(payoutToken, r.user, r.amount);
    }

    // Generic transfer helper, supports both native currency and ERC20 token via safe transfers
    function transferFunds(address token, address to, uint256 amount) internal {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");

        if (token == NATIVE_TOKEN) {
            require(address(this).balance >= amount, "Insufficient native balance");
            (bool success, ) = to.call{value: amount}("");
            require(success, "Native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        emit FundsTransferred(to, amount, token);
    }
}
