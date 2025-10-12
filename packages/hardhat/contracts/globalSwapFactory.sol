// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./globalSwap.sol";

contract GlobalSwapFactory is Initializable {
    using SafeERC20 for IERC20;

    address public implementation;
    address[] public stablecoins;
    address public feeRecipient;
    mapping(address => bool) private stablecoinWhitelistMap;

    event SwapCreated(address swapAddress, address partyA, address partyB);

    function initialize(address _owner, address[] memory initialStables) public initializer {
        implementation = address(new GlobalSwap());
        feeRecipient = _owner;

        for (uint256 i = 0; i < initialStables.length; i++) {
            require(initialStables[i] != address(0), "Zero address not allowed");
            stablecoinWhitelistMap[initialStables[i]] = true;
            stablecoins.push(initialStables[i]);
        }
    }

    function _isWhitelisted(address token) internal view returns (bool) {
        return stablecoinWhitelistMap[token];
    }

    /// @notice Creates a new GlobalSwap contract
    function createSwap(
        address stable,
        address partyA,
        address partyB,
        address tokenA,
        uint256 amountA,
        address tokenB,
        uint256 amountB
    ) external {
        //require(_isWhitelisted(stable), "Token not whitelisted");
        address payable clone = payable(Clones.clone(implementation));
        GlobalSwap swap = GlobalSwap(clone);
        swap.initialize(partyA, partyB, tokenA, amountA, tokenB, amountB);

        uint256 decimals = 1e18;
        uint256 base = 10;
        uint256 fee = 30;

        for (uint256 i = 0; i < stablecoins.length; i++) {
            if (stablecoins[i] == stable) {
                if (i == 0 || i == 1 || i == 3 || i == 5 || i == 9 || i == 11 || i == 12 || i == 13) {
                    fee = (base * 101 * decimals) / (98 * decimals);
                } else if (i == 14) {
                    fee = (base * 101 * decimals) / (65 * decimals);
                } else if (i == 2) {
                    fee = (base * 101 * decimals) / (76 * decimals);
                } else if (i == 4 || i == 19) {
                    fee = (base * 101 * decimals) / (112 * decimals);
                } else if (i == 6) {
                    fee = (base * 101 * decimals) / (97 * decimals);
                } else if (i == 7) {
                    uint256 minExchangeRate = 65 * 1e16; // 0.0065 USD in 18 decimals
                    fee = (base * 101 * decimals) / (minExchangeRate);
                } else if (i == 8) {
                    uint256 minExchangeRate = 58 * 1e17; // 0.058 USD in 18 decimals
                    fee = (base * 101 * decimals) / (minExchangeRate);
                } else if (i == 10) {
                    fee = (base * 101 * decimals) / (74 * decimals);
                } else if (i == 15) {
                    uint256 minExchangeRate = 54 * 1e17; // 0.065 USD in 18 decimals
                    fee = (base * 101 * decimals) / (minExchangeRate);
                } else if (i == 16) {
                    uint256 minExchangeRate = 19 * decimals;
                    fee = (base * 101 * decimals) / minExchangeRate;
                } else if (i == 17) {
                    fee = (base * 101 * decimals) / (120 * decimals);
                } else if (i == 18) {
                    uint256 minExchangeRate = 30 * 1e17; // 0.030 USD in 18 decimals
                    fee = (base * 101 * decimals) / (minExchangeRate);
                } else if (i == 20) {
                    uint256 minExchangeRate = 11000000 * decimals; // WBTC 
                    fee = (base * 101 * decimals) / (minExchangeRate);
                } else if (i == 21) {
                    uint256 minExchangeRate = 160000 * decimals; // 1600 USD in 18 decimals
                    fee = (base * 101 * decimals) / (minExchangeRate);
                }
            }
        }
        
        IERC20(stable).safeTransferFrom(msg.sender, feeRecipient, fee);
        emit SwapCreated(address(swap), msg.sender, partyB);
    }
}
