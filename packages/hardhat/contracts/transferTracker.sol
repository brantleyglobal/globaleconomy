// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TransferTracker is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    uint256 public feeBasisPoints;
    uint256 internal constant MAX_BPS = 10000;

    address public feeRecipient;

    mapping(address => mapping(address => mapping(address => uint256))) private transferDetails;

    event TransferRecorded(
        address indexed sender,
        address indexed recipient,
        address indexed token,
        uint128 amount,
        uint64 timestamp
    );

    /// @notice Initializes the contract with owner and optional stablecoin whitelist
    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        feeBasisPoints = 25;
        feeRecipient = _owner;
    }

    /// @notice Updates the fee basis points (max 10000 = 100%)
    function setFeeBasisPoints(uint256 newBps) external onlyOwner {
        require(newBps <= 5000, "Fee too high");
        feeBasisPoints = newBps;
    }

    /// @notice Records a native currency transfer (ETH or GBDO) without executing it
    function Transfer(
        address token,
        address recipient,
        uint128 amount
    ) external payable {
        require(token == address(0), "Only native token supported");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");
        
        uint256 netAmount = (amount * MAX_BPS) / (feeBasisPoints + MAX_BPS);
        uint256 fee = amount - netAmount;

        transferDetails[msg.sender][recipient][token] += amount;


        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Transfer fee to feeRecipient if applicable
        if (fee > 0) {
            IERC20(token).safeTransfer(feeRecipient, fee);
        }

        IERC20(token).safeTransfer(recipient, netAmount);

        emit TransferRecorded(msg.sender, recipient, token, amount, uint64(block.timestamp));
    }

    /// @notice Returns a specific transfer by index
    function getUserDetails(address sender, address recipient, address token) external view returns (uint256) {
        return transferDetails[sender][recipient][token];


    }

    /// @dev Required for UUPS upgradeability
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
