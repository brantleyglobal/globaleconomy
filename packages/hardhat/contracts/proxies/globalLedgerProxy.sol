// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "../interfaces/IGlobalLedgerRouter.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract GlobalLedgerProxy is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    address public ledger;
    address public router;

    function initialize(address owner_, address ledger_, address router_) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        _transferOwnership(owner_);
        ledger = ledger_;
        router = router_;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // ---------------------------------------------------------
    //  ROUTED LEDGER CALLS (SmartVault → this → Router → Ledger)
    // ---------------------------------------------------------

    function recordVenturePoolDeposit(
        address currency,
        address callingContract,
        uint256 timeStamp,
        uint256 stableAmount,
        bytes32 depositHash
    ) external {
        IGlobalLedgerRouter(router).recordVenturePoolDeposit(
            ledger,
            currency,
            callingContract,
            timeStamp,
            stableAmount,
            depositHash
        );
    }

    function recordVaultPoolDeposit(
        address currency,
        address callingContract,
        uint256 timeStamp,
        uint256 stableAmount,
        bytes32 depositHash
    ) external {
        IGlobalLedgerRouter(router).recordVaultPoolDeposit(
            ledger,
            currency,
            callingContract,
            timeStamp,
            stableAmount,
            depositHash
        );
    }

    function recordVentureDeposit(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 depositHash
    ) external {
        IGlobalLedgerRouter(router).recordVentureDeposit(
            ledger,
            user,
            currency,
            timeStamp,
            nativeAmount,
            stableAmount,
            exchangeRate,
            depositHash
        );
    }

    function recordVaultDeposit(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 depositHash
    ) external {
        IGlobalLedgerRouter(router).recordVaultDeposit(
            ledger,
            user,
            currency,
            timeStamp,
            nativeAmount,
            stableAmount,
            exchangeRate,
            depositHash
        );
    }

    function refundPurchase(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external returns (uint256[22] memory) {
        return IGlobalLedgerRouter(router).refundPurchase(
            ledger,
            user,
            currency,
            timeStamp,
            nativeAmount,
            stableAmount,
            exchangeRate,
            purchaseHash
        );
    }

    function recordPurchase(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external {
        IGlobalLedgerRouter(router).recordPurchase(
            ledger,
            user,
            currency,
            timeStamp,
            nativeAmount,
            stableAmount,
            exchangeRate,
            purchaseHash
        );
    }

    function liquidateNative(
        address user,
        uint256 returningNative,
        uint256 timeStamp
    ) external returns (uint256[22] memory) {
        return IGlobalLedgerRouter(router).liquidateNative(
            ledger,
            user,
            returningNative,
            timeStamp
        );
    }

    function previewLiquidateNative(
        address user,
        uint256 requestedNative
    ) external view returns (uint256[22] memory) {
        return IGlobalLedgerRouter(router).previewLiquidateNative(
            ledger,
            user,
            requestedNative
        );
    }

    function recordAcquisition(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external returns (uint256) {
        return IGlobalLedgerRouter(router).recordAcquisition(
            ledger,
            user,
            currency,
            timeStamp,
            nativeAmount,
            stableAmount,
            exchangeRate,
            purchaseHash
        );
    }

    function ventureWithdraw(
        address user,
        address currency,
        address vault,
        uint256 amount,
        uint256 principle,
        uint256 timeStamp
    ) external returns (uint256[22] memory) {
        return IGlobalLedgerRouter(router).ventureWithdraw(
            ledger,
            user,
            currency,
            vault,
            amount,
            principle,
            timeStamp
        );
    }

    function vaultWithdraw(
        address user,
        address currency,
        address vault,
        uint256 amount,
        uint256 investmentAmount,
        uint256 timeStamp,
        bool unlockStatus
    ) external returns (uint256[22] memory) {
        return IGlobalLedgerRouter(router).vaultWithdraw(
            ledger,
            user,
            currency,
            vault,
            amount,
            investmentAmount,
            timeStamp,
            unlockStatus
        );
    }
}
