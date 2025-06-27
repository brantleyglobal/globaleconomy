// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
}

interface IUniswapV2Factory {
    function getPair(address, address) external view returns (address);
}

contract UniswapV2Router02 {
    address public factory;
    address public WGBD;

    constructor(address _factory, address _WGBD) {
        factory = _factory;
        WGBD = _WGBD;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint, // amountOutMin
        address[] calldata path,
        address to,
        uint // deadline
    ) external returns (uint[] memory amounts) {
        IERC20(path[0]).transferFrom(msg.sender, to, amountIn);
        uint[] memory out = new uint[](2);
        out[0] = amountIn;
        out[1] = amountIn; // mock: 1:1
        return out;
    }
}
