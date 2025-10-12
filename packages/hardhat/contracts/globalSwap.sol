// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract GlobalSwap is Initializable {
    using SafeERC20 for IERC20;

    address public partyA;
    address public partyB;
    address public tokenA;
    address public tokenB;
    uint256 public amountA;
    uint256 public amountB;

    bool public partyADeposited;
    bool public partyBDeposited;
    bool public completed;

    event SwapJoined(address indexed partyB);
    event SwapCompleted();
    event Refund(address indexed party, uint256 amountA, uint256 amountB);

    function initialize(
        address _partyA,
        address _partyB,
        address _tokenA,
        uint256 _amountA,
        address _tokenB,
        uint256 _amountB
    ) external initializer {

        require(_partyA != address(0) && _partyB != address(0), "Invalid parties");
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid tokens");
        require(_amountA > 0 && _amountB > 0, "Amounts must be > 0");

        partyA = _partyA;
        partyB = _partyB;
        tokenA = _tokenA;
        tokenB = _tokenB;
        amountA = _amountA;
        amountB = _amountB;
    }

    /// @notice Allows party A or B to deposit their tokens and complete the swap atomically once both deposits are made.
    function deposit() external {
        require(msg.sender == partyA || msg.sender == partyB, "Only partyA or partyB can join");
        require(!completed, "Swap already completed");

        if (msg.sender == partyA) {
            require(!partyADeposited, "Party A already deposited");
            // partyA can deposit anytime before completion
            IERC20(tokenA).safeTransferFrom(partyA, address(this), amountA);
            partyADeposited = true;

            // If partyB already deposited, complete swap
            if (partyBDeposited) {
                _completeSwap();
            }
        } else {
            require(!partyBDeposited, "Party B already deposited");
            // partyB can deposit anytime before completion
            IERC20(tokenB).safeTransferFrom(partyB, address(this), amountB);
            partyBDeposited = true;

            // If partyA already deposited, complete swap
            if (partyADeposited) {
                _completeSwap();
            }
        }

        emit SwapJoined(msg.sender);
    }

    function _completeSwap() internal {
        require(!completed, "Swap already completed");
        require(partyADeposited && partyBDeposited, "Both parties must deposit");

        completed = true;

        // Transfer tokens atomically
        IERC20(tokenA).safeTransfer(partyB, amountA);
        IERC20(tokenB).safeTransfer(partyA, amountB);

        emit SwapCompleted();
    }

    function refund() external {
        require(!completed, "Swap already completed");

        completed = true;

        if (partyADeposited) {
            IERC20(tokenA).safeTransfer(partyA, amountA);
        }
        if (partyBDeposited) {
            IERC20(tokenB).safeTransfer(partyB, amountB);
        }

        emit Refund(msg.sender, amountA, amountB);
    }

}
