// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../libraries/dateTimeLibrary.sol";
import "../interfaces/IGlobalLedger.sol";
import "../regional/globe.sol";

contract RegionInfrastructure is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    using DateTimeLibrary for uint256;

    IGlobalLedger public ledgerProxy;
    Globe public stakeablecoins;

    struct Deposit {
        uint256 timestamp;
        uint256 amountin;
        uint256 amountout;
        uint256 rate; 
        address user;
        address token;
        address venture;
        bytes32 depositTxHash;
        bytes32 refundHash;
        bool refund;
    }

    struct Withdraw {
        address user;
        uint256 termIndex;
        uint256 stage;
    }

    struct User {
        address user;
        address ventureToken;
        address[39] payToken;
        uint256 quartersCommitted;
        uint256 startQuarter;
        uint256 unlockQuarter;
        uint256 redemptionPeriod;
        uint256 stage;
        bool autoPay;
        uint256 timestamp;
        uint256 userDividendAmount;
        uint256 termTotalSupply;
        address[39] payoutSetter;
        uint256[39] principalSlice;
        uint256[39] amountout;
        bytes32[39] payoutTxHash;
    }

    struct UnlockD {
        uint256 unlockQuarter;
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
        uint256 depositIndex;
    }

     struct WithdrawInit {
        address user;
        address venture;
        address payToken;
        uint256 currentQuarter;
        uint256 timeStamp;
    }

    struct WithdrawHandle {
        address payToken;
        uint256 stageCheck;
        uint256 termIndex;
        uint256 timeStamp;
    }

    error NotAuthorized();
    error InsufficientFunds();
    error SpendNotApproved();
    error PoolNotCalculated();
    error FeeOutofBounds();
    error InvalidAddress(address addressSupplied);
    error MintFailed();
    error UnapprovedToken(address token);
    error NoEligibleQuarter();
    error HashDuplicated();
    error InvalidHash(bytes32 input);
    error PayoutStageOutofBounds();
    error InvalidPoolAmount(uint256 inputAmount, uint256 poolRequirement);
    error NoEligibleTerms();
    error VentureDeadLineClosed();
    error TimestampDuplicated();
    error InvalidRedemptionPeriod();
    error VentureNotInitialized();

    address public payoutToken;
    address public payoutAddress;
    address public rtoken;
    address private feeRecipient;
    address[]  public stables;
    address[]  public stakeables;
    address[]  private admins;
    address[]  private autopay;
    address constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    bool private initiate;
    
    // Add this state variable to track injected time
    uint256 public lastUpdatedTime;
    uint256 public updatedStartQuarter;
    uint256 public depositFeeBps;
    uint256 private totalWithdrawn;
    uint256 public processDepositTimestamp;
    uint256 public processWithdrawTimestamp;
    uint256[] public depositTimestamps;
    uint256[] public withdrawTimestamps;

    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(address => bool) private autopayWhitelistMap;
    mapping(address => uint256) public tokenPoolBalances;
    mapping(address => uint256) public vaultSupply;
    mapping(address => uint256) public quartersCommitted;
    mapping(uint256 => DepositRef) public depositsByTimestamp;
    mapping(bytes32 => DepositRef) public depositsByHash;
    mapping(bytes32 => bool) public processedDeposits;
    mapping(uint256 => bool) public processedDepositsTs;
    mapping(address => uint256[]) public depositTimestampsByUser;
    mapping(bytes32 => Withdraw) public withdrawByHash;
    mapping(uint256 => Withdraw) public withdrawByTimestamp;
    mapping(address => User[]) public withdrawalsByUser;
    mapping(address => Deposit[]) public depositsByUser;
    mapping(uint256 => UnlockD) public poolByUnlockQuarter;
    mapping(address => uint256) private venturePoolRequirement;
    mapping(address => uint256) stablecoinIndex;
    mapping(address => uint256) stakeablecoinIndex;
    mapping(address => uint256) adminIndex;
    mapping(address => uint256) autopayIndex;
    mapping(uint256 => RateRange) public rateRange;
    mapping(address => mapping(uint256 => mapping(uint256 => uint256[]))) stagePayouts;


    event Deposited(address indexed user, uint256 amountOut, uint256 amountIn, uint256 fee, uint256 committedQuarters);
    event DividendPaid(address indexed user, uint256 amount);
    event PoolBalanceUpdated(address indexed token, uint256 newBalance);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event WithdrawInRange(
        address indexed user,
        uint256 amountout,
        uint256[] stableOut,
        address payoutToken,
        uint256 termIndex,
        uint256 stage
    );
    event DepositInRange(
        uint256 timestamp,
        address indexed user,
        address token,
        address venture,
        uint256 amountin,
        uint256 amountout
    );
    event UserWithdraw(
        uint256 timestamp,
        address indexed user,
        uint256 quartersCommitted,
        uint256 unlockQuarter,
        uint256 amountout,
        uint256 termIndex,
        uint256 stage
    );
    event PayoutTxHashCorrected(address user, uint256 quarter, bytes32 old, bytes32 newTxHash, address payoutSetter);

    uint256 constant DECIMALS = 1e18;
    uint256 constant GBDr = 1050000000000000000;
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
        initiate = false;
        ledgerProxy = IGlobalLedger(ledgerProxyAddress);
    }

    function setPayoutAddress(address newAddress) external onlyOwner {
        if(newAddress == address(0)) revert InvalidAddress(newAddress);
        emit PayoutAddressUpdated(payoutAddress, newAddress);
        payoutAddress = newAddress;
    }

    function setDepositFee(uint256 newFeeBps) external onlyOwner {
        if(newFeeBps > 5000) revert FeeOutofBounds();
        depositFeeBps = newFeeBps;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if(newRecipient == address(0)) revert InvalidAddress(newRecipient);
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

    function calldates(address venture, uint256 _currentQuarter) public {
        if(!_isAdmin(msg.sender)) revert NotAuthorized();
        // Unlock quarters already set, just update
        lastUpdatedTime = _currentQuarter;

        uint256 redemptionEnd = Globe(venture).comingQuarter();

        if (_currentQuarter >= redemptionEnd) {
            Globe(venture).supply(0);
        }

        if (!initiate) {
            Globe(venture).update(_currentQuarter);
            if (redemptionEnd != 0) {initiate = true;}
        }
    }

    function _getCurrentQuarter(uint256 ts) internal pure returns(uint256 cQ) {
        (uint256 year, uint256 key,) = ts.timestampToDate();

        uint256 quarter = 0;
        unchecked {
            quarter = (key - 1) / 3;
            cQ = year * 4 + quarter;
        }
    }

    // -----------------------------
    // DEPOSIT INITIATION
    // -----------------------------

    function deposit(
        uint256 timeStamp,
        address user,
        address token,
        address venture,
        uint256 amount,
        uint256 incomingRate,
        bytes32 depositHash 
    ) external payable nonReentrant {

        uint256 fee = 0;
        uint256 amountIn = 0;
        uint256 amountOut = 0;

        Globe ventureContract = Globe(venture);

        // Data mapping (Historical tracking alignment)
        uint256 depositQuarter = _getCurrentQuarter(timeStamp); 
        
        // Window parameters
        uint256 unlockQuarter = ventureContract.unlockQuarter();
        uint256 committedQuarters = ventureContract.committedQuarters();
        uint256 gracePeriod = ventureContract.gracePeriod();

        uint256 deadlineThreshold;
        unchecked {
            deadlineThreshold = (unlockQuarter - committedQuarters) + gracePeriod;
        }

        // Applies uniformly to both forks
        // (Replace 'lastUpdatedTime' with whatever trusted state tracking variable your system maintains)
        if(lastUpdatedTime > deadlineThreshold) revert VentureDeadLineClosed();

        // Replay Protection Gate
        if(processedDepositsTs[timeStamp]) revert TimestampDuplicated();
        processedDepositsTs[timeStamp] = true;

        if (token == address(0)) {
            amountIn = msg.value;
            amountOut = msg.value;        
        } else {
            if(!_isWhitelisted(token)) revert UnapprovedToken(token);
            if(!_isAdmin(msg.sender)) revert NotAuthorized();
            
            if (depositHash != bytes32(0)){
                if(!processedDeposits[depositHash]) revert HashDuplicated();
                processedDeposits[depositHash] = true;
            }

            // Uses the computed historical data quarter safely for ledger adjustments
            calldates(venture, depositQuarter);

            // Rate Range Validation Layout Caching
            uint256 rateRangeIndex = stablecoinIndex[token];
            RateRange memory r = rateRange[rateRangeIndex];
            uint256 decimalsCached = DECIMALS;
            uint256 gbdrCached = GBDr;

            fee = (amount * depositFeeBps) / 10000;
            uint256 baseAmount = (amount * incomingRate) / 1e18;
            uint256 netAmount = baseAmount - fee;
            
            amountIn = amount;
            amountOut = amount - fee;

            uint256 minRate = (((netAmount * decimalsCached) * r.min) / gbdrCached) / decimalsCached;
            uint256 maxRate = (((netAmount * decimalsCached) * r.max) / gbdrCached) / decimalsCached;

            if (netAmount < minRate || netAmount > maxRate) {
                amountOut = minRate;
            }
        }

        // Core Contract State Executions
        ventureContract.mint(user, amountOut);
        
        // Check if internal ERC20 tracking overrides this setup
        uint256 supply = ventureContract.viewSupply() + amountOut;
        ventureContract.supply(supply);

        // Optimal Storage Allocation Push Pattern
        Deposit storage d = depositsByUser[user].push();
        uint256 termIndex;
        unchecked { termIndex = depositsByUser[user].length - 1; }

        d.timestamp = timeStamp;
        d.amountin = amountIn;
        d.amountout = amountOut;
        d.rate = incomingRate;
        d.user = user;
        d.token = token;
        d.venture = venture;
        d.depositTxHash = depositHash;

        depositTimestamps.push(timeStamp);

        DepositRef memory ref = DepositRef({ user: user, depositIndex: termIndex });
        depositsByTimestamp[timeStamp] = ref;
        depositsByHash[depositHash] = ref;

        _recordDeposit(d);

        emit Deposited(user, amountOut, amountIn, fee, committedQuarters);
    }

    
    function _recordDeposit(Deposit storage d) internal {

        IGlobalLedger.LedgerDepositHandle memory depositData = IGlobalLedger.LedgerDepositHandle({
            user: d.user,
            token: d.token,
            asset: d.venture,
            timeStamp: d.timestamp, 
            nativeAmount: d.amountout,
            stableAmount: d.amountin,
            exchangeRate: d.rate,
            depositHash: d.depositTxHash
        });

        ledgerProxy.recordVentureDeposit(
            depositData
        );
    }

    // -----------------------------
    // WITHDRAW INITATIONS
    // -----------------------------

    function withdraw(
        address venture,
        address payToken,
        uint256 holderBalance,
        uint256 timeStamp
    ) external payable nonReentrant {
        
        uint256 allowance = IERC20(venture).allowance(msg.sender, address(this));
        if(allowance < holderBalance) revert InsufficientFunds();

        uint256 startQuarter = Globe(venture).startQuarter();
        uint256 milestoneQuarter = startQuarter - 4;
        uint256 totalSupply = 0;
        if (lastUpdatedTime >= milestoneQuarter) {
            totalSupply = Globe(venture).viewSupply();
        } else {
            revert NoEligibleQuarter();
        }

        if (holderBalance != 0) {

            // Allocate a new struct slot
            withdrawalsByUser[msg.sender].push();

            // Get the index of the new struct
            uint256 termIndex = withdrawalsByUser[msg.sender].length - 1;

            User storage u = withdrawalsByUser[msg.sender][termIndex];

            {
                u.user = msg.sender;
                u.ventureToken = venture;
                u.quartersCommitted = Globe(venture).committedQuarters();
                u.startQuarter = startQuarter;
                u.unlockQuarter = Globe(venture).unlockQuarter();
                u.redemptionPeriod = Globe(venture).redeemPeriod();
                u.userDividendAmount = holderBalance;
                u.termTotalSupply = totalSupply;
                u.stage = 0;

            }

            _processPayout(
                WithdrawInit({
                    user: msg.sender,
                    venture: venture,
                    payToken: payToken,
                    currentQuarter: lastUpdatedTime,
                    timeStamp: timeStamp
                })
            ); 

            IERC20(venture).safeTransferFrom(msg.sender, address(this), u.userDividendAmount);

        } else {
            _processPayout(
                WithdrawInit({
                    user: msg.sender,
                    venture: venture,
                    payToken: payToken,
                    currentQuarter: lastUpdatedTime,
                    timeStamp: timeStamp
                })
            ); 
        }
    }

    function withdrawAdmin(
        address user,
        uint256 ts
    ) external payable onlyOwner {
        //calldates(venture, injectedTime);

        uint256 currentQuarter = _getCurrentQuarter(ts);

        _processPayout(
            WithdrawInit({
                user: user,
                venture: address(0),
                payToken: address(0),
                currentQuarter: currentQuarter,
                timeStamp: ts
            })
        ); 
    }

    // -----------------------------
    // PROCESS PAYOUT
    // -----------------------------

    function _processPayout(WithdrawInit memory init)
        internal
        returns (uint256)
    {
        User[] storage terms = withdrawalsByUser[init.user];
        uint256 len = terms.length;
        
        // Cache variables to stack to avoid reading 'init' fields inside the loop
        uint256 currentQuarterCached = init.currentQuarter;
        address payTokenCached = init.payToken;
        uint256 timeStampCached = init.timeStamp;

        uint256 allocationSize = len > 100 ? len - 100 : 0; 

        for (uint256 i = len; i > allocationSize; i--) {
            User storage u = terms[i];

            // Combine structural gates to save multiple SLOAD operations
            address uUser = u.user;
            uint256 uStage = u.stage;
            if (uUser == address(0) || ((uStage + 1) > u.redemptionPeriod)) {
                continue;
            }

            // Early Window Exit
            uint256 uStartQuarter = u.startQuarter;
            if (currentQuarterCached < uStartQuarter) {
                continue;
            }

            uint256 stageCheck;
            unchecked { stageCheck = currentQuarterCached - uStartQuarter; }

            // Evaluate eligibility before running nested loops
            if (stageCheck <= u.redemptionPeriod && u.amountout[stageCheck - 1] == 0) {
                
                _handlePayout(u,
                    WithdrawHandle({
                        payToken: payTokenCached,
                        stageCheck: stageCheck,
                        termIndex: i,
                        timeStamp: timeStampCached
                    })
                ); 
                
                // Return immediately upon successful payout processing to prevent hitting the lower revert
                return stageCheck; 
            }
        }

        revert NoEligibleTerms();
    }

    function _handlePayout(
        User storage u,
        WithdrawHandle memory v
    ) internal {
        uint256 ts = v.timeStamp;
        uint256 supply = u.termTotalSupply;
        
        // Skip entirely if zero supply to avoid running the loop execution blocks
        if (supply == 0) return;

        // Cache initial autoPay configuration parameter to local stack
        bool autoPayCached = u.autoPay;

        for (uint256 i = u.stage; i < v.stageCheck; i++) {
            // Safe optimization: We already checked 'finalize' outside the loop, 
            // and we control the step assignment that sets it to true below.
            
            if (u.amountout[i] != 0) {
                continue;
            }

            (uint256 payout, uint256 principalSlice) = _computePayout(u);
            u.amountout[i] = payout;
            
            // Replaced dangerous 'i--' logic with secure stack operations
            if (i > 0) {
                if ((u.payToken[i] == address(0) && v.payToken == address(0)) || autoPayCached) {
                    u.payToken[i] = u.payToken[i - 1]; // Correct structural lookup reference
                }
            }
            
            u.principalSlice[i] = principalSlice;

            // Inline check assignment 
            bool initiationStatus = (i == 0);
            
            unchecked { ts++; }

            withdrawByTimestamp[ts] = Withdraw(
                msg.sender,
                v.termIndex,
                i
            );

            withdrawTimestamps.push(ts);

            _recordWithdrawal(u, i, v.termIndex, ts, initiationStatus);

            emit UserWithdraw(ts, msg.sender, u.quartersCommitted, u.unlockQuarter, payout, v.termIndex, i);
            u.stage = i;
        }
    }

    // -----------------------------
    // COMPUTE PAYOUT
    // -----------------------------

    function _computePayout(
        User storage u
    )
        internal
        view
        returns (
            uint256 payout, 
            uint256 principalSlice
        )
    {
        // Instantiate the contract pointer once to optimize memory stack tracking
        Globe venture = Globe(u.ventureToken);

        uint256 redeemPeriod = venture.redeemPeriod();
        uint256 rate = venture.annualRate(); 
        
        // Prevent an explicit division-by-zero transaction panic (EVM Panic 0x12)
        if(redeemPeriod == 0) revert InvalidRedemptionPeriod();

        uint256 principal = u.userDividendAmount;

        // Wrap calculations in unchecked math where overflow/underflow is structurally impossible
        unchecked {
            // Straight-line principal split
            principalSlice = principal / redeemPeriod;

            // Simple interest calculated strictly on the ORIGINAL principal
            uint256 quarterlyRate = rate / 4;
            uint256 interestSlice = (principal * quarterlyRate) / 10000;

            payout = principalSlice + interestSlice;
        }

        return (payout, principalSlice);
    }

    function _recordWithdrawal (
        User storage u,
        uint256 stage,
        uint256 termIndex,
        uint256 ts,
        bool initiationStatus
    ) internal {

        IGlobalLedger.LedgerWithdrawHandle memory withdrawData = IGlobalLedger.LedgerWithdrawHandle({
            user: u.user,
            token: address(0),
            asset: u.ventureToken,
            payoutAmount: u.amountout[stage],
            principalSlice: u.principalSlice[stage],
            investmentAmount: u.userDividendAmount,
            timeStamp: ts,
            status: false, //Vault Only
            initiationStatus: initiationStatus
        });

        (uint256[] memory amountOut) = ledgerProxy.ventureWithdraw(
            withdrawData
        );

        stagePayouts[u.user][termIndex][stage] = amountOut;
    }

    // -----------------------------
    // COMPUTE POOL
    // -----------------------------

    function computeGlobalPool(address venture) external onlyOwner {
        Globe ventureContract = Globe(venture);
        
        uint256 term = ventureContract.redeemPeriod();
        uint256 annualRate = ventureContract.annualRate();
        uint256 principal = ventureContract.totalSupply();

        if(principal == 0 && term == 0 && annualRate == 0) revert VentureNotInitialized();

        // Amortized quarterly payment calculations using unchecked math where safe
        uint256 principalSlice = principal / term;
        uint256 interestSlice;
        unchecked {
            interestSlice = ((principal * (annualRate / 4)) / 10000);
            venturePoolRequirement[venture] = principalSlice + interestSlice;
        }
    }

    function getPoolRequirement(address venture) external view returns (uint256) {
        return venturePoolRequirement[venture];
    }

    // -----------------------------
    // POOL ADDITION
    // -----------------------------

    function addToDividendPool(
        address venture,
        uint256 poolAmount,
        uint256 currentQuarter,
        uint256 timeStamp,
        bytes32 depositHash
    ) external onlyOwner nonReentrant {
        
        // Reject if the venture has not been explicitly initiated/whitelisted
        if(!stakeableWhitelistMap[venture]) revert UnapprovedToken(venture);

        calldates(venture, currentQuarter);

        // Fetch and validate the true pool requirement for this venture
        uint256 poolRequirement = venturePoolRequirement[venture];
        if(poolRequirement == 0) revert PoolNotCalculated();
        if(poolAmount > poolRequirement || poolAmount < poolRequirement) revert InvalidPoolAmount(poolAmount, poolRequirement);

        // Direct Accounting Isolation
        tokenPoolBalances[venture] += poolRequirement;

        ledgerProxy.recordVenturePoolDeposit(
            IGlobalLedger.LedgerPoolHandle({
                currency: payoutToken,
                callingContract: address(this),
                timeStamp: timeStamp,
                nativeAmount: poolRequirement,
                depositHash: depositHash
            })
        );

        emit PoolBalanceUpdated(venture, tokenPoolBalances[venture]);
    }

    // -----------------------------
    // TOTAL TOKENS IN CIRCULATION
    // -----------------------------

    function getEcoSupply(address token) public view returns (uint256){
        if(!_isAdmin(msg.sender)) revert NotAuthorized();
        uint256 totalSupply = 0;
        for (uint256 i = 0; i < stakeables.length; i++) {
            if (stakeables[i] == token) {
                Globe instance = Globe(stakeables[i]);
                uint256 supply = instance.viewSupply();
                totalSupply += supply;
            }
        }
        return totalSupply;
    }

    function getUserTermCount(address user) external view returns (uint256) {
        return withdrawalsByUser[user].length;
    }

    function getUserTerm(address user, uint256 index)
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
        if (!_isAdmin(msg.sender) || msg.sender != user) revert NotAuthorized();
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
        if (!_isAdmin(msg.sender) || msg.sender != user) revert NotAuthorized();
        return depositsByUser[user];
    }

    function changePayoutAddress(
        address user,
        address venture,
        address newUser,
        uint256 currentQuarter
    ) external {

        User[] memory terms = withdrawalsByUser[msg.sender];


        uint256 len = terms.length;

        if(len == 0) revert NoEligibleTerms();

        for (uint256 i = len; i > 0; i--) {
            User storage u = withdrawalsByUser[user][i - 1];

            if (u.ventureToken == venture) {

                // Skip if struct has been finalized
                if (u.stage > u.redemptionPeriod) continue;

                uint256 stage = currentQuarter - u.startQuarter;

                if (stage >= 1 && stage <= u.redemptionPeriod) {
                    
                    u.user = newUser;
                }
            }
        }
    }

    function _populateGlobals() internal {
        if(msg.sender != owner()) revert NotAuthorized();

        rateRange[0]  = RateRange(RATE_100, RATE_100);
        rateRange[1]  = RateRange(RATE_102, RATE_098);
        rateRange[3]  = RateRange(RATE_102, RATE_098);
        rateRange[5]  = RateRange(RATE_102, RATE_098);
        rateRange[9]  = RateRange(RATE_102, RATE_098);
        rateRange[11] = RateRange(RATE_102, RATE_098);
        rateRange[12] = RateRange(RATE_102, RATE_098);
        rateRange[13] = RateRange(RATE_102, RATE_098);

        rateRange[14] = RateRange(RATE_069, RATE_065);

        rateRange[2]  = RateRange(RATE_076, RATE_072);

        rateRange[4]  = RateRange(RATE_112, RATE_108);
        rateRange[19] = RateRange(RATE_112, RATE_108);

        rateRange[6]  = RateRange(RATE_100, RATE_097);

        rateRange[7]  = RateRange(RATE_0073, RATE_0065);

        rateRange[8]  = RateRange(RATE_062, RATE_058);

        rateRange[10] = RateRange(RATE_076, RATE_074);

        rateRange[15] = RateRange(RATE_064, RATE_054);

        rateRange[16] = RateRange(RATE_021, RATE_019);

        rateRange[17] = RateRange(RATE_130, RATE_120);

        rateRange[18] = RateRange(RATE_033, RATE_030);

        rateRange[20] = RateRange(RATE_100, RATE_100);
        rateRange[21] = RateRange(RATE_100, RATE_100);

    }

    function autoPay(bool ap) external {
        uint256 len = withdrawalsByUser[msg.sender].length;
        User[] storage terms = withdrawalsByUser[msg.sender];

        if(len == 0) revert NoEligibleTerms();

        if (!autopayWhitelistMap[msg.sender] && ap) {

            for (uint256 i = len; i > 0; i--) {
                User storage u = terms[i];
                if (u.user == address(0) || u.stage > u.redemptionPeriod) continue;
                u.autoPay = true;
            }

            autopay.push(msg.sender);

        } else {

            for (uint256 i = len; i > 0; i--) {
                User storage u = terms[i];
                if (u.user == address(0) || u.stage > u.redemptionPeriod) continue;
                u.autoPay = false;
            }

            uint256 index = autopayIndex[msg.sender];
            uint256 lastIndex = autopay.length - 1;

            if (index != lastIndex) {
                address lastAddr = autopay[lastIndex];
                autopay[index] = lastAddr;
                
                autopayIndex[lastAddr] = index;

                autopay.pop();
                autopayWhitelistMap[msg.sender] = false;

                delete autopayIndex[msg.sender];
            }
        }

    }

    function apAddrs() public view returns(address[] memory){
        if(!_isAdmin(msg.sender)) revert NotAuthorized();
        return autopay;
    }

    function correctPayoutTxHash(
        bytes32 newTxHash,
        bytes32 refundHash
    ) external {

        if(!_isAdmin(msg.sender)) revert NotAuthorized();

        // Old hash must exist
        bytes32 old;
        bytes32 newHash;

        if (newTxHash != bytes32(0)) {
            // Load the correct term record
            Withdraw memory wr = withdrawByHash[newTxHash];
            User storage u = withdrawalsByUser[wr.user][wr.termIndex];
            uint256 stage = wr.stage;

            // No corrections allowed after final payout
            if(stage + 1 > u.redemptionPeriod) revert PayoutStageOutofBounds();

            // A payout must exist for this stage before correcting a hash
            if(u.amountout[stage] == 0) revert SpendNotApproved();
            if(processedDeposits[newTxHash]) revert HashDuplicated();
            processedDeposits[newTxHash] = true;    

            old = u.payoutTxHash[stage];
            newHash = newTxHash;

            // Apply correction
            u.payoutTxHash[stage] = newTxHash;
            u.payoutSetter[stage] = msg.sender;

            emit PayoutTxHashCorrected(wr.user, 0, old, newHash, msg.sender);

        } else if (refundHash != bytes32(0)) {

            DepositRef memory r = depositsByHash[refundHash];
            Deposit storage d = depositsByUser[r.user][r.depositIndex];

            old = d.refundHash;
            newHash = refundHash;

            // Apply correction
            d.refundHash = refundHash;

            emit PayoutTxHashCorrected(r.user, 0, old, newHash, msg.sender);
        } else {
            revert InvalidHash(refundHash);
        }
    }

    function getDepositsInRange(uint256 startTs, uint256 endTs, bool process) public {

        if (process) {

            if(msg.sender !=  owner()) revert NotAuthorized();

            _emitDeposit(processDepositTimestamp, endTs);

            processDepositTimestamp = endTs;

        } else {

            if(!_isAdmin(msg.sender)) revert NotAuthorized();

            _emitDeposit(startTs, endTs);
        }
    }

    function _emitDeposit(uint256 startTs, uint256 endTs) internal {
        // Cache array length to memory to prevent continuous storage reads (SLOAD)
        uint256 len = depositTimestamps.length;

        for (uint256 i = 0; i < len;) {
            uint256 ts = depositTimestamps[i];
            
            if (ts >= startTs && ts <= endTs) {
                // Read pointers to storage instead of copying the whole struct to memory
                DepositRef storage r = depositsByTimestamp[ts];
                Deposit storage w = depositsByUser[r.user][r.depositIndex];
                
                emit DepositInRange(
                    w.timestamp, 
                    w.user, 
                    w.token, 
                    w.venture, 
                    w.amountin, 
                    w.amountout
                );
            }

            // Use unchecked increments for the loop counter to bypass safety checks
            unchecked { i++; }
        }
    }

    function getWithdrawInRange(uint256 startTs, uint256 endTs, bool process) public {
        if (process) {
            if(msg.sender != owner()) revert NotAuthorized();

            uint256 oneMonth = 28 days;
            if (endTs - processWithdrawTimestamp < oneMonth) {
                revert NotAuthorized();
            }

            _emitWithdrawRange(processWithdrawTimestamp, endTs);
            processWithdrawTimestamp = endTs;

        } else {
            if(!_isAdmin(msg.sender)) revert NotAuthorized();
            _emitWithdrawRange(startTs, endTs);
        }
    }

    function _emitWithdrawRange(uint256 startTs, uint256 endTs) internal {
        uint256 len = withdrawTimestamps.length;

        for (uint256 i = 0; i < len;) {
            uint256 ts = withdrawTimestamps[i];
            
            if (ts >= startTs && ts <= endTs) {
                // WIN: Read directly from storage pointers to avoid copying large structs to memory
                Withdraw storage r = withdrawByTimestamp[ts];
                User storage w = withdrawalsByUser[r.user][r.termIndex];

                emit WithdrawInRange(
                    w.user,
                    w.amountout[r.stage],
                    stagePayouts[r.user][r.termIndex][r.stage],
                    w.payToken[r.stage],
                    r.termIndex,
                    r.stage
                );
            }

            unchecked { i++; }
        }
    }

    function _additionHelper(address[] memory addresses, bool stc, bool stk, bool adn) internal {
        uint256 len = addresses.length;
        
        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];

            // Skip if ALREADY added to prevent array bloating
            if (stc && !stablecoinWhitelistMap[sc]) {
                stablecoinIndex[sc] = stables.length; // Tracks actual state array position
                stables.push(sc);
                stablecoinWhitelistMap[sc] = true;
            }
            if (stk && !stakeableWhitelistMap[sc]) {
                stakeablecoinIndex[sc] = stakeables.length;
                stakeables.push(sc);
                stakeableWhitelistMap[sc] = true;
            }
            if (adn && !adminWhitelistMap[sc]) {
                adminIndex[sc] = admins.length;
                admins.push(sc);
                adminWhitelistMap[sc] = true;
            }
            
            unchecked { i++; }
        }
    } 

    function _removalHelper(address[] memory addresses, bool stc, bool stk, bool adn) internal {
        uint256 len = addresses.length;

        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];

            // Process individual types using isolated indexes to prevent state pollution
            if (stc && stablecoinWhitelistMap[sc]) {
                uint256 index = stablecoinIndex[sc];
                uint256 lastIndex = stables.length - 1;

                if (index != lastIndex) {
                    address lastAddr = stables[lastIndex];
                    stables[index] = lastAddr;
                    stablecoinIndex[lastAddr] = index;
                }
                stables.pop();
                stablecoinWhitelistMap[sc] = false;
                delete stablecoinIndex[sc];
            }

            if (stk && stakeableWhitelistMap[sc]) {
                uint256 index = stakeablecoinIndex[sc];
                uint256 lastIndex = stakeables.length - 1;

                if (index != lastIndex) {
                    address lastAddr = stakeables[lastIndex];
                    stakeables[index] = lastAddr;
                    stakeablecoinIndex[lastAddr] = index;
                }
                stakeables.pop();
                stakeableWhitelistMap[sc] = false;
                delete stakeablecoinIndex[sc];
            }

            if (adn && adminWhitelistMap[sc]) {
                uint256 index = adminIndex[sc];
                uint256 lastIndex = admins.length - 1;

                if (index != lastIndex) {
                    address lastAddr = admins[lastIndex];
                    admins[index] = lastAddr;
                    adminIndex[lastAddr] = index;
                }
                admins.pop();
                adminWhitelistMap[sc] = false;
                delete adminIndex[sc];
            }

            unchecked { i++; }
        }
    }

    function addToStableWhitelist(address[] memory stableAddress) external onlyOwner {

        bool stc = true;
        bool stk = false;
        bool adn = false;

        _additionHelper(stableAddress, stc, stk, adn);
    }

    function stableIndex() external view onlyOwner returns(address[] memory stable) {
        
        return stables;
    }

    function removeFromStableWhitelist(address[] memory stableAddress) external onlyOwner {

        bool stc = true;
        bool stk = false;
        bool adn = false;

        _removalHelper(stableAddress, stc, stk, adn);
    }

    function addToStakeableWhitelist(address[] memory stakeableAddress) external onlyOwner {

        bool stc = false;
        bool stk = true;
        bool adn = false;
        
        _additionHelper(stakeableAddress, stc, stk, adn);
    }

    function stakeableIndex() external view onlyOwner returns(address[] memory stakes) {
        
        return stakeables;
    }

    function removeFromStakeableWhitelist(address[] memory stakeableAddress) external onlyOwner {

        bool stc = false;
        bool stk = true;
        bool adn = false;

        _removalHelper(stakeableAddress, stc, stk, adn);
    }

    function addToAdminWhitelist(address[] memory adminToAdd) external onlyOwner {

        bool stc = false;
        bool stk = false;
        bool adn = true;
       
        _additionHelper(adminToAdd, stc, stk, adn);
    }

    function adminsIndex() external view onlyOwner returns(address[] memory admin) {
        
        return admins;
    }

    function removeFromAdminWhitelist(address[] memory adminToRemove) external onlyOwner {

        bool stc = false;
        bool stk = false;
        bool adn = true;

        _removalHelper(adminToRemove, stc, stk, adn);
    }

    uint256[50] __gap;
}
