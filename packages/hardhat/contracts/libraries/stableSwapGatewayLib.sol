// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

library StableSwapLib {
    using SafeERC20 for ERC20Upgradeable;

    uint256 constant MAX_BPS = 10000;

    uint8 constant STATUS_PENDING = 0;
    uint8 constant STATUS_COMPLETED = 1;
    uint8 constant STATUS_REFUNDED = 2;

    struct SwapRecord {
        address fromToken;
        address toToken;
        uint128 fromAmount;
        uint128 toAmount;
        uint64 fee;
        uint32 timestamp;
        uint8 status;
    }

    struct Data {
        mapping(address => SwapRecord[]) userSwaps;
        mapping(address => bool) stablecoinWhitelist;
        mapping(address => bool) redemptionLocked;
        mapping(address => bool) authorizedLockers;
        ERC20Upgradeable GBD;
        uint256 feeBasisPoints;
    }

    event StableSwapped(address indexed user, address indexed stable, uint256 stableIn, uint256 gbdOut, uint256 fee);
    event StableRefunded(address indexed user, address indexed stable, uint256 gbdIn, uint256 stableOut, uint256 fee);
    event FeeUpdated(uint256 newFeeBps);
    event StablecoinToggled(address stable, bool enabled);
    

    function initialize(Data storage self, address gbd, uint256 initialFeeBps) internal {
        self.GBD = ERC20Upgradeable(gbd);
        self.feeBasisPoints = initialFeeBps;
    }

    function toggleStablecoin(Data storage self, address stable, bool isEnabled) internal {
        self.stablecoinWhitelist[stable] = isEnabled;
        // Optionally emit event outside
    }

    function setFee(Data storage self, uint256 newFeeBps) internal returns (uint256) {
        require(newFeeBps <= 500, "Fee too high");
        self.feeBasisPoints = newFeeBps;
        return newFeeBps;
    }

    function swapStableForGBD(
        Data storage self,
        address user,
        address stable,
        uint128 amount
    ) internal returns (SwapRecord memory) {
        require(self.stablecoinWhitelist[stable], "Stablecoin not supported");
        require(amount > 0, "Amount must be > 0");

        ERC20Upgradeable stableToken = ERC20Upgradeable(stable);
        stableToken.safeTransferFrom(user, address(this), amount);

        uint256 fee = (amount * self.feeBasisPoints) / StableSwapLib.MAX_BPS;
        uint256 gbdOut = amount - fee;

        require(self.GBD.balanceOf(address(this)) >= gbdOut, "Insufficient GBD liquidity");
        self.GBD.safeTransfer(user, gbdOut);

        SwapRecord memory record = SwapRecord({
            fromToken: stable,
            toToken: address(self.GBD),
            fromAmount: uint128(amount),
            toAmount: uint128(gbdOut),
            fee: uint64(fee),
            timestamp: uint32(block.timestamp),
            status: STATUS_COMPLETED
        });


        self.userSwaps[user].push(record);
        emit StableSwapped(user, stable, amount, gbdOut, fee); // Correct event
        return record;
    }

    function swapGBDForStable(
        Data storage self,
        address user,
        address stable,
        uint256 gbdAmount
    ) internal returns (SwapRecord memory) {
        require(self.stablecoinWhitelist[stable], "Stablecoin not supported");
        require(gbdAmount > 0, "Amount must be > 0");

        uint256 fee = (gbdAmount * self.feeBasisPoints) / StableSwapLib.MAX_BPS;
        uint256 stableOut = gbdAmount - fee;

        ERC20Upgradeable stableToken = ERC20Upgradeable(stable);
        require(stableToken.balanceOf(address(this)) >= stableOut, "Insufficient stablecoin liquidity");

        self.GBD.safeTransferFrom(user, address(this), gbdAmount);
        stableToken.safeTransfer(user, stableOut);

        SwapRecord memory record = SwapRecord({
            fromToken: address(self.GBD),
            toToken: stable,
            fromAmount: uint128(gbdAmount),
            toAmount: uint128(stableOut),
            fee: uint64(fee),
            timestamp: uint32(block.timestamp),
            status: STATUS_COMPLETED
        });

        self.userSwaps[user].push(record);
        emit StableRefunded(user, stable, gbdAmount, stableOut, fee); // Correct event
        return record;
    }
    // Additional functions like toggleLocker, unlockRedemption, etc., can be added similarly
}