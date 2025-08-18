// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./libraries/uniswapV2Router02Lib.sol";

contract UniswapV2Router02 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using UniswapV2Lib for address[];  // <-- attach library methods to address[]

    address public factory;
    address public WGBD;


    function initialize(address _factory, address _WGBD, address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        factory = _factory;
        WGBD = _WGBD;
    }

    // Swap function
    function swapExactTokensForTokens(
        uint amountIn,
        uint /* amountOutMin */, // not used here, but kept for interface compatibility
        address[] calldata path,
        address to,
        uint /* deadline */ // not used here
    ) external returns (uint[] memory amounts) {
        // Call library method
        return path.swapExactTokensForTokens(msg.sender, amountIn, to);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}