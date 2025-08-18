// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

library WGBDLib {
    struct Data {
        bytes32 name;
        bytes32 symbol;
        uint8 decimals;
        mapping(address => uint256) balanceOf;
        mapping(address => mapping(address => uint256)) allowance;
    }

    function initialize(Data storage self) internal {
        self.name = "WrappedGBD";
        self.symbol = "WGBD";
        self.decimals = 18;
    }

    function deposit(Data storage self, address sender, uint128 amount) internal {
        self.balanceOf[sender] += amount;
    }

    function withdraw(Data storage self, address sender, uint128 wad) internal {
        require(self.balanceOf[sender] >= wad, "NoBalance");
        self.balanceOf[sender] -= wad;
        (bool ok, ) = sender.call{value: wad}("");
        require(ok, "WithdrawFailed");
    }

    function approve(Data storage self, address owner, address spender, uint128 amount) internal {
        self.allowance[owner][spender] = amount;
    }

    function transfer(Data storage self, address sender, address recipient, uint128 amount) internal {
        require(self.balanceOf[sender] >= amount, "NoBalance");
        self.balanceOf[sender] -= amount;
        self.balanceOf[recipient] += amount;
    }

    function transferFrom(Data storage self, address src, address dst, address caller, uint128 amount) internal {
        require(self.balanceOf[src] >= amount, "NoBalance");
        if (src != caller && self.allowance[src][caller] != type(uint256).max) {
            require(self.allowance[src][caller] >= amount, "NoAllowance");
            self.allowance[src][caller] -= amount;
        }
        self.balanceOf[src] -= amount;
        self.balanceOf[dst] += amount;
    }

    function balanceOf(Data storage self, address account) internal view returns (uint256) {
        return self.balanceOf[account];
    }

}
