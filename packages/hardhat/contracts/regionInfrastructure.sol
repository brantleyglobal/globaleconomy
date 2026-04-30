// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./GBDx.sol";
import "./COPx.sol";

contract RegionInfrastructure is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    GlobalDollarX public stakeablecoins;

    struct Deposit {
        uint256 timestamp;
        uint256 amountin;
        uint256 amountout; 
        address user;
        address token;
        address venture;
        bytes32 depositTxHash; 
    }

    struct Withdraw {
        uint256 timestamp;
        uint256 amountOut;
        address user;
        address payoutToken;
        uint32 termIndex;
        uint8 stage;
        bool autoPay;
    }

    struct User {
        address user;
        address token;
        uint8 quartersCommitted;
        uint16 startQuarter;
        uint16 unlockQuarter;
        bool finalize;
        bool autoPay;
        uint256 timestamp;
        uint256 userDividendAmount;
        uint256 convertedDividendAmount;
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

    address public payoutToken;
    address public payoutAddress;
    address public rtoken;
    address[] public stablecoins;
    address[]  public stakeables;
    address public feeRecipient;
    address constant NATIVE_TOKEN = address(0);
    address constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    uint constant QUARTER_DAYS = 91;
    uint8 public constant TOTAL_TERMS = 8;
    // Add this state variable to track injected time
    uint16 public lastUpdatedTime;
    uint16 public updatedStartQuarter;
    uint256 public depositFeeBps;
    uint256 public totalWithdrawn;
    uint256[] public depositTimestamps;
    uint256[] public withdrawTimestamps;


    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(address => uint256) public tokenPoolBalances;
    mapping(address => uint256) public vaultSupply;
    mapping(address => uint8) public quartersCommitted;
    mapping(uint256 => Deposit) public depositsByTimestamp;
    mapping(bytes32 => bool) public processedDeposits;
    mapping(address => uint256[]) public depositTimestampsByUser;
    mapping(uint256 => Withdraw) public withdrawByTimestamp;
    mapping(address => User[]) public withdrawalsByUser;
    mapping(uint16 => UnlockD) public poolByUnlockQuarter;
    mapping(address => uint256) public venturePoolRequirement;
    mapping(address => uint8) stablecoinIndex;
    mapping(uint8 => RateRange) public rateRange;

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
    event WithdrawInRange( uint256 timestamp, address indexed user, uint256 amountout, address payoutToken, uint32 termIndex, uint8 stage);
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
        address _payoutToken
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

        feeRecipient = _owner;
        depositFeeBps = 25;
        payoutToken = _payoutToken;

        // Initialize stablecoin whitelist and store in map and array for iteration
        /*for (uint256 i = 0; i < initialStables.length; i++) {
            require(initialStables[i] != address(0), "Zero address not allowed");
            stablecoinWhitelistMap[initialStables[i]] = true;
            stablecoins.push(initialStables[i]);
        }*/

       for (uint256 i = 0; i < initialStables.length; i++) {
            address sc = initialStables[i];
            require(sc != address(0), "Zero address not allowed");

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

            uint256 nativeAmount = msg.value;
            
            // Calculate total payment, fee, and net amount
            uint256 fee = 0;

            // Phase 1: Check 15 day window first
            GlobalDollarX(venture).mint(user, nativeAmount);
            uint256 tokenSupply = GlobalDollarX(venture).viewSupply();
            uint256 supply = (tokenSupply + nativeAmount);
            GlobalDollarX(venture).supply(supply);

            uint256 ts = block.timestamp;

            Deposit storage d = depositsByTimestamp[ts];

            d.timestamp = ts;
            d.amountin = amount;
            d.amountout = nativeAmount;
            d.user = msg.sender;
            d.token = token;
            d.venture = venture;
            d.depositTxHash = depositHash;
            depositsByTimestamp[ts] = d;

            depositTimestamps.push(ts);

            emit Deposited(user, nativeAmount, nativeAmount, fee, committedQuarters);

        } else {
            require(_isWhitelisted(token), "Token not whitelisted");
            require (msg.sender == owner(), "Only Owner Required for off-chain deposits");

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

            uint256 ts = block.timestamp;

            Deposit storage d = depositsByTimestamp[ts];

            d.timestamp = ts;
            d.amountin = amount;
            d.amountout = gbdAmountout;
            d.user = msg.sender;
            d.token = token;
            d.venture = venture;
            d.depositTxHash = depositHash;

            depositTimestamps.push(ts);

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

    function _computeStableAmountOut(
        uint256 holderBalance,
        uint256 rate
    ) internal view returns (uint256) {
        uint256 stableAmountOut = (holderBalance * rate) / 1e18;

        uint8 i = stablecoinIndex[payoutToken];

        RateRange memory r = rateRange[i];

        // Compute min/max using the mapped rate values
        uint256 minRate = (((holderBalance * DECIMALS) / r.min) * GBDr) / DECIMALS;
        uint256 maxRate = (((holderBalance * DECIMALS) / r.max) * GBDr) / DECIMALS;

        if (stableAmountOut < minRate || stableAmountOut > maxRate) {
            stableAmountOut = maxRate;
        }

        return stableAmountOut;
    }

    function _processInitialWithdraw(
        address dividendToken,
        uint16 currentQuarter,
        uint256 holderBalance
    ) internal {
        uint256 rate = 107e16; // 1.07 * 1e18 (example rate, adjust as needed)
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

        uint256 ts = block.timestamp;
        // Allocate a new struct slot
        withdrawalsByUser[msg.sender].push();

        // Now get the index of the new struct
        uint32 termIndex = uint32(withdrawalsByUser[msg.sender].length - 1);

        User storage u = withdrawalsByUser[msg.sender][termIndex];

        u.user = msg.sender;
        u.token = dividendToken;
        u.quartersCommitted = committedQuarters;
        u.startQuarter = startQuarter;
        u.unlockQuarter = unlockQuarter;
        u.userDividendAmount = holderBalance;
        u.convertedDividendAmount = _computeStableAmountOut(holderBalance, rate);
        u.termTotalSupply = totalSupply;
        u.finalize = false;

        uint256 payout = 0;
        uint8 stage = 0;  // stage = 0
        // includes milestone
        
        if (stageCheck >= 1) {
            for (stage = 0; stage < stageCheck; stage++) {

                if (u.finalize) revert("All payouts completed");

                // Skip if already paid
                if (u.amountout[stage] != 0) continue;

                // Skip if supply not ready
                if (u.termTotalSupply == 0) continue;

                payout = _computePayout(u);
                u.amountout[stage] = payout;

                if (stage + 1 == totalPayoutStages) {
                    u.finalize = true;
                }

                ts = block.timestamp + stage;

                withdrawByTimestamp[ts] = Withdraw(
                    ts,
                    payout,
                    msg.sender,
                    payoutToken,
                    termIndex,
                    stage,
                    u.autoPay
                );

                withdrawTimestamps.push(ts);
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
            uint256 payout
        )
    {
        uint8 redeemPeriod = GlobalDollarX(u.token).redeemPeriod();

        uint256 rate = GlobalDollarX(u.token).annualRate(); // 5% simple interest per quarter after milestone (adjust as needed)
        uint256 quarterlyRate = rate / 4;

        uint256 principal = u.convertedDividendAmount;

        // --- Quarterly payout with principal + interest ---
        uint256 principalSlice = principal / redeemPeriod;
        uint256 interestSlice  = ((principal * quarterlyRate) / 10000);

        payout = (principalSlice + interestSlice);

        return (payout);
    }

    function _processPayout(
        address user,
        uint16 currentQuarter
    ) internal {

        uint32 termIndex = _findEligibleTerm(user, currentQuarter);
        uint256 ts = block.timestamp;

        User storage u = withdrawalsByUser[user][termIndex];

        (, uint16 unlockQuarter, uint8 committedQuarters, uint8 stageCheck) = computeQuarterData(u.token, currentQuarter);

        require(u.user != address(0), "No prior withdrawal found");
        if (u.finalize) revert("All payouts completed");

        uint8 totalPayoutStages = GlobalDollarX(u.token).redeemPeriod(); // --- Includes the Milestone Quarter

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

        require(nextStage < stageCheck, "Next stage not unlocked yet");

        if (stageCheck >= 1) {
            for (stage = nextStage; stage < stageCheck; stage++) {
                if (u.finalize) revert("All payouts completed");

                // Skip if already paid
                if (u.amountout[stage] != 0) continue;

                // Skip if supply not ready
                if (u.termTotalSupply == 0) continue;

                payout = _computePayout(u);
                u.amountout[stage] = payout;

                if (stage + 1 == totalPayoutStages) {
                    u.finalize = true;
                }

                ts = block.timestamp + stage;

                withdrawByTimestamp[ts] = Withdraw(
                    ts,
                    payout,
                    msg.sender,
                    payoutToken,
                    termIndex,
                    stage,
                    u.autoPay
                );

                withdrawTimestamps.push(ts);
                emit UserWithdraw(ts, msg.sender, committedQuarters, unlockQuarter, payout, termIndex, stage);
            }
        } else {
            revert("Payout for not available or payout has been processed");
        }
    }

    function withdraw(
        address dividendToken,
        uint256 holderBalance
    ) external payable nonReentrant {

        if (holderBalance != 0) {
            _processInitialWithdraw(dividendToken, lastUpdatedTime, holderBalance);
        } else {
            _processPayout(msg.sender, lastUpdatedTime);
        }
    }

    function withdrawAdmin(
        address user,
        address venture,
        uint16 injectedTime
    ) external payable onlyOwner {
        calldates(venture, injectedTime);

        _processPayout(user, injectedTime);
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
        uint256 supply = GlobalDollarX(venture).totalSupply();
        uint256 quarterlyRate = annualRate / 4;

        require(supply > 0 && term > 0 && annualRate > 0, "Venture not initialized");

        // --- Convert supply to payout token
        uint256 exchangeRate = 107e16; // 1.07 * 1e18,
        uint256 principal = _computeStableAmountOut(supply, exchangeRate);

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
        uint16 currentQuarter
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

    function getUserDeposit(address user, uint32 index)
        external
        view
        returns (Deposit memory)
    {
        uint256 ts = depositTimestampsByUser[user][index];
        return depositsByTimestamp[ts];
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
        uint32 termIndex,
        uint8 stage,
        bytes32 txHash
    ) external {

        require(termIndex < withdrawalsByUser[user].length, "Invalid term index");
        require(!processedDeposits[txHash], "Duplicate Hash");
        processedDeposits[txHash] = true;

        User storage u = withdrawalsByUser[user][termIndex];

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
        u.payoutTxHash[stage] = txHash;
        u.payoutSetter[stage] = msg.sender;
    }

    function correctPayoutTxHash(
        address user,
        uint32 termIndex,
        uint8 stage,
        bytes32 newTxHash
    ) external onlyOwner {

        // Validate term index
        //require(termIndex < withdrawalsByUser[user].length, "Invalid term index");

        // Load the correct term record
        User storage u = withdrawalsByUser[user][termIndex];

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

        // Old hash must exist
        bytes32 old = u.payoutTxHash[stage];
        require(old != bytes32(0), "Nothing to correct");

        // Apply correction
        u.payoutTxHash[stage] = newTxHash;
        u.payoutSetter[stage] = msg.sender;

        emit PayoutTxHashCorrected(user, stage, old, newTxHash, msg.sender);
    }

    function getDepositsInRange(uint256 startTs, uint256 endTs) public {
        for (uint256 i = 0; i < depositTimestamps.length; i++) {
            uint256 ts = depositTimestamps[i];
            if (ts >= startTs && ts <= endTs) {
                Deposit memory w = depositsByTimestamp[ts];
                emit DepositInRange(w.timestamp, w.user, w.token, w.venture, w.amountin, w.amountout);
            }
        }
    }

    function getWithdrawInRange(uint256 startTs, uint256 endTs) public {
        for (uint256 i = 0; i < withdrawTimestamps.length; i++) {
            uint256 ts = withdrawTimestamps[i];
            if (ts >= startTs && ts <= endTs) {
                Withdraw memory w = withdrawByTimestamp[ts];
                emit WithdrawInRange(w.timestamp, w.user, w.amountOut, w.payoutToken, w.termIndex, w.stage);
            }
        }
    }

    uint256[50] __gap;
}
