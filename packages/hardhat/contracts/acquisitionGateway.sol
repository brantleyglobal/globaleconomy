// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./GBDo.sol";
import "./GBDx.sol";
import "./COPx.sol";

contract AcquisitionGateway is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    struct Purchase {
        uint256 timestamp;
        address user;
        address token;
        address payoutSetter;
        uint32 termIndex;
        uint256 amountin;
        uint256 amountout;
        bytes32 purchaseTxHash;
        bytes32 payoutTxHash;
    }

    struct RateRange {
        uint256 min;
        uint256 max;
    }

    GlobalDollar public stakeablecoins;

    address[] public stablecoins;
    
    address constant NATIVE_TOKEN = address(0);

    uint256[] public purchaseTimestamps;
    uint256 public depositFeeBps;
    uint256 public processTimeStampStart;
    uint256 public processTimeStampEnd;
    uint256 private _supply;
    
    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(uint256 => Purchase) public purchasesByTimestamp;
    mapping(address => Purchase[]) public purchasesByUser;
    mapping(bytes32 => bool) public processedDeposits;
    mapping(address => uint8) stablecoinIndex;
    mapping(uint8 => RateRange) public rateRange;

    event Acquisitioned(address indexed user, uint256 amountOut, uint256 amountIn);
    event PurchaseTimestamp( uint256 timestamp, address indexed user, address token, uint256 amountOut, uint256 amountIn);
    event PayoutTxHashCorrected(address user, bytes32 old, bytes32 newTxHash, address payoutSetter);
    event UnexpectedPayoutTxHash(address indexed user, bytes32 existingHash, address existingSetter, uint256 amount, address attemptedSetter);
    event PayoutProcessed(uint256 timeStamp, address user, uint256 amount, uint32 termIndex, bytes32 payoutHash);

    uint256 constant DECIMALS = 1e18;
    uint256 constant GBDr = 1030000000000000000;
    uint256 constant RATE_098 = 980000000000000000;   // 0.98 * 1e18
    uint256 constant RATE_102 = 1020000000000000000;  // 1.02 * 1e18
    uint256 constant RATE_065 = 65000000000000000;    // 0.065 * 1e18
    uint256 constant RATE_069 = 69000000000000000;    // 0.069 * 1e18
    uint256 constant RATE_072 = 720000000000000000;   // 0.72 * 1e18
    uint256 constant RATE_076 = 760000000000000000;   // 0.76 * 1e18
    uint256 constant RATE_108 = 1080000000000000000;  // 1.08 * 1e18
    uint256 constant RATE_112 = 1120000000000000000;  // 1.12 * 1e18
    uint256 constant RATE_097 = 970000000000000000;   // 0.97 * 1e18
    uint256 constant RATE_100 = 1000000000000000000;  // 1.00 * 1e18
    uint256 constant RATE_074 = 740000000000000000;   // 0.74 * 1e18
    uint256 constant RATE_054 = 54000000000000000;    // 0.054 * 1e18
    uint256 constant RATE_064 = 64000000000000000;    // 0.064 * 1e18
    uint256 constant RATE_019 = 19000000000000000000; // 19 * 1e18
    uint256 constant RATE_021 = 21000000000000000000; // 21 * 1e18
    uint256 constant RATE_120 = 1200000000000000000;  // 1.20 * 1e18
    uint256 constant RATE_130 = 1300000000000000000;  // 1.30 * 1e18
    uint256 constant RATE_030 = 30000000000000000000; // 30 * 1e18
    uint256 constant RATE_033 = 33000000000000000000; // 33 * 1e18
    uint256 constant RATE_0065 = 65000000000000000;   // 0.0065 * 1e18
    uint256 constant RATE_0073 = 73000000000000000;   // 0.0073 * 1e18
    uint256 constant RATE_058 = 580000000000000000;   // 0.58 * 1e18 (adjust if needed)
    uint256 constant RATE_062 = 620000000000000000;   // 0.62 * 1e18 (adjust if needed)
    uint256 constant RATE_100000 = 100000000000000000000000;   // 100_000 * 1e18 (adjust if needed)
    uint256 constant RATE_16000 = 16000000000000000000000;   // 16_000 * 1e18 (adjust if needed)
    uint256 constant RATE_600 = 600000000000000000000;   // 600 * 1e18 (adjust if needed)

    // Events omitted for brevity...

    function initialize(
        address _owner,
        address[] memory initialStables
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

        depositFeeBps = 25;

        // Initialize stablecoin whitelist and store in map and array for iteration
        for (uint256 i = 0; i < initialStables.length; i++) {
            address sc = initialStables[i];
            require(sc != address(0), "Zero address not allowed");

            stablecoinWhitelistMap[sc] = true;
            stablecoins.push(sc);

            stablecoinIndex[sc] = uint8(i);
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Check token whitelist using map
    function _isWhitelisted(address token) internal view returns (bool) {
        return stablecoinWhitelistMap[token];
    }

    // Deposit with reentrancy guard
    function acquisition(
        address user,
        address token,
        uint256 amountin,
        uint256 amountout,
        uint256 rate,
        bytes32 depositHash
    ) external payable onlyOwner nonReentrant {
        require(_isWhitelisted(token), "Token not whitelisted");
        require(!processedDeposits[depositHash], "Duplicate Hash");
        processedDeposits[depositHash] = true;
        
        uint256 fee = (amountin * depositFeeBps) / 10000;
        uint256 baseAmount = amountout / rate;
        uint256 netAmount = baseAmount - fee;
        uint256 gbdAmountout = amountout;

        uint8 i = stablecoinIndex[token];
        RateRange memory r = rateRange[i];
        uint256 minRate = (((netAmount * DECIMALS) / GBDr) * r.min) / DECIMALS;
        uint256 maxRate = (((netAmount * DECIMALS) / GBDr) * r.max) / DECIMALS;

        if (gbdAmountout < minRate || gbdAmountout > maxRate) {
            gbdAmountout = minRate;
        }

        uint256 currentSupply = viewSupply();
        uint256 updatedSupply = currentSupply + gbdAmountout;

        (bool ok,) = user.call{value:amountout}("");
        require(ok, "Native Transfer Failed.. Check Balance");

        supply(updatedSupply);

        
        uint256 ts = block.timestamp;

        // 1. Allocate new user purchase slot
        purchasesByUser[user].push();
        uint256 index = purchasesByUser[user].length - 1;
        Purchase storage p = purchasesByUser[user][index];

        // 2. Fill the struct
        p.timestamp = ts;
        p.user = user;
        p.token = token;
        p.amountin = amountin;
        p.amountout = gbdAmountout;
        p.termIndex = uint32(index);
        p.purchaseTxHash = depositHash;
        p.payoutSetter = msg.sender;

        // 3. Store in timestamp mapping (NOT automatic)
        purchasesByTimestamp[ts] = p;

        // 4. Store timestamp for iteration (NOT automatic)
        purchaseTimestamps.push(ts);

        if (processTimeStampStart == 0) {
            processTimeStampStart = ts;
        }

        processTimeStampEnd = ts;

        emit Acquisitioned(user, gbdAmountout, amountin);
    }

    function getUserTermCount(address user) external view returns (uint256) {
        return purchasesByUser[user].length;
    }

    function getUserTerm(address user, uint32 index)
        external
        view
        returns (Purchase memory)
    {
        return purchasesByUser[user][index];
    }

    function getUserPurchases(address user)
        external
        view
        returns (Purchase[] memory)
    {
        return purchasesByUser[user];
    }

    function viewSupply() internal view returns (uint256) {
        return _supply;
    }

    function supply(uint256 amount) internal {
        _supply = amount;
    }

    function computeReconciliationPool()
        public
        view
        returns (
            uint256 reconciliationAmount
        )
    {

        reconciliationAmount = viewSupply();

        return (reconciliationAmount);
    }

    function addToReconciliationPool() external payable onlyOwner nonReentrant {

        require(processTimeStampStart != 0, "No timestamps to process");

        uint256 start = processTimeStampStart;
        uint256 end = processTimeStampEnd;

        for (uint256 i = 0; i < purchaseTimestamps.length; i++) {
            uint256 ts = purchaseTimestamps[i];

            // Skip timestamps outside the batch
            if (ts < start || ts > end) continue;

            Purchase storage w = purchasesByTimestamp[ts];

            // Skip already processed payouts
            if (w.payoutTxHash != bytes32(0)) continue;

            // Execute payout
            payable(w.user).transfer(w.amountout);

            // Compute tx hash
            bytes32 txHash = keccak256(
                abi.encodePacked(block.timestamp, w.user, w.amountout)
            );

            // Update timestamp-mapped struct
            w.payoutTxHash = txHash;
            w.payoutSetter = msg.sender;

            // Update the user's struct using the stored index
            Purchase storage userPurchase =
                purchasesByUser[w.user][w.termIndex];

            userPurchase.payoutTxHash = txHash;
            userPurchase.payoutSetter = msg.sender;

            // Emit event
            emit PayoutProcessed(
                ts,
                w.user,
                w.amountout,
                w.termIndex,
                txHash
            );
        }

        // Reset batch
        processTimeStampStart = 0;
        processTimeStampEnd = 0;

    }

    function correctPayoutTxHash(
        address user,
        uint32 termIndex,
        bytes32 newTxHash
    ) external onlyOwner {

        // Validate term index
        //require(termIndex < withdrawalsByUser[user].length, "Invalid term index");

        // Load the correct term record
        Purchase memory u = purchasesByUser[user][termIndex];

        // A payout must exist for this stage before correcting a hash
        require(u.amountout != 0, "Payout not yet computed");

        // Old hash must exist
        bytes32 old = u.payoutTxHash;
        require(old != bytes32(0), "Nothing to correct");

        // Apply correction
        u.payoutTxHash = newTxHash;
        u.payoutSetter = msg.sender;

        emit PayoutTxHashCorrected(user, old, newTxHash, msg.sender);
    }

    function getPurchase(uint256 timestamp) public {
        Purchase memory w = purchasesByTimestamp[timestamp];
        emit PurchaseTimestamp(w.timestamp, w.user, w.token, w.amountin, w.amountout);
    }

    function getPurchasesInRange(uint256 startTs, uint256 endTs) public {
        for (uint256 i = 0; i < purchaseTimestamps.length; i++) {
            uint256 ts = purchaseTimestamps[i];
            if (ts >= startTs && ts <= endTs) {
                Purchase memory w = purchasesByTimestamp[ts];
                emit PurchaseTimestamp(w.timestamp, w.user, w.token, w.amountin, w.amountout);
            }
        }
    }

    uint256[50] __gap;
}
