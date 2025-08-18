// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

library UniswapV2Lib {
    // Swap function
    function swapExactTokensForTokens(
        address[] calldata path,
        address from,
        uint amountIn,
        address to
    ) internal returns (uint[] memory amounts) {
        ERC20Upgradeable(path[0]).transferFrom(from, to, amountIn);
        uint[] memory out = new uint[](2);
        out[0] = amountIn;
        out[1] = amountIn; // mock: 1:1 ratio
        return out;
    }
}