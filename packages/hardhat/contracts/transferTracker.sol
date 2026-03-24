// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TransferTracker is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    struct TransferT {
        uint256 timestamp;
        address user;
        address recipient;
        address token;
        uint256 amount; 
    }

    uint256 public feeBasisPoints;
    uint256 internal constant MAX_BPS = 10000;
    uint256[] public transferTimestamps;

    address public feeRecipient;

    mapping(address => mapping(address => mapping(address => uint256))) private transferDetails;
    mapping(address => uint256) public nonces;
    mapping(uint256 => TransferT) public transfersByTimestamp;

    event TransferRecorded(address indexed from, address indexed to, uint256 amount, uint256 nonce, bytes additionalData);
    event TransferTimestamp( uint256 timestamp, address indexed user, address indexed recipient, address token, uint256 amount);


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

    /// @notice Records a native currency transfer (ETH or GBDo) without executing it
    function Transfer(
        address token,
        address recipient,
        uint128 amount,
        bytes calldata additionalData
    ) external payable {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");

        transferDetails[msg.sender][recipient][token] += amount;
        uint256 currentNonce = nonces[msg.sender]++;

        uint256 ts = block.timestamp;
        transfersByTimestamp[ts] = TransferT(ts, msg.sender, recipient, token, amount);
        transferTimestamps.push(ts);

        emit TransferRecorded(msg.sender, recipient, amount, currentNonce, additionalData);
    }

    /// @notice Returns a specific transfer by index
    function getUserDetails(address sender, address recipient, address token) external view returns (uint256) {
        return transferDetails[sender][recipient][token];

    }

    function getTransfer(uint256 timestamp) public {
        TransferT memory w = transfersByTimestamp[timestamp];
        emit TransferTimestamp(w.timestamp, w.user, w.recipient, w.token, w.amount);
    }

    function getTransfersInRange(uint256 startTs, uint256 endTs) public {
        for (uint256 i = 0; i < transferTimestamps.length; i++) {
            uint256 ts = transferTimestamps[i];
            if (ts >= startTs && ts <= endTs) {
                TransferT memory w = transfersByTimestamp[ts];
                emit TransferTimestamp(w.timestamp, w.user, w.recipient, w.token, w.amount);
            }
        }
    }

    /// @dev Required for UUPS upgradeability
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
