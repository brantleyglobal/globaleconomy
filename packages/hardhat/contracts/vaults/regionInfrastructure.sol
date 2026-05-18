// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../proxies/globalLedgerProxy.sol";
import "../currency/GBDx.sol";

contract RegionInfrastructure is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    GlobalLedgerProxy public ledgerProxy;
    GlobalDollarX public stakeablecoins;

    struct Deposit {
        uint256 timestamp;
        uint256 amountin;
        uint256 amountout; 
        address user;
        address token;
        address venture;
        bytes32 depositTxHash;
        bytes32 refundHash;
        bool refund;
    }

    struct Withdraw {
        address user;
        uint32 termIndex;
        uint8 stage;
    }

    struct User {
        address user;
        address ventureToken;
        address payToken;
        uint8 quartersCommitted;
        uint16 startQuarter;
        uint16 unlockQuarter;
        bool finalize;
        bool autoPay;
        uint256 timestamp;
        uint256 userDividendAmount;
        uint256 termTotalSupply;
        address[39] payoutSetter;
        uint256[39] amountout;
        bytes32[39] payoutTxHash;
    }

    struct UnlockD {
        uint16 unlockQuarter;
        uint256 poolBlalance;
        uint256 timestamp;
        address token;
    }

    struct RateRange {
        uint256 min;
        uint256 max;
    }

    struct DepositRef {
        address user;
        uint32 depositIndex;
    }

    address public payoutToken;
    address public payoutAddress;
    address public rtoken;
    address public feeRecipient;
    address[] public stablecoins;
    address[]  public stakeables;
    address[] public admins;
    address constant NATIVE_TOKEN = address(0);
    address constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    uint constant QUARTER_DAYS = 91;
    uint8 public constant TOTAL_TERMS = 8;
    // Add this state variable to track injected time
    uint16 public lastUpdatedTime;
    uint16 public updatedStartQuarter;
    uint256 public depositFeeBps;
    uint256 public totalWithdrawn;
    uint256 public processTimestamp;
    uint256[] public depositTimestamps;
    uint256[] public withdrawTimestamps;


    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(address => uint256) public tokenPoolBalances;
    mapping(address => uint256) public vaultSupply;
    mapping(address => uint8) public quartersCommitted;
    mapping(uint256 => DepositRef) public depositsByTimestamp;
    mapping(bytes32 => DepositRef) public depositsByHash;
    mapping(bytes32 => bool) public processedDeposits;
    mapping(uint256 => bool) public processedDepositsTs;
    mapping(address => uint256[]) public depositTimestampsByUser;
    mapping(bytes32 => Withdraw) public withdrawByHash;
    mapping(uint256 => Withdraw) public withdrawByTimestamp;
    mapping(address => User[]) public withdrawalsByUser;
    mapping(address => Deposit[]) public depositsByUser;
    mapping(uint16 => UnlockD) public poolByUnlockQuarter;
    mapping(address => uint256) public venturePoolRequirement;
    mapping(address => uint8) stablecoinIndex;
    mapping(uint8 => RateRange) public rateRange;
    mapping(address => mapping(uint32 => mapping(uint8 => uint256[22]))) stagePayouts;


    event Deposited(address indexed user, uint256 amountOut, uint256 amountIn, uint256 fee, uint32 committedQuarters);
    event DividendPaid(address indexed user, uint256 amount);
    event RedemptionPaid(address indexed user, uint256 amount);
    event RedemptionFulfilled(address indexed user, address indexed payoutToken, uint256 amount, uint256 tokenId);
    event CapitalSpent(address indexed recipient, uint256 amount, string reason);
    event AddressChecked(address dividendToken, address payoutToken, uint16 unlockQ);
    event StakeableAddress(address indexed addr);
    event UpdateFailed(address indexed addr, uint256 index, string reason);
    event PoolBalanceUpdated(address indexed token, uint256 newBalance);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    event Purge(address indexed token, uint256 amount);
    event WithdrawInRange( address indexed user, uint256 amountout, uint256[] stableOut, address payoutToken, uint32 termIndex, uint8 stage);
    event DepositInRange( uint256 timestamp, address indexed user, address token, address venture, uint256 amountin, uint256 amountout);
    event UserWithdraw( uint256 timestamp, address indexed user, uint8 quartersCommitted, uint16 unlockQuarter, uint256 amountout, uint32 termIndex, uint8 stage);
    event PayoutTxHashCorrected(address user, uint8 quarter, bytes32 old, bytes32 newTxHash, address payoutSetter);
    event UnexpectedPayoutTxHash(address indexed user,  uint16 unlockQuarter, bytes32 existingHash, address existingSetter, uint256 amount, address attemptedSetter);

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
    uint256 constant RATE_100000 = 90000000000000000000000;   // 90_000 * 1e18 (adjust if needed)
    uint256 constant RATE_16000 = 3000000000000000000000;   // 3_000 * 1e18 (adjust if needed)
    uint256 constant RATE_600 = 900000000000000000000;   // 900 * 1e18 (adjust if needed)

    // Events omitted for brevity...

    function initialize(
        address _owner,
        address[] memory initialStables,
        address[] memory initialStakeables,
        address[] memory adminList,
        address _payoutToken,
        address ledgerProxyAddress
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

        feeRecipient = _owner;
        depositFeeBps = 25;
        payoutToken = _payoutToken;
        ledgerProxy = GlobalLedgerProxy(ledgerProxyAddress);

       for (uint256 i = 0; i < initialStables.length; i++) {
            address sc = initialStables[i];
            //require(sc != address(0), "Zero address not allowed");

            stablecoinWhitelistMap[sc] = true;
            stablecoins.push(sc);

            // NEW: map stablecoin → index
            stablecoinIndex[sc] = uint8(i);
        }

        for (uint256 i = 0; i < initialStakeables.length; i++) {
            require(initialStakeables[i] != address(0), "Zero address not allowed");
            stakeableWhitelistMap[initialStakeables[i]] = true;
            stakeables.push(initialStakeables[i]);
        }

        // Initialize whitelist and store in map and array for iteration
        for (uint256 i = 0; i < adminList.length; i++) {
            address a = adminList[i];
            require(a != address(0), "Zero address not allowed");

            adminWhitelistMap[a] = true;
            admins.push(a);
        }

    }

    function setPayoutAddress(address newAddress) external onlyOwner {
        require(newAddress != address(0), "Invalid address");
        emit PayoutAddressUpdated(payoutAddress, newAddress);
        payoutAddress = newAddress;
    }

    function setDepositFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 5000, "Fee too high");
        depositFeeBps = newFeeBps;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Check token whitelist using map
    function _isWhitelisted(address token) internal view returns (bool) {
        return stablecoinWhitelistMap[token];
    }

    function _isWhitelistedx(address token) internal view returns (bool) {
        return stakeableWhitelistMap[token];
    }

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function calldates(address venture, uint16 _currentQuarter) public {
        // Unlock quarters already set, just update
        lastUpdatedTime = _currentQuarter;

        uint16 redemptionEnd = GlobalDollarX(venture).comingQuarter();

        if (_currentQuarter >= redemptionEnd) {
            GlobalDollarX(venture).supply(0);
        }

        try GlobalDollarX(venture).update(_currentQuarter) {
        } catch Error(string memory reason) {
            emit UpdateFailed(venture, 0, reason);
        } catch {
            emit UpdateFailed(venture, 0, "Unknown error");
        }
    }

    // Deposit with reentrancy guard
    function deposit(
        uint256 timeStamp,
        address user,
        address token,
        address venture,
        uint256 amount,
        uint16 currentQuarter,
        uint256 incomingRate,
        bytes32 depositHash 
    ) external payable nonReentrant {

        if (token == address(0)) {
            uint8 gracePeriod = GlobalDollarX(venture).gracePeriod();
            uint8 committedQuarters = GlobalDollarX(venture).committedQuarters();
            uint16 unlockQuarter = GlobalDollarX(venture).unlockQuarter();

            require(lastUpdatedTime < (unlockQuarter - committedQuarters) + gracePeriod, "Deposit outside grace period");
            require(!processedDeposits[depositHash], "Duplicate Hash");
            processedDeposits[depositHash] = true;
            require(!processedDepositsTs[timeStamp], "Duplicate Timestamp");
            processedDepositsTs[timeStamp] = true;

            uint256 nativeAmount = msg.value;
            
            // Calculate total payment, fee, and net amount
            uint256 fee = 0;

            // Phase 1: Check 15 day window first
            GlobalDollarX(venture).mint(user, nativeAmount);
            uint256 tokenSupply = GlobalDollarX(venture).viewSupply();
            uint256 supply = (tokenSupply + nativeAmount);
            GlobalDollarX(venture).supply(supply);

            uint256 ts = timeStamp;

            depositsByUser[user].push();
            uint32 termIndex = uint32(depositsByUser[user].length - 1);
            Deposit storage d = depositsByUser[user][termIndex];

            d.timestamp = ts;
            d.amountin = nativeAmount;
            d.amountout = nativeAmount;
            d.user = msg.sender;
            d.token = token;
            d.venture = venture;
            d.depositTxHash = depositHash;

            depositTimestamps.push(ts);

            depositsByTimestamp[ts] = DepositRef({ user: user, depositIndex: termIndex });
            depositsByHash[depositHash] = DepositRef({ user: user, depositIndex: termIndex });

            ledgerProxy.recordVentureDeposit(user, token, ts,  nativeAmount, amount, incomingRate, depositHash);

            emit Deposited(user, nativeAmount, nativeAmount, fee, committedQuarters);

        } else {

            require(_isWhitelisted(token), "Token not whitelisted");
            require (_isAdmin(msg.sender), "Permission Denied");

            calldates(venture, currentQuarter);

            uint8 gracePeriod = GlobalDollarX(venture).gracePeriod();
            uint8 committedQuarters = GlobalDollarX(venture).committedQuarters();
            uint16 unlockQuarter = GlobalDollarX(venture).unlockQuarter();

            require(currentQuarter < (unlockQuarter - committedQuarters) + gracePeriod, "Deposit outside grace period");

            uint256 fee = (amount * (depositFeeBps)) / 10000;
            uint256 baseAmount = (amount * incomingRate) / 1e18;
            uint256 netAmount = baseAmount - fee;
            uint256 gbdAmountout = amount - fee;

            uint8 i = stablecoinIndex[token];
            RateRange memory r = rateRange[i];

            uint256 minRate = (((netAmount * DECIMALS) / GBDr) * r.min) / DECIMALS;
            uint256 maxRate = (((netAmount * DECIMALS) / GBDr) * r.max) / DECIMALS;

            if (netAmount < minRate || netAmount > maxRate) {
                gbdAmountout = minRate;
            }
            // Phase 1: Check 15 day window first
            GlobalDollarX(venture).mint(user, gbdAmountout);
            uint256 tokenSupply = GlobalDollarX(venture).viewSupply();
            uint256 supply = (tokenSupply + gbdAmountout);
            GlobalDollarX(venture).supply(supply);

            uint256 ts = timeStamp;

            depositsByUser[user].push();
            uint32 termIndex = uint32(depositsByUser[user].length - 1);
            Deposit storage d = depositsByUser[user][termIndex];

            d.timestamp = ts;
            d.amountin = amount;
            d.amountout = gbdAmountout;
            d.user = msg.sender;
            d.token = token;
            d.venture = venture;
            d.depositTxHash = depositHash;

            depositTimestamps.push(ts);

            depositsByTimestamp[ts] = DepositRef({ user: user, depositIndex: termIndex });
            depositsByHash[depositHash] = DepositRef({ user: user, depositIndex: termIndex });

            uint256 nativeAmount = 0;
            uint256 stableAmount = 0;
            if (token == address(0)) {
                nativeAmount = amount;
            } else {
                stableAmount = amount;
            }

            ledgerProxy.recordVentureDeposit(user, token, ts,  nativeAmount, stableAmount, incomingRate, depositHash); //RETURN STABLE AND ASSOCIATED AMOUNTS

            emit Deposited(user, gbdAmountout, amount, fee, committedQuarters);
        }
    }

    function computeQuarterData(
        address dividendToken,
        uint16 currentQuarter
    )
        internal
        view
        returns (
            uint16 startQuarter,
            uint16 unlockQuarter,
            uint8 committedQuarters,
            uint8 stageCheck
        )
    {

        unlockQuarter = GlobalDollarX(dividendToken).unlockQuarter();
        committedQuarters   = GlobalDollarX(dividendToken).committedQuarters();
        startQuarter = unlockQuarter - committedQuarters;
        uint16 milestoneQuarter = unlockQuarter - 4;

        // -----------------------------
        // 2. Compute stageCheck
        // -----------------------------

        if ((currentQuarter - (milestoneQuarter - 1)) >= 1 && (currentQuarter < (unlockQuarter - 1))) {
            stageCheck = 1;
        } else if ((currentQuarter - unlockQuarter) >= 1) {
            stageCheck = uint8((currentQuarter - (unlockQuarter - 1)) + 1);
        }
    }

    function _processInitialWithdraw(
        address dividendToken,
        address payToken,
        uint16 currentQuarter,
        uint256 holderBalance,
        uint256 timeStamp
    ) internal {
        
        // --- Quarter Data ---
        (uint16 startQuarter, uint16 unlockQuarter, uint8 committedQuarters, uint8 stageCheck) = computeQuarterData(dividendToken, currentQuarter);

        require(stageCheck >= 1, "Quarter has not lapsed or unlock quarter not reached");

        IERC20(dividendToken).safeTransferFrom(msg.sender, address(this), holderBalance);

        uint8 totalPayoutStages = GlobalDollarX(dividendToken).redeemPeriod(); 
        uint16 milestoneQuarter = startQuarter - 4;
        uint256 totalSupply = 0;
        if (currentQuarter >= milestoneQuarter) {
            totalSupply = GlobalDollarX(dividendToken).viewSupply();
        }

        uint256 ts = timeStamp;
        // Allocate a new struct slot
        withdrawalsByUser[msg.sender].push();

        // Now get the index of the new struct
        uint32 termIndex = uint32(withdrawalsByUser[msg.sender].length - 1);

        User storage u = withdrawalsByUser[msg.sender][termIndex];

        u.user = msg.sender;
        u.ventureToken = dividendToken;
        u.payToken = payToken;
        u.quartersCommitted = committedQuarters;
        u.startQuarter = startQuarter;
        u.unlockQuarter = unlockQuarter;
        u.userDividendAmount = holderBalance;
        u.termTotalSupply = totalSupply;
        u.finalize = false;

        uint256 payout = 0;
        uint256 principalSlice = 0;
        uint8 stage = 0;  // stage = 0
        // includes milestone
        
        if (stageCheck >= 1) {
            for (stage = 0; stage < stageCheck; stage++) {

                if (u.finalize) revert("All payouts completed");

                // Skip if already paid
                if (u.amountout[stage] != 0) continue;

                // Skip if supply not ready
                if (u.termTotalSupply == 0) continue;

                (payout, principalSlice) = _computePayout(u);
                u.amountout[stage] = payout;

                if (stage + 1 == totalPayoutStages) {
                    u.finalize = true;
                }

                ts = timeStamp + stage;

                withdrawByTimestamp[ts] = Withdraw(
                    msg.sender,
                    termIndex,
                    stage
                );

                withdrawTimestamps.push(ts);

                // --- Ledger Logic ---//

                (uint256[22] memory amountOut) = ledgerProxy.ventureWithdraw(msg.sender, address(0), u.ventureToken, payout, principalSlice, ts);

                stagePayouts[u.user][termIndex][stage] = amountOut;

                emit UserWithdraw(ts, msg.sender, committedQuarters, unlockQuarter, payout, termIndex, stage);
            }
        } else {
            revert("Payout for not available or payout has been processed");
        }
    }

    function _findEligibleTerm(address user, uint16 currentQuarter)
        internal
        view
        returns (uint32)   // <-- return uint16 instead of uint256
    {
        User[] memory terms = withdrawalsByUser[user];

        uint256 len = terms.length;

        for (uint256 i = len; i-- > 0;) {
            User memory u = terms[i];
            
            // Skip struct has been finalized
            if (u.finalize) continue;

            // Skip if before start window
            if (currentQuarter < u.startQuarter) continue;

            uint8 stage = uint8(currentQuarter - u.startQuarter);

            if (stage >= 1 && stage <= u.quartersCommitted) {
                
                uint8 payoutIndex = stage - 1; // Convert to 0-based index

                if (u.amountout[payoutIndex] == 0) {
                    return uint32(i);
                }
            }
        }

        revert("No eligible unpaid term found");
    }

    function _computePayout(
        User storage u
    )
        internal
        view
        returns (
            uint256 payout, uint256 principalSlice
        )
    {
        uint8 redeemPeriod = GlobalDollarX(u.ventureToken).redeemPeriod();

        uint256 rate = GlobalDollarX(u.ventureToken).annualRate(); // 5% simple interest per quarter after milestone (adjust as needed)
        uint256 quarterlyRate = rate / 4;

        uint256 principal = u.userDividendAmount;

        // --- Quarterly payout with principal + interest ---
        principalSlice = principal / redeemPeriod;
        uint256 interestSlice  = ((principal * quarterlyRate) / 10000);

        payout = (principalSlice + interestSlice);

        return (payout, principalSlice);
    }

    function _processPayout(
        address user,
        uint16 currentQuarter,
        uint256 timeStamp
    ) internal {

        uint32 termIndex = _findEligibleTerm(user, currentQuarter);
        uint256 ts = block.timestamp;

        User storage u = withdrawalsByUser[user][termIndex];

        (, uint16 unlockQuarter, uint8 committedQuarters, uint8 stageCheck) = computeQuarterData(u.ventureToken, currentQuarter);

        require(u.user != address(0), "No prior withdrawal found");
        if (u.finalize) revert("All payouts completed");

        uint8 totalPayoutStages = GlobalDollarX(u.ventureToken).redeemPeriod(); // --- Includes the Milestone Quarter

        // --- Determine last completed stage ---
        uint8 nextStage = totalPayoutStages;
        for (uint8 i = 0; i < totalPayoutStages; i++) {
            if (u.amountout[i] == 0) {
                nextStage = i;
                break;
            }
        }
        require(nextStage < totalPayoutStages, "All payouts completed");

        // --- Compute payout (ignore returned stage) ---

        uint8 stage = 0;
        uint256 payout = 0;
        uint256 principalSlice = 0;

        require(nextStage < stageCheck, "Next stage not unlocked yet");

        if (stageCheck >= 1) {
            for (stage = nextStage; stage < stageCheck; stage++) {
                if (u.finalize) revert("All payouts completed");

                // Skip if already paid
                if (u.amountout[stage] != 0) continue;

                // Skip if supply not ready
                if (u.termTotalSupply == 0) continue;

                (payout, principalSlice) = _computePayout(u);
                u.amountout[stage] = payout;

                if (stage + 1 == totalPayoutStages) {
                    u.finalize = true;
                }

                ts = timeStamp + stage;

                withdrawByTimestamp[ts] = Withdraw(
                    msg.sender,
                    termIndex,
                    stage
                );

                withdrawTimestamps.push(ts);

                // --- Ledger Logic --- //
                (uint256[22] memory amountOut) = ledgerProxy.ventureWithdraw(msg.sender, address(0), u.ventureToken, payout, principalSlice, ts);

                stagePayouts[u.user][termIndex][stage] = amountOut;

                emit UserWithdraw(ts, msg.sender, committedQuarters, unlockQuarter, payout, termIndex, stage);
            }
        } else {
            revert("Payout for not available or payout has been processed");
        }
    }

    function withdraw(
        address ventureToken,
        address payToken,
        uint256 holderBalance,
        uint256 timeStamp
    ) external payable nonReentrant {

        if (holderBalance != 0) {
            _processInitialWithdraw(ventureToken, payToken, lastUpdatedTime, holderBalance, timeStamp);
        } else {
            _processPayout(msg.sender, lastUpdatedTime, timeStamp);
        }
    }

    function withdrawAdmin(
        address user,
        address venture,
        uint16 injectedTime,
        uint256 timeStamp
    ) external payable onlyOwner {
        calldates(venture, injectedTime);

        _processPayout(user, injectedTime, timeStamp);
    }

    function getEcoSupply(address token) public view returns (uint256){
        uint256 totalSupply = 0;
        for (uint256 i = 0; i < stakeables.length; i++) {
            if (stakeables[i] == token) {
                GlobalDollarX instance = GlobalDollarX(stakeables[i]);
                uint256 supply = instance.viewSupply();
                totalSupply += supply;
            }
        }
        return totalSupply;
    }

    function computeGlobalPool(address venture, uint16 currentQuarter)
        external
        onlyOwner
    {
        calldates(venture, currentQuarter);

        uint8 term = GlobalDollarX(venture).redeemPeriod();
        uint256 annualRate = GlobalDollarX(venture).annualRate();
        uint256 principal = GlobalDollarX(venture).totalSupply();
        uint256 quarterlyRate = annualRate / 4;

        require(principal > 0 && term > 0 && annualRate > 0, "Venture not initialized");

        // --- Amortized quarterly payment ---
        uint256 principalSlice = principal / term;
        uint256 interestSlice  = ((principal * quarterlyRate) / 10000);

        uint256 poolRequirement = (principalSlice + interestSlice);

        venturePoolRequirement[venture] = poolRequirement;
    }

    function getPoolRequirement(address venture) external view returns (uint256) {
        return venturePoolRequirement[venture];
    }

    function addToDividendPools(
        address venture,
        uint256 poolAmount,
        uint16 currentQuarter,
        uint256 timeStamp,
        bytes32 depositHash
    ) external onlyOwner nonReentrant {

        calldates(venture, currentQuarter);

        for (uint256 i = 0; i < stakeables.length; i++) {
            address token = stakeables[i];

            // Compute the required payout range for THIS token
            uint256 poolRequirement = venturePoolRequirement[token];

            // Ensure the poolAmount is valid for this token
            require(poolAmount <= poolRequirement, "Pool amount out of range");

            // Add the minimum required pool to this token’s pool balance
            tokenPoolBalances[token] += poolRequirement;

            ledgerProxy.recordVenturePoolDeposit(payoutToken, address(this), timeStamp, poolRequirement, depositHash);

            emit PoolBalanceUpdated(token, tokenPoolBalances[token]);
        }
    }

    // ==================================================================
    // Possible for future payouts in Platform Currency **Needs Updating
    // ==================================================================

    /*function batchWithdraw() external onlyOwner {
        require(payoutAddress != address(0), "Payout address not set");
        for (uint256 i = 0; i < stablecoins.length; i++) {
            address token = stablecoins[i];
            if (!stablecoinWhitelistMap[token]) continue;
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance > 0) {
                //IERC20(token).safeTransfer(payoutAddress, tokenBalance);
                totalWithdrawn += tokenBalance;
                emit FundsWithdrawn(token, payoutAddress, tokenBalance);
            }
        }
    }*/

    function getUserTermCount(address user) external view returns (uint256) {
        return withdrawalsByUser[user].length;
    }

    function getUserTerm(address user, uint32 index)
        external
        view
        returns (User memory)
    {
        return withdrawalsByUser[user][index];
    }

    function getUserWithdrawals(address user)
        external
        view
        returns (User[] memory)
    {
        return withdrawalsByUser[user];
    }

    function getUserDepositCount(address user) external view returns (uint256) {
        return depositTimestampsByUser[user].length;
    }

    function getUserDeposit(address user)
        external
        view
        returns (Deposit[] memory)
    {
        return depositsByUser[user];
    }

    function changePayoutToken(address newToken) external {
        uint256 len = withdrawalsByUser[msg.sender].length;
        require(len > 0, "No withdrawals found");

        // Get the most recent withdrawal entry
        User storage u = withdrawalsByUser[msg.sender][len - 1];

        // Only the current payout address can change it
        require(msg.sender == u.user, "Not authorized");

        u.payToken = newToken;
    }

    function changePayoutAddress(address user) external {

        uint256 term = withdrawalsByUser[user].length;
        User storage u = withdrawalsByUser[user][term];
        if (msg.sender == u.user) {
            u.user = user;
        }
    }

    function autoPay(address user) external {

        uint256 term = withdrawalsByUser[user].length;
        User storage u = withdrawalsByUser[user][term];

        u.autoPay = true;
    }

    function updatePayoutTxHash(
        address user,
        bytes32 newTxHash,
        bytes32 refundHash
    ) external {

        require (_isAdmin(msg.sender), "Permission Denied");

        // At least one of the supplied hashes must be non-zero
        if (newTxHash == bytes32(0) && refundHash == bytes32(0)) {
            revert("No Hash Included In The Transaction Call");
        }

        // Old hash must exist
        bytes32 old;
        bytes32 newHash;

        if (newTxHash != bytes32(0)) {

            require(!processedDeposits[newTxHash], "Duplicate Hash");
            processedDeposits[newTxHash] = true;

            Withdraw memory wr = withdrawByHash[newTxHash];
            User storage u = withdrawalsByUser[wr.user][wr.termIndex];

            uint8 stage = wr.stage;

            require(!u.finalize, "All payouts completed");
            require(stage <= u.quartersCommitted, "Stage exceeds committed quarters");
            require(stage < 40, "Stage out of range");

            // Must have a payout computed
            uint256 payout = u.amountout[stage];
            require(payout != 0, "Payout not yet computed");

            // Prevent overwriting
            if (u.payoutTxHash[stage] != bytes32(0)) {
                emit UnexpectedPayoutTxHash(
                    user,
                    u.unlockQuarter,
                    u.payoutTxHash[stage],
                    u.payoutSetter[stage],
                    payout,
                    msg.sender
                );
                return;
            }

            // Record tx hash
            u.payoutTxHash[stage] = newTxHash;
            u.payoutSetter[stage] = msg.sender;

            
        }  else if (refundHash != bytes32(0)) {

            DepositRef memory r = depositsByHash[refundHash];
            Deposit storage d = depositsByUser[r.user][r.depositIndex];

            old = d.refundHash;
            newHash = refundHash;

            // Apply correction
            d.depositTxHash = refundHash;

            emit PayoutTxHashCorrected(user, 0, old, newHash, msg.sender);
            
        } else {
            revert("Invalid Parameters");
        }
    }

    function correctPayoutTxHash(
        address user,
        bytes32 newTxHash,
        bytes32 refundHash
    ) external {

        require (_isAdmin(msg.sender), "Permission Denied");

        // Validate term index
        //require(termIndex < withdrawalsByUser[user].length, "Invalid term index");
        // Old hash must exist
        bytes32 old;
        bytes32 newHash;

        if (newTxHash != bytes32(0)) {
            // Load the correct term record
            Withdraw memory wr = withdrawByHash[newTxHash];
            User storage u = withdrawalsByUser[wr.user][wr.termIndex];
            uint8 stage = wr.stage;

            // No corrections allowed after final payout
            require(!u.finalize, "All payouts completed");

            // Stage must be within committed quarters
            require(stage <= u.quartersCommitted, "Stage exceeds committed quarters");

            // Stage must be within array bounds (0–39)
            require(stage < 40, "Stage out of range");

            // A payout must exist for this stage before correcting a hash
            require(u.amountout[stage] != 0, "Payout not yet computed");
            require(!processedDeposits[newTxHash], "Duplicate Hash");
            processedDeposits[newTxHash] = true;    

            old = u.payoutTxHash[stage];
            newHash = newTxHash;

            // Apply correction
            u.payoutTxHash[wr.stage] = newTxHash;
            u.payoutSetter[wr.stage] = msg.sender;

        } else if (refundHash != bytes32(0)) {

            DepositRef memory r = depositsByHash[refundHash];
            Deposit storage d = depositsByUser[r.user][r.depositIndex];

            old = d.refundHash;
            newHash = refundHash;

            // Apply correction
            d.refundHash = refundHash;
        } else {
            revert("Invalid Parameters");
        }

        emit PayoutTxHashCorrected(user, 0, old, newHash, msg.sender);
    }

    function getDepositsInRange(uint256 startTs, uint256 endTs) public {

        if (!_isAdmin(msg.sender)) {

            for (uint256 i = 0; i < depositTimestamps.length; i++) {
                uint256 ts = depositTimestamps[i];
                if (ts >= startTs && ts <= endTs) {
                    DepositRef memory r = depositsByTimestamp[ts];
                    Deposit memory w = depositsByUser[r.user][r.depositIndex];
                    emit DepositInRange(w.timestamp, w.user, w.token, w.venture, w.amountin, w.amountout);
                }
            }

        } else {

            require (_isAdmin(msg.sender), "Permission Denied");

            for (uint256 i = 0; i < depositTimestamps.length; i++) {
                uint256 ts = depositTimestamps[i];
                if (ts >= startTs && ts <= endTs) {
                    DepositRef memory r = depositsByTimestamp[ts];
                    Deposit memory w = depositsByUser[r.user][r.depositIndex];
                    emit DepositInRange(w.timestamp, w.user, w.token, w.venture, w.amountin, w.amountout);
                }
            }
        }
    }

    function getWithdrawInRange(uint256 startTs, uint256 endTs, bool process) public {
        if (process) {
            require(msg.sender == owner(), "Permission Denied");

            uint256 oneMonth = 28 days;
            if (endTs - processTimestamp < oneMonth) {
                revert("Withdrawal Process Time Gap Has Not Elapsed");
            }

            _emitWithdrawRange(processTimestamp, endTs);
            processTimestamp = endTs;
        } else {
            require(_isAdmin(msg.sender), "Permission Denied");
            _emitWithdrawRange(startTs, endTs);
        }
    }

    function _emitWithdrawRange(uint256 startTs, uint256 endTs) internal {
        uint256 len = withdrawTimestamps.length;

        for (uint256 i = 0; i < len; ++i) {
            uint256 ts = withdrawTimestamps[i];
            if (ts < startTs || ts > endTs) continue;

            Withdraw storage r = withdrawByTimestamp[ts];
            User storage w = withdrawalsByUser[r.user][r.termIndex];

            uint256[22] storage src = stagePayouts[r.user][r.termIndex][r.stage];
            uint256[] memory sp = new uint256[](22);

            for (uint8 j = 0; j < 22; ++j) {
                sp[j] = src[j];
            }

            emit WithdrawInRange(
                w.user,
                w.amountout[r.stage],
                sp,
                w.payToken,
                r.termIndex,
                r.stage
            );
        }
    }

    function addAdmin (address admin) external onlyOwner {
        admins.push(admin);
    }

    function removeAdmin (address admin) external onlyOwner {
        for (uint i = 0; i < admins.length; i++) {
            if (admins[i] == admin) {
                admins[i] = admins[admins.length - 1];
                admins.pop();
                break;
            }
        }
    }

    uint256[50] __gap;
}
