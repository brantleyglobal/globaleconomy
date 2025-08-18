// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

library UserQueryLib {
    // --- Transfer Tracking ---
    struct Transfer {
        address sender;
        address recipient;
        address token;
        uint128 amount;
        uint8 status;
        bytes32 txhash;
        uint64 timestamp;
    }

    function getTransfers(address tracker, address user)
        internal
        view
        returns (Transfer[] memory)
    {
        bytes memory data = abi.encodeWithSignature("getTransfersOf(address)", user);
        (bool success, bytes memory returnData) = tracker.staticcall(data);
        require(success, "getTransfers call failed");
        return abi.decode(returnData, (Transfer[]));
    }

    // --- Asset Purchase ---
    struct Purchase {
        address buyer;
        uint64 assetId;
        uint256 price;
        uint64 timestamp;
    }

    function getPurchases(address purchaseContract, address user)
        internal
        view
        returns (Purchase[] memory)
    {
        bytes memory data = abi.encodeWithSignature("getUserPurchases(address)", user);
        (bool success, bytes memory returnData) = purchaseContract.staticcall(data);
        require(success, "getPurchases call failed");
        return abi.decode(returnData, (Purchase[]));
    }

    // --- Smart Vault ---
    struct Redemption {
        uint256 id;
        address user;
        uint128 amount;
        uint256 requestedAt;
        bool fulfilled;
    }

    function getVaultInfo(address smartVault, address user)
        internal
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256[] memory,
            Redemption[] memory
        )
    {
        bytes memory data = abi.encodeWithSignature("getUserVaultInfo(address)", user);
        (bool success, bytes memory returnData) = smartVault.staticcall(data);
        require(success, "getVaultInfo call failed");
        return abi.decode(returnData, (uint256, uint256, uint256, uint256[], Redemption[]));
    }

    function getDepositStatus(address smartVault, address user)
        internal
        view
        returns (
            uint256 depositAmount,
            uint256 depositStartTime,
            uint256 elapsedDays,
            uint256 remainingDays,
            bool isPending,
            bool isClosed
        )
    {
        bytes memory data = abi.encodeWithSignature("getUserDepositStatus(address)", user);
        (bool success, bytes memory returnData) = smartVault.staticcall(data);
        require(success, "getDepositStatus call failed");
        return abi.decode(returnData, (uint256, uint256, uint256, uint256, bool, bool));
    }

    // --- Stable Swap Gateway ---
    enum SwapStatus { Pending, Completed, Refunded }

    struct SwapRecord {
        address fromToken;
        address toToken;
        uint256 fromAmount;
        uint256 toAmount;
        uint256 fee;
        SwapStatus status;
        uint64 timestamp;
    }

    function getSwaps(address gateway, address user)
        internal
        view
        returns (SwapRecord[] memory)
    {
        bytes memory data = abi.encodeWithSignature("getUserSwaps(address)", user);
        (bool success, bytes memory returnData) = gateway.staticcall(data);
        require(success, "getSwaps call failed");
        return abi.decode(returnData, (SwapRecord[]));
    }

    function getSwapsByStatus(address gateway, address user, SwapStatus status)
        internal
        view
        returns (SwapRecord[] memory)
    {
        bytes memory data = abi.encodeWithSignature("getUserSwapsByStatus(address,uint8)", user, uint8(status));
        (bool success, bytes memory returnData) = gateway.staticcall(data);
        require(success, "getSwapsByStatus call failed");
        return abi.decode(returnData, (SwapRecord[]));
    }

    // --- Get Multiplier ---
    // Assumes external contract has: function getMultiplier(address user) external view returns (uint256);
    function getMultiplier(address multiplierSource, address user)
        internal
        view
        returns (uint256)
    {
        bytes memory data = abi.encodeWithSignature("getMultiplier(address)", user);
        (bool success, bytes memory returnData) = multiplierSource.staticcall(data);
        require(success, "getMultiplier call failed");
        return abi.decode(returnData, (uint256));
    }

}