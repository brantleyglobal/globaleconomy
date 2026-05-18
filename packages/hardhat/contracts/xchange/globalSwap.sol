// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract GlobalSwap is Initializable {
    using SafeERC20 for IERC20;

    address public owner;

    address public partyA;
    address public partyB;
    address public tokenA;
    address public tokenB;
    uint256 public amountA;
    uint256 public amountB;
    bytes32 public partyADepositHash;
    bytes32 public partyBDepositHash;
    bytes32 public partyARefundHash;
    bytes32 public partyBRefundHash;

    bool public partyADeposited;
    bool public partyBDeposited;
    bool public partyARefund;
    bool public partyBRefund;
    bool public completed;
    bool public payoutACompleted;
    bool public payoutBCompleted;
    bool public refundACompleted;
    bool public refundBCompleted;

    event SwapJoined(address indexed party, address indexed token, uint256 amount);
    event SwapCompleted(address indexed partyA, address indexed partyB, address tokenA, address tokenB, uint256 amountA, uint256 amountB);
    event Refund(address indexed party, address token, uint256 amount, bytes32 refundHash);

    address public feeRecipient;
    uint256 public feeBasisPoints;
    uint256 internal constant MAX_BPS = 10000;

    function initialize(
        address _partyA,
        address _partyB,
        address _tokenA,
        uint256 _amountA,
        bytes32 _partyADepositHash,
        address _tokenB,
        uint256 _amountB,
        bytes32 _partyBDepositHash,
        address _feeRecipient
    ) external initializer {

        require(_partyA != address(0) && _partyB != address(0), "Invalid parties");
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid tokens");
        require(_amountA > 0 && _amountB > 0, "Amounts must be > 0");

        feeBasisPoints = 25;

        partyA = _partyA;
        partyB = _partyB;
        tokenA = _tokenA;
        tokenB = _tokenB;
        amountA = _amountA;
        amountB = _amountB;
        partyADepositHash = _partyADepositHash;
        partyBDepositHash = _partyBDepositHash;
        feeRecipient = _feeRecipient;
        owner = _feeRecipient;
    }

    /// @notice Allows party A or B to deposit their tokens and complete the swap atomically once both deposits are made.
    function deposit(address party, bytes32 _depositHash) external {
        require(msg.sender == owner || msg.sender == partyA || msg.sender == partyB, "Only Admin, partyA or partyB can join");
        require(!completed, "Swap already completed");
        address token;
        uint256 amount;

        if (msg.sender == partyA) {
            require(!partyADeposited, "Party A already deposited");
            // partyA can deposit anytime before completion
            token = tokenA;
            amount = amountA;
            partyADeposited = true;
            partyADepositHash = _depositHash;

            // If partyB already deposited, complete swap
            if (partyBDeposited && partyADepositHash != 0 && partyBDepositHash != 0) {
                _completeSwap();
                emit SwapCompleted(partyA, partyB, tokenA, tokenB, amountA, amountB);
            }

        } else if (msg.sender == partyB) {
            require(!partyBDeposited, "Party B already deposited");
            // partyB can deposit anytime before completion
            token = tokenB;
            amount = amountB;
            partyBDeposited = true;
            partyBDepositHash = _depositHash;

            // If partyA already deposited, complete swap
            if (partyADeposited && partyADepositHash != 0 && partyBDepositHash != 0) {
                _completeSwap();
                emit SwapCompleted(partyA, partyB, tokenA, tokenB, amountA, amountB);
            }

        } else {
            if (party == partyA) {
                require(!partyADeposited, "Party A already deposited");
                // partyA can deposit anytime before completion
                token = tokenA;
                amount = amountA;
                partyADeposited = true;
                partyADepositHash = _depositHash;

                // If partyB already deposited, complete swap
                if (partyBDeposited && partyADepositHash != 0 && partyBDepositHash != 0) {
                    _completeSwap();
                    emit SwapCompleted(partyA, partyB, tokenA, tokenB, amountA, amountB);
                }
                
            } else if (party == partyB) {
                require(!partyBDeposited, "Party B already deposited");
                // partyB can deposit anytime before completion
                token = tokenB;
                amount = amountB;
                partyBDeposited = true;
                partyBDepositHash = _depositHash;

                // If partyA already deposited, complete swap
                if (partyADeposited && partyADepositHash != 0 && partyBDepositHash != 0) {
                    _completeSwap();
                    emit SwapCompleted(partyA, partyB, tokenA, tokenB, amountA, amountB);
                }
            }  else {
                revert("Invalid party");
            }
        }
    }

    function _completeSwap() internal {
        require(!completed, "Swap already completed");
        require(partyADeposited && partyBDeposited, "Both parties must deposit");

        completed = true;

    }

    function refund(address party, bytes32 _refundHash) external {
        require(msg.sender == owner || msg.sender == partyA || msg.sender == partyB, "Only Admin, partyA or partyB can join");
        require(!completed, "Swap already completed");

        address token;
        uint256 amount;

        if (partyADeposited && (msg.sender == partyA)) {
            require(!partyARefund, "Refund already requested");
            partyARefund = true;
            token = tokenA;
            amount = amountA;
            emit Refund(msg.sender, token, amount, _refundHash);
        } else if (partyBDeposited && (msg.sender == partyB)) {
            require(!partyBRefund, "Refund already requested");
            partyBRefund = true;
            token = tokenB;
            amount = amountB;
            emit Refund(msg.sender, token, amount, _refundHash);
        } else if (msg.sender == owner) {
            if (partyADeposited && party == partyA){
                require(!partyARefund, "Refund already requested");
                partyARefund = true;
                refundACompleted = true;
                token = tokenA;
                amount = amountA;
                partyARefundHash = _refundHash;
                emit Refund(party, token, amount, _refundHash);
            } else if (partyBDeposited && party == partyB){
                require(!partyBRefund, "Refund already requested");
                partyBRefund = true;
                refundBCompleted = true;
                token = tokenB;
                amount = amountB;
                partyBRefundHash = _refundHash;
                emit Refund(party, token, amount, _refundHash);
            }  else {
                revert("Not eligible for refund");
            }

        } else { revert("Not eligible for refund"); }
    }

    function markPartyAPayoutCompleted() external {
        require(msg.sender == owner, "Only owner");
        payoutACompleted = true;
    }

    function markPartyBPayoutCompleted() external {
        require(msg.sender == owner, "Only owner");
        payoutBCompleted = true;
    }


}
