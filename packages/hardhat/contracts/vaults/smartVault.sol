// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../libraries/dateTimeLibrary.sol";
import "../interfaces/IGlobalLedger.sol";
import "../currency/globalDollarT.sol";

contract SmartVault is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    using DateTimeLibrary for uint256;

    IGlobalLedger public ledgerProxy;

    struct Deposit {
        uint256 timestamp;
        uint256 amountin;
        uint256 amountout; 
        uint256 rate;
        address user;
        address token;
        address dividend;
        uint256 quartersCommitted;
        uint256 startQuarter;
        uint256 key;
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
        address dividendToken;
        address[7] payToken;
        uint256 quartersCommitted;
        uint256 startQuarter;
        uint256 unlockQuarter;
        uint256 stage;
        bool autoPay;
        uint256 userDividendAmount;
        uint256[7] termSupplyPerStage;
        uint256[7] poolBalancePerStage;
        address[7] payoutSetter;
        uint256[7] amountout;
        bytes32[7] payoutTxHash;
    }

    struct EcoQuarterData {
        uint256 currentQuarter;
        uint256 ecoSupply;
        uint256 effectiveRawSupply;
        uint256 ecoPool;
        uint256 ecoRedemptions;
        uint256 poolMin;
        uint256 poolMax;
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
        address dividendToken;
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

    struct LedgerHandle {
        uint256 stage;
        uint256 termIndex;
        uint256 payout;
        uint256 ts;
        bool status;
        bool initiationStatus;
    }

    error NotAuthorized();
    error InsufficientFunds();
    error SpendNotApproved();
    error QuarterNotCalculated();
    error FeeOutofBounds();
    error InvalidAddress(address addressSupplied);
    error MintFailed();
    error UnapprovedToken(address token);
    error NoEligibleQuarter();
    error HashDuplicated();
    error InvalidHash(bytes32 input);
    error PayoutStageOutofBounds();
    error InvalidPoolAmount(uint256 poolMin, uint256 inputAmount);
    error NoEligibleTerms();

    address public payoutToken;
    address private payoutAddress; //Remove
    address public feeRecipient;
    address[] public stakeables;
    address[] public stables;
    address[] private admins;
    address[] private autopay;
    address constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD; //Remove
    
    // State variable to track injected time
    uint256 public lastUpdatedTime;
    uint256 public lastTimeStamp;
    uint256 public updatedStartQuarter;
    uint256 public depositFeeBps;
    uint256 public processDepositTimestamp;
    uint256 public processWithdrawTimestamp;
    uint256[] public depositTimestamps;
    uint256[] public withdrawTimestamps;

    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(address => bool) private autopayWhitelistMap;
    mapping(address => uint256) public multiplier;
    mapping(uint256 => DepositRef) public depositsByTimestamp;
    mapping(bytes32 => DepositRef) public depositsByHash;
    mapping(address => uint256[]) public depositTimestampsByUser;
    mapping(bytes32 => bool) public processedDeposits;
    mapping(uint256 => Withdraw) public withdrawByTimestamp;
    mapping(bytes32 => Withdraw) public withdrawByHash;
    mapping(address => User[]) public withdrawalsByUser;
    mapping(address => Deposit[]) public depositsByUser;
    mapping(uint256 => EcoQuarterData) public ecoDataByQuarter;
    mapping(address => uint256) stablecoinIndex;
    mapping(address => uint256) stakeablecoinIndex;
    mapping(address => uint256) adminIndex;
    mapping(address => uint256) autopayIndex;
    mapping(uint256 => RateRange) public rateRange;
    mapping(address => mapping(uint256 => mapping(uint256 => uint256[]))) public stagePayouts;
    mapping(uint256 => mapping (uint256 => address[])) private quarterLocker;
    mapping(uint256 => mapping (uint256 => mapping(uint256 => address))) private contractTracker;

    event Deposited(address indexed user, uint256 amountOut, uint256 amountIn, uint256 fee, uint256 committedQuarters);
    event UpdateFailed(address indexed addr, uint256 index, string reason); //Remove
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount); //Remove
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
        address dividend,
        uint256 quartersCommitted,
        uint256 amountin,
        uint256 amountout
    );
    event UserWithdraw(
        uint256 timestamp, //Remove
        address indexed user,
        uint256 quartersCommitted,
        uint256 unlockQuarter,
        uint256 amountout, 
        uint256 termIndex,
        uint256 stage
    );
    event PayoutTxHashCorrected(address user, uint256 quarter, bytes32 old, bytes32 newTxHash, address payoutSetter);

    uint256 constant MIN_RATE = 30;  // 3%
    uint256 constant MAX_RATE = 120; // 12%
    uint256 constant DECIMALS = 1e18;
    uint256 constant GBDr = 1050000000000000000;
    uint256 constant RATE_098 = 980000000000000000;   // 0.98 * 1e18
    uint256 constant RATE_102 = 1020000000000000000;  // 1.02 * 1e18s
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
        ledgerProxy = IGlobalLedger(ledgerProxyAddress);

    }

    function setDepositFee(uint256 newFeeBps) external onlyOwner {
        if(newFeeBps <= 5000) revert FeeOutofBounds();
        depositFeeBps = newFeeBps;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if(newRecipient != address(0)) revert InvalidAddress(newRecipient);
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

    function _isAdmin(address admin) public view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function initCalldates(uint256 ts, uint256 sIndex, uint256 eIndex) public {
        if(!_isAdmin(msg.sender)) revert NotAuthorized();

        (uint256 year, uint256 key,) = ts.timestampToDate();

        uint256 quarter = 0;
        unchecked { quarter= (key - 1) / 3; }

        uint256 cQ;
        unchecked { cQ = year * 4 + quarter; }

        for (uint256 i = sIndex; i < eIndex;) {
            GlobalDollarT token = GlobalDollarT(stakeables[i]); // Cache contract instance

            // Single external call gas cost minimized by fetching values into memory
            token.update(cQ, key, ts);
            uint256 mK = token.monthKey();
            uint256 comQ = token.committedQuarters();
            uint256 uQ = token.unlockQuarter();
            uint256 rE = token.comingQuarter();

            quarterLocker[rE][mK].push(stakeables[i]);
            contractTracker[uQ][comQ][mK] = (stakeables[i]);
            unchecked { i++; }
        }

    }

    function calldates(uint256 ts) internal returns (uint256 cQ) {

        (uint256 year, uint256 key, uint256 day) = ts.timestampToDate();

        uint256 quarter = 0;
        unchecked { 
            quarter = (key - 1) / 3;
            cQ = year * 4 + quarter;
        }

        uint256 startQuarter = cQ;
        if (day > 14) {
            quarter = (key) / 3;
            unchecked { startQuarter = year * 4 + quarter; }
        }

        address[] memory locker = quarterLocker[cQ][key];
        uint256 contractTotal = locker.length;

        for(uint256 i = 0; i < contractTotal; i++) {
            GlobalDollarT token = GlobalDollarT(locker[i]);
            uint256 comQ = token.committedQuarters();

            delete contractTracker[cQ][comQ][key];

            token.update(cQ, key, ts);
            uint256 nQ = token.comingQuarter();
            uint256 uQ = token.unlockQuarter();
            uint256 nK = token.monthKey();

            quarterLocker[nQ][nK].push(locker[i]);
            contractTracker[uQ][comQ][nK] = locker[i];

            unchecked { i++; }

        }

        delete quarterLocker[cQ][key];
        
        lastUpdatedTime = cQ;
        updatedStartQuarter = startQuarter;
        lastTimeStamp = ts;
    }

    function _getCurrentQuarter(uint256 ts) internal pure returns(uint256 cQ) {
        (uint256 year, uint256 key,) = ts.timestampToDate();

        uint256 quarter = 0;
        unchecked {
            quarter = (key - 1) / 3;
            cQ = year * 4 + quarter;
        }
    }

    function _generateEntries(uint256 ts) internal pure returns(uint256 sQ, uint256 kE){

        (uint256 year, uint256 key, uint256 day) = ts.timestampToDate();
        uint256 quarter;
        unchecked { quarter = (key - 1) / 3; }

        sQ = year * 4 + quarter;

        if(day > 14) {
            unchecked { 
                key += 1;
                quarter = (key - 1) / 3;
                sQ += year * 4 + quarter;
            }
        }

        kE = key;
    }

    // Deposit with reentrancy guard
    function deposit(
        uint256 timeStamp,
        address investor,
        address token,
        uint256 amount,
        uint256 committedQuarters,
        uint256 incomingRate,
        bytes32 depositHash 
    ) external payable nonReentrant {     

        uint256 fee = 0;
        uint256 gbdAmountOut;
        uint256 amountIn;

        (uint256 startQuarter, uint256 keyEntry) = _generateEntries(timeStamp);

        if (token == address(0)) {
            gbdAmountOut = msg.value;
            amountIn = msg.value;
            startQuarter = updatedStartQuarter;
        } else {
            if(!_isAdmin(msg.sender)) revert NotAuthorized();

            if (depositHash != bytes32(0)){
                if(processedDeposits[depositHash]) revert HashDuplicated();
                processedDeposits[depositHash] = true;
            }

            // Set amountIn properly so event logs reflect historical data accurately
            amountIn = amount;

            fee = (amount * depositFeeBps) / 10000;
            uint256 baseAmount = (amount * incomingRate) / 1e18;
            uint256 netAmount = baseAmount - fee;
            gbdAmountOut = amount - fee;

            uint256 i = stablecoinIndex[token];
            RateRange memory r = rateRange[i];

            // Cache constants to prevent multiple runtime lookups
            uint256 decimalsCached = DECIMALS;
            uint256 gbdrCached = GBDr;

            uint256 minRate = (((netAmount * decimalsCached) * r.min) / gbdrCached) / decimalsCached;
            uint256 maxRate = (((netAmount * decimalsCached) * r.max) / gbdrCached) / decimalsCached;

            if (netAmount < minRate || netAmount > maxRate) {
                gbdAmountOut = minRate;
            }            
        }

        bool minted = false;
        //address mintedTokenAddress = address(0);
        uint256 checkMate = startQuarter + committedQuarters;
        address mintedTokenAddress = contractTracker[checkMate][committedQuarters][keyEntry];
        GlobalDollarT instance = GlobalDollarT(mintedTokenAddress);
        instance.mint(investor, gbdAmountOut);
        minted = true;
            
        // 22,000+ gas if I find a way to elminate:
        uint256 supply = instance.viewSupply();
        unchecked { supply += gbdAmountOut; }
        instance.supply(supply);

        //if (!minted) revert MintFailed();

        // Single operation structural push return assignment
        Deposit storage d = depositsByUser[investor].push();
        uint256 termIndex;
        unchecked { termIndex = depositsByUser[investor].length - 1; }

        d.timestamp = timeStamp;
        d.amountin = amount;
        d.amountout = gbdAmountOut;
        d.rate = incomingRate;
        d.user = investor;
        d.token = token;
        d.quartersCommitted = committedQuarters;
        d.startQuarter = startQuarter;
        d.key = keyEntry;
        d.depositTxHash = depositHash;
        d.dividend = mintedTokenAddress;

        depositTimestamps.push(timeStamp);
        
        // Combined storage structural references assignments
        DepositRef memory ref = DepositRef({ user: d.user, depositIndex: termIndex });
        depositsByTimestamp[d.timestamp] = ref;
        depositsByHash[d.depositTxHash] = ref;
        
        _recordDeposit(d);

        emit Deposited(mintedTokenAddress, gbdAmountOut, checkMate, keyEntry, committedQuarters);
    }

    function _recordDeposit(Deposit storage d) internal {

        IGlobalLedger.LedgerDepositHandle memory depositData = IGlobalLedger.LedgerDepositHandle({
            user: d.user,
            token: d.token,
            asset: d.dividend,
            timeStamp: d.timestamp, 
            nativeAmount: d.amountout,
            stableAmount: d.amountin,
            exchangeRate: d.rate,
            depositHash: d.depositTxHash
        });

        ledgerProxy.recordVaultDeposit(
            depositData
        );
    }

    function withdraw(
        address dividendToken,
        address payToken,
        uint256 holderBalance,
        uint256 timeStamp
    ) external payable nonReentrant {

        uint256 currentQuarter = _getCurrentQuarter(lastTimeStamp);
        uint256 startQuarter = GlobalDollarT(dividendToken).startQuarter();
        uint256 allowance = IERC20(dividendToken).allowance(msg.sender, address(this));
        if(allowance < holderBalance) revert InsufficientFunds();

        if (holderBalance != 0) {

            if(!_isWhitelistedx(dividendToken)) revert UnapprovedToken(dividendToken);

            if(currentQuarter <= startQuarter) revert NoEligibleQuarter();       

            // Allocate a new struct slot
            withdrawalsByUser[msg.sender].push();

            // Get the index of the new struct
            uint256 termIndex = withdrawalsByUser[msg.sender].length - 1;
            User storage u = withdrawalsByUser[msg.sender][termIndex];

            u.user = msg.sender;
            u.dividendToken = dividendToken;
            u.startQuarter = GlobalDollarT(dividendToken).startQuarter();
            u.quartersCommitted = GlobalDollarT(dividendToken).committedQuarters();
            u.unlockQuarter = GlobalDollarT(dividendToken).unlockQuarter();
            u.userDividendAmount = holderBalance;
            u.stage = 0;

            _processPayout(
                WithdrawInit({
                    user: msg.sender,
                    dividendToken: dividendToken,
                    payToken: payToken,
                    currentQuarter: currentQuarter,
                    timeStamp: timeStamp
                })
            );

            IERC20(dividendToken).safeTransferFrom(msg.sender, address(this), holderBalance);

        } else {

            _processPayout(
                WithdrawInit({
                    user: msg.sender,
                    dividendToken: dividendToken,
                    payToken: payToken,
                    currentQuarter: currentQuarter,
                    timeStamp: timeStamp
                })
            ); 
        }
    }

    function withdrawAdmin(
        address user,
        uint256 timeStamp
    ) external payable onlyOwner {

        uint256 currentQuarter = _getCurrentQuarter(timeStamp);

        _processPayout(
            WithdrawInit({
                user: user,
                dividendToken: address(0),
                payToken: address(0),
                currentQuarter: currentQuarter,
                timeStamp: timeStamp
            })
        ); 
    }

    function _processPayout(WithdrawInit memory init) internal {
        User[] storage terms = withdrawalsByUser[init.user];
        uint256 len = terms.length;

        // Cache parameters to local stack variables
        uint256 allocationSize = len > 100 ? len - 100 : 0;        

        // Loop corrected to safely read from 0 to (len - 1) backwards
        for (uint256 i = len; i > allocationSize; i--) {
            uint256 termIndex;
            unchecked { termIndex = i - 1;}

            User storage u = terms[termIndex];

            // Combined Early Exit Gates
            //address divToken = u.dividendToken;

            if (u.user == address(0) || u.stage >= u.quartersCommitted) {
                continue;
            }

            // Math execution safely bounded under explicit check
            if (init.currentQuarter <= u.startQuarter) {
                continue;
            }

            uint256 stageCheck;
            unchecked {
                stageCheck = init.currentQuarter - u.startQuarter;
            }

            _handlePayout(u,
                WithdrawHandle({
                    payToken: init.payToken,
                    stageCheck: stageCheck,
                    termIndex: termIndex,
                    timeStamp: init.timeStamp
                })
            );
        }

        //emit FundsWithdrawn(init.user, msg.sender, allocationSize);
    }

    function _handlePayout(
        User storage u,
        WithdrawHandle memory h
    ) internal {
        uint256 payout = 0;
        uint256 ts = h.timeStamp;

        // Fetch external token details ONCE here instead of down in the loops
        uint256 fromTs = GlobalDollarT(u.dividendToken).contractTime();
        uint256 monthDiff = fromTs.diffMonths(ts);

        for (uint256 i = u.stage; i < h.stageCheck; i++) {
            
            // Time rules evaluation using cached parameter registers
            if (monthDiff < ((i + 1) * 3)) {
                continue;
            }

            if (u.amountout[i] != 0) {
                continue;
            }

            uint256 payoutQuarter = (u.startQuarter + 1) + i;
            EcoQuarterData memory g = ecoDataByQuarter[payoutQuarter];

            if (g.ecoPool == 0 || g.ecoSupply == 0) {
                continue;
            }

            // Write state records efficiently
            u.termSupplyPerStage[i] = g.ecoSupply;
            u.poolBalancePerStage[i] = g.ecoPool;
            
            payout = _computePayout(u, payoutQuarter);
            u.amountout[i] = payout;
            
            // Safe structural element alignment without modifying your loop counter
            if (i > 0) {
                if ((u.payToken[i] == address(0) && h.payToken == address(0)) || u.autoPay) {
                    u.payToken[i] = u.payToken[i - 1]; 
                }
            }

            unchecked { ts += i; } 

            withdrawByTimestamp[ts] = Withdraw(
                msg.sender,
                h.termIndex,
                i
            );
            withdrawTimestamps.push(ts);

            // Changed evaluation expression into explicit variable assignment
            bool status = (i + 1) == u.quartersCommitted;
            bool initiationStatus = (i == 0);

            _recordWithdrawal(u, h,
                LedgerHandle({
                    stage: i,
                    termIndex: h.termIndex,
                    payout: payout,
                    ts: ts,
                    status: status,
                    initiationStatus: initiationStatus
                })
            );

            emit FundsWithdrawn(u.payToken[i], msg.sender, payout);

            u.stage = i;
        }
    }

    function _computePayout(
        User storage u,
        uint256 currentQuarter
    )
        internal
        view
        returns (
            uint256 payout
        )
    {
        // Single read operation fetches everything we need for the quarter
        EcoQuarterData storage g = ecoDataByQuarter[currentQuarter];
        
        uint256 ecoPool = g.ecoPool - g.ecoRedemptions;
        uint256 effectiveRawSupply = g.effectiveRawSupply;

        // Guardrail safety gate checking
        if(effectiveRawSupply == 0) revert QuarterNotCalculated();

        // Local variable caching allocation layers
        uint256 userDivAmount = u.userDividendAmount;
        address divToken = u.dividendToken;

        uint256 effectiveStake = (userDivAmount * multiplier[divToken]) / 100;

        // Pro-rata mathematical distribution calculation
        uint256 dividend = (ecoPool * effectiveStake) / effectiveRawSupply;

        unchecked {
            if ((currentQuarter - u.startQuarter) >= u.quartersCommitted) {
                payout = dividend + userDivAmount;
            } else {
                payout = dividend;
            }
        }
    }

    function _recordWithdrawal(User storage u, WithdrawHandle memory handle, LedgerHandle memory w) internal {

        IGlobalLedger.LedgerWithdrawHandle memory withdrawData = IGlobalLedger.LedgerWithdrawHandle({
            user: u.user,
            token: address(0),
            asset: u.dividendToken,
            payoutAmount: u.amountout[w.stage],
            principalSlice: 0, //Venture Only
            investmentAmount: u.userDividendAmount,
            timeStamp: w.ts,
            status: w.status, //Vault Only
            initiationStatus: w.initiationStatus
        });

        (uint256[] memory amountOut) = ledgerProxy.vaultWithdraw(
            withdrawData
        );
        stagePayouts[u.user][handle.termIndex][w.stage] = amountOut;
    }

    function computeGlobalPoolRange(uint256 ts)
        public
        returns (
            uint256 poolMin,
            uint256 poolMax,
            uint256 redemptions,
            uint256 totalEcoSupply
        )
    {
        uint256 cQ = _getCurrentQuarter(ts);
        (, uint256 key,) = ts.timestampToDate();
        EcoQuarterData storage g = ecoDataByQuarter[cQ];

        uint256 total;
        uint256 unlockPrincipal;
        uint256 effectiveRawSupply;

        // ---------------------------------------------
        // CASE 1: ecoSupply already exists → READ ONLY
        // ---------------------------------------------
        if (g.ecoSupply > 0) {
            total = g.ecoSupply;
            poolMin = g.poolMin;
            poolMax = g.poolMax;

            if (g.ecoRedemptions == 0) {
                (unlockPrincipal, effectiveRawSupply, total) = _handleCompute(cQ, key);
                g.ecoRedemptions = unlockPrincipal;
                
                uint256 minDividend = (total * MIN_RATE) / 1000;
                uint256 maxDividend = (total * MAX_RATE) / 1000;
                
                unchecked {
                    poolMin = unlockPrincipal + minDividend;
                    poolMax = unlockPrincipal + maxDividend;
                }
                
                g.poolMin = poolMin;
                g.poolMax = poolMax;
                g.effectiveRawSupply = effectiveRawSupply; //Cache on late-computation
            }
            
            return (poolMin, poolMax, g.ecoRedemptions, total);
        }

        // ---------------------------------------------
        // CASE 2: ecoSupply == 0 → INITIALIZE
        // ---------------------------------------------
        (unlockPrincipal, effectiveRawSupply, total) = _handleCompute(cQ, key);

        uint256 minDiv = (total * MIN_RATE) / 1000;
        uint256 maxDiv = (total * MAX_RATE) / 1000;

        unchecked {
            poolMin = unlockPrincipal + minDiv;
            poolMax = unlockPrincipal + maxDiv;
        }
        redemptions = unlockPrincipal;

        g.currentQuarter = cQ;
        g.ecoSupply = total;
        g.ecoRedemptions = unlockPrincipal;
        g.poolMin = poolMin;
        g.poolMax = poolMax;
        g.effectiveRawSupply = effectiveRawSupply; // Cache on first-time setup

        return (poolMin, poolMax, redemptions, total);
    }

    function _handleCompute(
        uint256 cQ,
        uint256 key
    ) internal view returns (uint256 unlockPrincipal, uint256 effectiveRawSupply, uint256 total) {
        // 1. Cache storage array locally to prevent reading array length from storage on every iteration
        address[] memory tokens = stakeables;
        uint256 len = tokens.length;

        for (uint256 i = 0; i < len;) {
            address token = tokens[i];
            
            // Fetch data sequentially. If the first check fails, we don't waste gas fetching uQ or mK.
            uint256 sQ = GlobalDollarT(token).startQuarter();
            
            // Flattened logical conditions: drastically reduces JUMPDEST instruction generation
            if (cQ > sQ) {
                uint256 uQ = GlobalDollarT(token).unlockQuarter();
                
                if (cQ <= uQ) {
                    uint256 mK = GlobalDollarT(token).monthKey();
                    
                    if (mK <= key) {
                        uint256 eligibleSupply = GlobalDollarT(token).viewSupply();

                        // 3. Keep all arithmetic in a single unchecked block to reduce overhead
                        unchecked { 
                            total += eligibleSupply; 
                            effectiveRawSupply += (eligibleSupply * multiplier[token]) / 100;

                            if (cQ == uQ && mK == key) {
                                unlockPrincipal += eligibleSupply;
                            }
                        }
                    }
                }
            }

            unchecked { i++; }
        }
    }

    function addToDividendPools(
        uint256 poolAmount,
        uint256 ts,
        bytes32 depositHash
    ) external payable onlyOwner nonReentrant {
        uint256 currentQuarter = calldates(ts);

        EcoQuarterData storage g = ecoDataByQuarter[currentQuarter];
        if(g.ecoSupply == 0) revert QuarterNotCalculated();

        uint256 currentPool = g.ecoPool;
        uint256 newTotal;

        if (currentPool != 0) {
            // Safe evaluation ordering to prevent underflow crashes
            newTotal = currentPool + poolAmount;

            if (newTotal > g.poolMax) { 
                g.ecoPool = g.poolMax;
                newTotal = g.poolMax; // Sync variable for ledger reporting accuracy
            } else if (newTotal < g.poolMin) { 
                revert InvalidPoolAmount(g.poolMin, newTotal);
            } else {
                g.ecoPool = newTotal;
            }
        } else {
            // Base initialization path
            g.ecoPool = poolAmount;
            newTotal = poolAmount;
        }

        ledgerProxy.recordVaultPoolDeposit(
            IGlobalLedger.LedgerPoolHandle({
                currency: payoutToken,
                callingContract: address(this),
                timeStamp: ts,
                nativeAmount: newTotal,
                depositHash: depositHash
            })
        );
    }

    function populateGlobals() public {
        if(msg.sender != owner()) revert NotAuthorized();
        
        for (uint256 i = 0; i < stakeables.length; i++) {
            if (i <= 29) {
                multiplier[stakeables[i]] = 110;
            } else if (i <= 62) {
                multiplier[stakeables[i]] = 115;
            } else if (i <= 98) {
                multiplier[stakeables[i]] = 120;
            } else if (i <= 137) {
                multiplier[stakeables[i]] = 130;
            } else if (i <= 179) {
                multiplier[stakeables[i]] = 140;
            } else if (i <= 224) {
                multiplier[stakeables[i]] = 150;
            } else if (i <= 272) {
                multiplier[stakeables[i]] = 160;
            }
        }
        
        {

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

    }

    function getQuarterData(uint256 cQ) external view returns(EcoQuarterData memory) {
        if(!_isAdmin(msg.sender)) revert NotAuthorized();
        return ecoDataByQuarter[cQ];
    }

    function updateProcessTs(uint256 ts) external {
        processWithdrawTimestamp = ts;
    }

    function getUserTermCount(address user) external view returns (uint256) {
        return withdrawalsByUser[user].length;
    }

    function getUserDepositCount(address user) external view returns (uint256) {
        return depositsByUser[user].length;
    }

    function getDepositTimestampCount() external view returns (uint256[] memory) {
        return depositTimestamps;
    }

    function getWithdrawTimestampCount() external view returns (uint256[] memory) {
        return withdrawTimestamps;
    }

    function getStagePayouts(address user, uint256 term, uint256 stage) public view returns(uint256[] memory) {
        return stagePayouts[user][term][stage];
    }

    function getWithdrawalUser(address user, uint256 index) external view returns (User memory) {
        if (!_isAdmin(msg.sender) || msg.sender != user) revert NotAuthorized();
        return withdrawalsByUser[user][index];
    }

    function getDepositUser(address user, uint256 index) external view returns (Deposit memory) {
        if (!_isAdmin(msg.sender) || msg.sender != user) revert NotAuthorized();
        return depositsByUser[user][index];
    }

    function updateUser(address user, address addressToUpdate, address dividendToken) external {
        address addr;

        if (!_isAdmin(msg.sender)){addr = msg.sender;}
        if (_isAdmin(msg.sender)){addr = user;}

        uint256 len = withdrawalsByUser[addr].length;

        for (uint256 i = len; i > 0; i--) {
            User storage u = withdrawalsByUser[addr][i - 1];


            if (u.dividendToken == dividendToken) {

                // Skip if struct has been finalized
                if (u.stage + 1 >= u.quartersCommitted) continue;

                u.user = addressToUpdate;
            }
        }
    }

    function autoPay(bool ap) external {
        uint256 len = withdrawalsByUser[msg.sender].length;
        User[] storage terms = withdrawalsByUser[msg.sender];

        if(len == 0) revert NoEligibleTerms();

        if (!autopayWhitelistMap[msg.sender] && ap) {

            for (uint256 i = len; i > 0; i--) {
                User storage u = terms[i];
                if (u.user == address(0)) continue;
                if ((u.stage + 1) == u.quartersCommitted) continue;
                u.autoPay = true;
            }

            autopay.push(msg.sender);

        } else {

            for (uint256 i = len; i > 0; i--) {
                User storage u = terms[i];
                if (u.user == address(0)) continue;
                if ((u.stage + 1) == u.quartersCommitted) continue;
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
        uint256 stage,
        bytes32 newTxHash,
        bytes32 refundHash
    ) external onlyOwner {

        if(!_isAdmin(msg.sender)) revert NotAuthorized();

        // At least one of the supplied hashes must be non-zero
        if (newTxHash == bytes32(0) && refundHash == bytes32(0)) {
            revert InvalidHash(newTxHash);
        }

        // Old hash must exist
        bytes32 old;
        bytes32 newHash;

        if (newTxHash != bytes32(0)) {
            if(processedDeposits[newTxHash]) revert HashDuplicated();
            processedDeposits[newTxHash] = true;

            // Load the correct term record
            Withdraw memory wr = withdrawByHash[newTxHash];
            User storage u = withdrawalsByUser[wr.user][wr.termIndex];

            // Stage must be within committed quarters
            if(stage >= u.quartersCommitted) revert PayoutStageOutofBounds();
            
            // A payout must exist for this stage before correcting a hash
            if(u.amountout[stage] == 0) revert SpendNotApproved();

            old = u.payoutTxHash[stage];
            newHash = newTxHash;

            // Apply correction
            u.payoutTxHash[wr.stage] = newTxHash;
            u.payoutSetter[wr.stage] = msg.sender;

            emit PayoutTxHashCorrected(wr.user, stage, old, newHash, msg.sender);

        } else if (refundHash != bytes32(0)) {
            if(processedDeposits[refundHash]) HashDuplicated;
            processedDeposits[refundHash] = true;

            DepositRef memory r = depositsByHash[refundHash];
            Deposit storage d = depositsByUser[r.user][r.depositIndex];

            old = d.refundHash;
            newHash = refundHash;

            // Apply correction
            d.depositTxHash = refundHash;

            emit PayoutTxHashCorrected(r.user, stage, old, newHash, msg.sender);
            
        } else {
            revert InvalidHash(refundHash);
        }
    }

    function getDepositsInRange(uint256 startTs, uint256 endTs, bool process) public {

        if (process) {
            if(msg.sender != owner()) revert NotAuthorized();

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
                    w.dividend,
                    w.quartersCommitted,
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
            calldates(endTs);

            uint256 diff = endTs.diffDays(processWithdrawTimestamp);
            if(diff > 25) revert SpendNotApproved();

            _emitWithdrawRange(processWithdrawTimestamp, endTs);
            processWithdrawTimestamp = endTs;
        } else {
            if(!_isAdmin(msg.sender)) revert NotAuthorized();
            calldates(endTs);
            _emitWithdrawRange(startTs, endTs);
        }
    }

    function _emitWithdrawRange(uint256 startTs, uint256 endTs) internal {
        uint256 len = withdrawTimestamps.length;

        for (uint256 i = 0; i < len;) {
            uint256 ts = withdrawTimestamps[i];
            
            if (ts >= startTs && ts <= endTs) {
                // Read directly from storage pointers to avoid copying large structs to memory
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

    function stableIndex() external view onlyOwner returns(address[] memory stable) {
        
        return stables;
    }

    function stakeableIndex() external view onlyOwner returns(address[] memory stakes) {
        
        return stakeables;
    }

    function adminsIndex() external view onlyOwner returns(address[] memory adns) {
        
        return admins;
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

    function removeFromAdminWhitelist(address[] memory adminToRemove) external onlyOwner {

        bool stc = false;
        bool stk = false;
        bool adn = true;

        _removalHelper(adminToRemove, stc, stk, adn);
    }

    uint256[50] __gap;
}
