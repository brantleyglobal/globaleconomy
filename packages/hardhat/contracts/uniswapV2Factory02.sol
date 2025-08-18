// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./libraries/uniswapV2Factory02Lib.sol";

interface IUniswapV2Pair {}

contract UniswapV2Factory is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using UniswapV2FactoryLib for UniswapV2FactoryLib.FactoryData;

    UniswapV2FactoryLib.FactoryData private factoryData;


    function initialize(address _feeToSetter, address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        require(_feeToSetter != address(0), "Invalid feeToSetter");
        factoryData.feeToSetter = _feeToSetter;
    }

    function createPair(address tokenA, address tokenB) external returns (address) {
        return factoryData.createPair(tokenA, tokenB);
    }

    function setFeeTo(address _feeTo) external {
        factoryData.setFeeTo(_feeTo, msg.sender);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}