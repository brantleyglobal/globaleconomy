// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


import "./libraries/WGBDLib.sol";

contract WGBD is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    WGBDLib.Data private data;

    event Approval(address indexed owner, address indexed spender, uint128 value);
    event Transfer(address indexed from, address indexed to, uint128 value);
    event Deposit(address indexed user, uint128 value);
    event Withdrawal(address indexed user, uint128 value);

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        WGBDLib.initialize(data);
    }

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        WGBDLib.deposit(data, msg.sender, uint128(msg.value));
        emit Deposit(msg.sender, uint128(msg.value));
    }

    function withdraw(uint128 wad) public {
        WGBDLib.withdraw(data, msg.sender, wad);
        emit Withdrawal(msg.sender, wad);
    }

    function approve(address spender, uint128 amount) public returns (bool) {
        WGBDLib.approve(data, msg.sender, spender, amount);
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint128 amount) public returns (bool) {
        WGBDLib.transfer(data, msg.sender, to, amount);
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint128 amount) public returns (bool) {
        WGBDLib.transferFrom(data, from, to, msg.sender, amount);
        emit Transfer(from, to, amount);
        return true;
    }

    function balanceOf(address account) public view returns (uint256) {
        return WGBDLib.balanceOf(data, account);
    }


    function _authorizeUpgrade(address) internal override onlyOwner {}
}
