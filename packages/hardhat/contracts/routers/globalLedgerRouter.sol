// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "../interfaces/IGlobalLedger.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


contract GlobalLedgerRouter is Initializable, UUPSUpgradeable, OwnableUpgradeable {

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    function recordVenturePoolDeposit(
        address ledger,
        address currency,
        address callingContract,
        uint256 timeStamp,
        uint256 stableAmount,
        bytes32 depositHash
    ) external {
        IGlobalLedger(ledger).recordVenturePoolDeposit(
            currency, callingContract, timeStamp, stableAmount, depositHash
        );
    }

    function recordVaultPoolDeposit(
        address ledger,
        address currency,
        address callingContract,
        uint256 timeStamp,
        uint256 stableAmount,
        bytes32 depositHash
    ) external {
        IGlobalLedger(ledger).recordVaultPoolDeposit(
            currency, callingContract, timeStamp, stableAmount, depositHash
        );
    }

    function recordVentureDeposit(
        address ledger,
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 depositHash
    ) external {
        IGlobalLedger(ledger).recordVentureDeposit(
            user, currency, timeStamp, nativeAmount, stableAmount, exchangeRate, depositHash
        );
    }

    function recordVaultDeposit(
        address ledger,
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 depositHash
    ) external {
        IGlobalLedger(ledger).recordVaultDeposit(
            user, currency, timeStamp, nativeAmount, stableAmount, exchangeRate, depositHash
        );
    }

    function refundPurchase(
        address ledger,
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external returns (uint256[22] memory) {
        return IGlobalLedger(ledger).refundPurchase(
            user, currency, timeStamp, nativeAmount, stableAmount, exchangeRate, purchaseHash
        );
    }

    function recordPurchase(
        address ledger,
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external {
        IGlobalLedger(ledger).recordPurchase(
            user, currency, timeStamp, nativeAmount, stableAmount, exchangeRate, purchaseHash
        );
    }

    function liquidateNative(
        address ledger,
        address user,
        uint256 returningNative,
        uint256 timeStamp
    ) external returns (uint256[22] memory) {
        return IGlobalLedger(ledger).liquidateNative(
            user, returningNative, timeStamp
        );
    }

    function previewLiquidateNative(
        address ledger,
        address user,
        uint256 requestedNative
    ) external view returns (uint256[22] memory) {
        return IGlobalLedger(ledger).previewLiquidateNative(
            user, requestedNative
        );
    }

    function recordAcquisition(
        address ledger,
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external returns (uint256) {
        return IGlobalLedger(ledger).recordAcquisition(
            user, currency, timeStamp, nativeAmount, stableAmount, exchangeRate, purchaseHash
        );
    }

    function ventureWithdraw(
        address ledger,
        address user,
        address currency,
        address vault,
        uint256 amount,
        uint256 principle,
        uint256 timeStamp
    ) external returns (uint256[22] memory) {
        return IGlobalLedger(ledger).ventureWithdraw(
            user, currency, vault, amount, principle, timeStamp
        );
    }

    function vaultWithdraw(
        address ledger,
        address user,
        address currency,
        address vault,
        uint256 amount,
        uint256 investmentAmount,
        uint256 timeStamp,
        bool unlockStatus
    ) external returns (uint256[22] memory) {
        return IGlobalLedger(ledger).vaultWithdraw(
            user, currency, vault, amount, investmentAmount, timeStamp, unlockStatus
        );
    }
}