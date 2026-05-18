// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IGlobalLedger {
    function recordVenturePoolDeposit(address,address,uint256,uint256,bytes32) external;
    function recordVaultPoolDeposit(address,address,uint256,uint256,bytes32) external;
    function recordVentureDeposit(address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function recordVaultDeposit(address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function refundPurchase(address,address,uint256,uint256,uint256,uint256,bytes32)
        external returns (uint256[22] memory);
    function recordPurchase(address,address,uint256,uint256,uint256,uint256,bytes32) external;
    function liquidateNative(address,uint256,uint256)
        external returns (uint256[22] memory);
    function previewLiquidateNative(address,uint256)
        external view returns (uint256[22] memory);
    function recordAcquisition(address,address,uint256,uint256,uint256,uint256,bytes32)
        external returns (uint256);
    function ventureWithdraw(address,address,address,uint256,uint256,uint256)
        external returns (uint256[22] memory);
    function vaultWithdraw(address,address,address,uint256,uint256,uint256,bool)
        external returns (uint256[22] memory);
}
