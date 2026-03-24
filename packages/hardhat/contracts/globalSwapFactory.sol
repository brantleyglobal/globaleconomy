// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./globalSwap.sol";

contract GlobalSwapFactory is Initializable, AccessControl {
    using SafeERC20 for IERC20;

    address public implementation;
    address[] public stablecoins;
    address public feeRecipient;
    mapping(address => bool) private stablecoinWhitelistMap;

    event SwapCreated(address swapAddress, address partyA, address partyB, address tokenA, uint256 amountA, address tokenB, uint256 amountB);

    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    
    function initialize(address _owner, address[] memory initialStables) public initializer {
        implementation = address(new GlobalSwap());
        feeRecipient = _owner;

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(CREATOR_ROLE, _owner);

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
        address partyA,
        address partyB,
        address tokenA,
        uint256 amountA,
        address tokenB,
        uint256 amountB
    ) external onlyRole(CREATOR_ROLE) {
        //require(_isWhitelisted(stable), "Token not whitelisted");
        address payable clone = payable(Clones.clone(implementation));
        GlobalSwap swap = GlobalSwap(clone);
        swap.initialize(partyA, partyB, tokenA, amountA, tokenB, amountB, feeRecipient);
        
        emit SwapCreated(address(swap), msg.sender, partyB, tokenA, amountA, tokenB, amountB);
    }
}
