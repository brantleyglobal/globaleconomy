// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IGlobalLedgerRouter {
    function recordVenturePoolDeposit(address,address,address,uint256,uint256,bytes32) external;
    function recordVaultPoolDeposit(address,address,address,uint256,uint256,bytes32) external;
    function recordVentureDeposit(address,address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function recordVaultDeposit(address,address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function refundPurchase(address,address,address,uint256,uint256,uint256,uint256,bytes32)
        external returns (uint256[22] memory);
    function recordPurchase(address,address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function liquidateNative(address,address,uint256,uint256)
        external returns (uint256[22] memory);
    function previewLiquidateNative(address,address,uint256)
        external view returns (uint256[22] memory);
    function recordAcquisition(address,address,address,uint256,uint256,uint256,uint256,bytes32)
        external returns (uint256);
    function ventureWithdraw(address,address,address,address,uint256,uint256,uint256)
        external returns (uint256[22] memory);
    function vaultWithdraw(address,address,address,address,uint256,uint256,uint256,bool)
        external returns (uint256[22] memory);
}