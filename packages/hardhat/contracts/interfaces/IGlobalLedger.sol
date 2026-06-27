// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGlobalLedger {
    
    struct LedgerDepositHandle {
        address user;
        address token;
        address asset;
        uint256 timeStamp;
        uint256 nativeAmount;
        uint256 stableAmount;
        uint256 exchangeRate;
        bytes32 depositHash;
    }

    struct LedgerWithdrawHandle {
        address user;
        address token;
        address asset;
        uint256 payoutAmount;
        uint256 principalSlice;
        uint256 investmentAmount;
        uint256 timeStamp;
        bool status;
        bool initiationStatus;
    }

    struct LedgerPurchaseHandle {
        address user;
        address token;
        uint256 nativeAmount;
        uint256 stableAmount;
        uint256 exchangeRate;
        uint256 timeStamp;
        bytes32 purchaseHash;
    }

    struct LedgerAcquisitionHandle {
        address user;
        address token;
        uint256 nativeAmount;
        uint256 stableAmount;
        uint256 exchangeRate;
        uint256 timeStamp;
        bytes32 purchaseHash;
    }

    struct LedgerPoolHandle {
        address currency;
        address callingContract;
        uint256 timeStamp;
        uint256 nativeAmount;
        bytes32 depositHash;
    }


    //function recordVenturePoolDeposit(address,address,uint256,uint256,bytes32) external;
    function recordVenturePoolDeposit(LedgerPoolHandle calldata d) external;
    //function recordVaultPoolDeposit(address,address,uint256,uint256,bytes32) external;
    function recordVaultPoolDeposit(LedgerPoolHandle calldata d) external;
    //function recordVentureDeposit(address,address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function recordVentureDeposit(LedgerDepositHandle calldata d) external;
    //function recordVaultDeposit(address,address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function recordVaultDeposit(LedgerDepositHandle calldata d) external;
    //function refundPurchase(address,address,uint256,uint256,uint256,uint256,bytes32)
    function refundPurchase(LedgerPurchaseHandle calldata d)
        external returns (uint256[] memory);
    //function recordPurchase(address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function recordPurchase(LedgerPurchaseHandle calldata d) external;
    function liquidateNative(address,uint256,uint256)
        external returns (uint256[] memory);
    //function recordAcquisition(address,address,uint256,uint256,uint256,uint256,bytes32)
    function recordAcquisition(LedgerAcquisitionHandle calldata d) external;
    //function ventureWithdraw(address,address,address,uint256,uint256,uint256, uint256,bool)
    function ventureWithdraw(LedgerWithdrawHandle calldata d)
        external returns (uint256[] memory);
    //function vaultWithdraw(address,address,address,uint256,uint256,uint256,bool,bool)
    function vaultWithdraw(LedgerWithdrawHandle calldata d)
        external returns (uint256[] memory);
}
