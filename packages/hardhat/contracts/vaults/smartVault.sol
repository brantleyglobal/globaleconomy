// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../proxies/globalLedgerProxy.sol";
import "../currency/GBDx.sol";

contract SmartVault is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    GlobalLedgerProxy public ledgerProxy;
    GlobalDollarX public stakeablecoins;

    struct Deposit {
        uint256 timestamp;
        uint256 amountin;
        uint256 amountout; 
        address user;
        address token;
        address dividend;
        uint8 quartersCommitted;
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
        address dividendToken;
        address payToken;
        uint8 quartersCommitted;
        uint16 startQuarter;
        uint16 unlockQuarter;
        bool finalize;
        bool autoPay;
        uint256 userDividendAmount;
        uint256[8] termSupplyPerStage;
        uint256[8] poolBalancePerStage;
        address[8] payoutSetter;
        uint256[8] amountout;
        bytes32[8] payoutTxHash;
    }

    struct EcoQuarterData {
        uint16 currentQuarter;
        uint256 ecoSupply;
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
    uint256 public processTimestamp;
    uint256[] public depositTimestamps;
    uint256[] public withdrawTimestamps;

    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(address => uint8) public multiplier;
    mapping(address => uint8) public quartersCommitted;
    mapping(uint256 => DepositRef) public depositsByTimestamp;
    mapping(bytes32 => DepositRef) public depositsByHash;
    mapping(address => uint256[]) public depositTimestampsByUser;
    mapping(bytes32 => bool) public processedDeposits;
    mapping(uint256 => bool) public processedDepositsTs;
    mapping(uint256 => Withdraw) public withdrawByTimestamp;
    mapping(bytes32 => Withdraw) public withdrawByHash;
    mapping(address => User[]) public withdrawalsByUser;
    mapping(address => Deposit[]) public depositsByUser;
    mapping(uint16 => EcoQuarterData) public ecoDataByQuarter;
    mapping(address => uint8) stablecoinIndex;
    mapping(uint8 => RateRange) public rateRange;
    mapping(address => mapping(uint32 => mapping(uint8 => uint256[22]))) stagePayouts;


    event Deposited(address indexed user, uint256 amountOut, uint256 amountIn, uint256 fee, uint8 committedQuarters);
    event StakeableAddress(address indexed addr);
    event UpdateFailed(address indexed addr, uint256 index, string reason);
    event PoolBalanceUpdated(address indexed token, uint256 newBalance);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    event WithdrawInRange( address indexed user, uint256 amountout, uint256[] stableOut, address payoutToken, uint32 termIndex, uint8 stage);
    event DepositInRange( uint256 timestamp, address indexed user, address token, address dividend, uint8 quartersCommitted, uint256 amountin, uint256 amountout);
    event UserWithdraw( uint256 timestamp, address indexed user, uint8 quartersCommitted, uint16 unlockQuarter, uint256 amountout, uint32 termIndex, uint8 stage );
    event PayoutTxHashCorrected(address user, uint8 quarter, bytes32 old, bytes32 newTxHash, address payoutSetter);
    event UnexpectedPayoutTxHash(address indexed user,  uint16 unlockQuarter, bytes32 existingHash, address existingSetter, uint256 amount, address attemptedSetter);

    uint256 constant DECIMALS = 1e18;
    uint256 constant GBDr = 1030000000000000000;
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
        populateMultipliers();

        feeRecipient = _owner;
        depositFeeBps = 25;
        payoutToken = _payoutToken;
        ledgerProxy = GlobalLedgerProxy(ledgerProxyAddress);

       // Initialize whitelist and store in map and array for iteration
       for (uint256 i = 0; i < initialStables.length; i++) {
            address sc = initialStables[i];
            //require(sc != address(0), "Zero address not allowed");

            stablecoinWhitelistMap[sc] = true;
            stablecoins.push(sc);

            stablecoinIndex[sc] = uint8(i);
        }

        // Initialize whitelist and store in map and array for iteration
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

    function calldates(uint16 _currentQuarter) public {
        // Unlock quarters already set, just update
        lastUpdatedTime = _currentQuarter;
    
        for (uint256 i = 0; i < stakeables.length; i++) {
            address addr = stakeables[i];
            uint16 redemptionEnd = GlobalDollarX(addr).comingQuarter();
            if (_currentQuarter >= redemptionEnd) {
                GlobalDollarX(addr).supply(0);
            }

            try GlobalDollarX(addr).update(_currentQuarter) {
                // success
            } catch Error(string memory reason) {
                emit UpdateFailed(addr, i, reason);
            } catch {
                emit UpdateFailed(addr, i, "Unknown error");
            }
        }
    }

    // Deposit with reentrancy guard
    function deposit(
        uint256 timeStamp,
        address investor,
        address token,
        uint256 amount,
        uint8 committedQuarters,
        uint16 startQuarter,
        uint256 incomingRate,
        bytes32 depositHash 
    ) external payable nonReentrant {        
        // Calculate total payment, fee, and net amount
        uint256 fee = 0;

        if (token == address(0)) {

            require(!processedDepositsTs[timeStamp], "Duplicate Timestamp");
            processedDepositsTs[timeStamp] = true;
            
            uint256 nativeAmount = msg.value;

            _finalize(timeStamp, updatedStartQuarter, investor, token, committedQuarters, nativeAmount, incomingRate, nativeAmount, depositHash);
            emit Deposited(investor, nativeAmount, amount, fee, committedQuarters);

        } else {
            require (_isAdmin(msg.sender), "Permission Denied");
            require(!processedDeposits[depositHash], "Duplicate Hash");
            processedDeposits[depositHash] = true;
            require(!processedDepositsTs[timeStamp], "Duplicate Timestamp");
            processedDepositsTs[timeStamp] = true;

            fee = (amount * (depositFeeBps)) / 10000;
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

            _finalize(timeStamp, startQuarter, investor, token, committedQuarters, amount, incomingRate, gbdAmountout, depositHash);
            emit Deposited(investor, gbdAmountout, amount, fee, committedQuarters);
        }

    }

    function _finalize(uint256 timeStamp, uint16 startQuarter, address investor, address token, uint8 _committedQuarters, uint256 amount, uint256 rate, uint256 _gbdAmountout, bytes32 _depositHash) internal {
        uint256 startIndex;
        uint256 endIndex;
        // Map committed quarter groups to array indices
        if (_committedQuarters == 2) {
            startIndex = 0; endIndex = 9;
        } else if (_committedQuarters == 3) {
            startIndex = 10; endIndex = 20;
        } else if (_committedQuarters == 4) {
            startIndex = 21; endIndex = 32;
        } else if (_committedQuarters == 5) {
            startIndex = 33; endIndex = 45;
        } else if (_committedQuarters == 6) {
            startIndex = 46; endIndex = 59;
        } else if (_committedQuarters == 7) {
            startIndex = 60; endIndex = 74;
        } else if (_committedQuarters == 8) {
            startIndex = 75; endIndex = 90;
        }

        bool minted = false;

        address mintedTokenAddress;

        uint16 checkMate = startQuarter + _committedQuarters;


        // --- Mint attempt at Unlock Quarter match ---
        for (uint256 i = startIndex; i <= endIndex; i++) {
            GlobalDollarX instance = GlobalDollarX(stakeables[i]);
            uint16 check = instance.unlockQuarter();

            if (checkMate == check) {
                instance.mint(investor, _gbdAmountout);
                minted = true;
                mintedTokenAddress = stakeables[i];
                uint256 tokenSupply = instance.viewSupply();
                uint256 supply = (tokenSupply + _gbdAmountout);
                instance.supply(supply);
                break; // exit loop on first mint
            }
        }

        uint256 ts = timeStamp;

        depositsByUser[investor].push();
        uint32 termIndex = uint32(depositsByUser[investor].length - 1);
        Deposit storage d = depositsByUser[investor][termIndex];

        d.timestamp = ts;
        d.amountin = amount;
        d.amountout = _gbdAmountout;
        d.user = msg.sender;
        d.token = token;
        d.dividend = mintedTokenAddress;
        d.quartersCommitted = _committedQuarters;
        d.depositTxHash = _depositHash;
        
        depositTimestamps.push(ts);

        depositsByTimestamp[ts] = DepositRef({ user: investor, depositIndex: termIndex });
        depositsByHash[_depositHash] = DepositRef({ user: investor, depositIndex: termIndex });

        uint256 nativeAmount = 0;
        uint256 stableAmount = 0;
        if (token == address(0)) {
            nativeAmount = amount;
        } else {
            stableAmount = amount;
        }

        ledgerProxy.recordVaultDeposit(investor, token, ts,  nativeAmount, stableAmount, rate, _depositHash);
    }

    function withdraw(
        address dividendToken,
        address payToken,
        uint256 holderBalance,
        uint256 timeStamp
    ) external payable nonReentrant {

        if (holderBalance != 0) {
            _processInitialWithdraw(dividendToken, payToken, lastUpdatedTime, holderBalance, timeStamp);
        } else {
            _processPayout(msg.sender, lastUpdatedTime, timeStamp);
        }
    }

    function withdrawAdmin(
        address user,
        uint16 currentQuarter,
        uint256 timeStamp
    ) external payable onlyOwner {
        
        _processPayout(user, currentQuarter, timeStamp);
    }

    function _processInitialWithdraw(
        address dividendToken,
        address payToken,
        uint16 currentQuarter,
        uint256 holderBalance,
        uint256 timeStamp
    ) internal {
        (uint16 startQuarter, uint16 unlockQuarter, uint8 committedQuarters, uint8 stageCheck) = computeTermData(dividendToken, currentQuarter);

        require(stageCheck >= 1, "Quarter has not lapsed or unlock quarter not reached");

        IERC20(dividendToken).safeTransferFrom(msg.sender, address(this), holderBalance);

        // Allocate a new struct slot
        withdrawalsByUser[msg.sender].push();

        // Now get the index of the new struct
        uint32 termIndex = uint32(withdrawalsByUser[msg.sender].length - 1);
        User storage u = withdrawalsByUser[msg.sender][termIndex];

        u.user = msg.sender;
        u.dividendToken = dividendToken;
        u.payToken = payToken;
        u.startQuarter = startQuarter;
        u.quartersCommitted = committedQuarters;
        u.unlockQuarter = unlockQuarter;
        u.userDividendAmount = holderBalance;
        u.finalize = false;

        uint8 stage = 0;

        if (stageCheck >= 1) {

            _handlePayout(u, stage, stageCheck, startQuarter, termIndex, timeStamp); 

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

        for (uint256 i = len; i > 0; i--) {
            User memory u = terms[i - 1];

            // Skip if struct has been finalized
            if (u.finalize) continue;

            // compute stage using your existing logic
            (,,, uint8 stage) = computeTermData(u.dividendToken, currentQuarter);

            if (stage <= u.quartersCommitted && u.amountout[stage - 1] == 0) {
                return uint32(i - 1);   // <-- safe cast
            }
        }

        revert("No eligible unpaid term found");
    }

    function computeTermData(
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
        committedQuarters = GlobalDollarX(dividendToken).committedQuarters();

        startQuarter = unlockQuarter - committedQuarters;

        require(currentQuarter >= startQuarter, "Quarter not reached");

        stageCheck = uint8(currentQuarter - startQuarter);

    }

    function _computePayout(
        User storage u,
        uint16 currentQuarter,
        uint8 stageCheck
    )
        internal
        view
        returns (
            uint256 payout
        )
    {

        // --- Pool for current stage ---]
        uint256 ecoPool = ecoDataByQuarter[currentQuarter].ecoPool;
        
        uint256 effectiveRawSupply = 0;
        for (uint256 i = 0; i < stakeables.length; i++) {
            address token = stakeables[i];
            uint256 tokenSupply = GlobalDollarX(token).viewSupply();
            effectiveRawSupply += (tokenSupply * multiplier[token]) / 100;
        }

        uint256 effectiveStake = (u.userDividendAmount * multiplier[u.dividendToken]) / 100;

        //User pro-rata share
        uint256 dividend = (ecoPool * effectiveStake) / effectiveRawSupply;


        if ((stageCheck + 1) == u.quartersCommitted) {
            payout = dividend + u.userDividendAmount;
        } else {
            payout = dividend;
        }
        
    }

    function _processPayout(
        address user,
        uint16 currentQuarter,
        uint256 timeStamp
    ) internal {

        uint32 termIndex = _findEligibleTerm(user, currentQuarter);

        User storage u = withdrawalsByUser[user][termIndex];

        require(u.user != address(0), "No prior withdrawal found");
        if (u.finalize) revert("All payouts completed");

        // --- Compute payout for this stage ---
        (uint16 startQuarter,,, uint8 stageCheck) = computeTermData(u.dividendToken, currentQuarter);

        // --- Determine last completed stage ---
        uint8 stage = 0;
        for (uint8 i = 0; i < u.quartersCommitted; i++) {
            if (u.amountout[i] == 0) {
                stage = i;
                break;
            }
        }

        // --- Determine next stage (sequential enforcement) ---
        require(stage < u.quartersCommitted, "No more payouts");
        require((stageCheck - 1) >= stage, "Next stage not unlocked yet");

        uint8 align = stageCheck - (stage + 1);

        if (align >= 1) {

            // --- Write payout to the correct stage ---
            _handlePayout(u, stage, stageCheck, startQuarter, termIndex, timeStamp); 

        } else {
            revert("Payout for not available or payout has been processed");
        }
    }

    function _handlePayout(
        User storage u,
        uint8 stage,
        uint8 stageCheck,
        uint16 startQuarter,
        uint32 termIndex,
        uint256 timeStamp
    ) internal {

        uint256 payout = 0;
        uint256 ts = timeStamp;
        uint8 end = stageCheck - 1;

        for (uint8 i = stage; i < end; i++) {

            uint16 payoutQuarter = (startQuarter + 1) + i;

            EcoQuarterData storage g = ecoDataByQuarter[payoutQuarter];

            if (g.currentQuarter == 0) {
                g.currentQuarter = payoutQuarter;
            }

            if (g.ecoPool == 0 || g.ecoSupply == 0 || u.amountout[i] != 0)
                continue;

            u.termSupplyPerStage[i] = g.ecoSupply;
            u.poolBalancePerStage[i] = g.ecoPool;
            
            payout = _computePayout(u, payoutQuarter, i);
            u.amountout[i] = payout;

            ts = timeStamp + i; // Ensure unique timestamp for each stage payout

            withdrawByTimestamp[ts] = Withdraw(
                msg.sender,
                termIndex,
                i
            );

            withdrawTimestamps.push(ts);

            // --- Ledger Logic && Update---//

            bool status = (i + 1) == u.quartersCommitted;
            if (status) u.finalize = true;

            //_ledgerWithdraw(u, i, termIndex, payout, ts, status);
            (uint256[22] memory amountOut) = ledgerProxy.vaultWithdraw(msg.sender, address(0), u.dividendToken,  payout, u.userDividendAmount, ts, status);
        
            stagePayouts[u.user][termIndex][i] = amountOut;
            
        }
    }

    /*function _ledgerWithdraw(
        User storage u,
        uint8 stage2,
        uint32 termIndex,
        uint256 payout,
        uint256 ts,
        bool status
    ) internal {
            
        (uint256[22] memory amountOut) = ledgerProxy.vaultWithdraw(msg.sender, address(0), u.dividendToken,  payout, u.userDividendAmount, ts, status);
        
        stagePayouts[u.user][termIndex][stage2] = amountOut;

    }*/

    function computeGlobalPoolRange(uint16 currentQuarter)
        public
        returns (
            uint256 poolMin,
            uint256 poolMax,
            uint256 redemptions,
            uint256 totalEcoSupply
        )
    {
        if (currentQuarter != lastUpdatedTime) {
            calldates(currentQuarter);
        }

        uint256 n = stakeables.length;

        uint256 total = 0;
        uint256 principalBase = 0;     // payout token units
        uint256 unlockPrincipal = 0;   // payout token units

        uint256 minRate = 30;  // 3%
        uint256 maxRate = 120; // 12%


        EcoQuarterData storage g = ecoDataByQuarter[currentQuarter];

        // ---------------------------------------------
        // CASE 1: ecoSupply already exists → READ ONLY
        // ---------------------------------------------
        if (g.ecoSupply > 0) {

            total = g.ecoSupply;
            poolMin = g.poolMin;
            poolMax = g.poolMax;

            if (g.ecoRedemptions == 0){
                
                _handleCompute(currentQuarter, n);

                g.ecoRedemptions = unlockPrincipal;
            }
            
            redemptions = g.ecoRedemptions;

            return (poolMin, poolMax, redemptions, total); // Done
        }

        // ---------------------------------------------
        // CASE 2: ecoSupply == 0 → INITIALIZE OR UPDATE
        // ---------------------------------------------

        if (g.ecoSupply == 0) {

            // First pass: compute total supply
            _handleCompute(currentQuarter, n);


            uint256 minDividend = (principalBase * minRate) / 1000;
            uint256 maxDividend = (principalBase * maxRate) / 1000;

            poolMin = minDividend;
            poolMax = maxDividend;

            // Initialize or update struct
            if (g.currentQuarter == 0) {
                // First-time creation
                g.currentQuarter = currentQuarter;
                g.ecoSupply = total;
                g.ecoRedemptions = unlockPrincipal;
                g.poolMin = unlockPrincipal + minDividend;
                g.poolMax = unlockPrincipal + maxDividend;

            } else {
                // Struct exists → update supply
                g.ecoSupply = total;
                g.ecoRedemptions = unlockPrincipal;
                g.poolMin = unlockPrincipal + minDividend;
                g.poolMax = unlockPrincipal + maxDividend;
            }
        }

        return (poolMin, poolMax, redemptions, total);
    }

    function _handleCompute (
        uint16 currentQuarter,
        uint256 n
    ) internal view returns (uint256 unlockPrincipal, uint256 total) {

        for (uint256 i = 0; i < n; i++) {
            address token = stakeables[i];

            uint16 unlockQuarter = GlobalDollarX(token).unlockQuarter();
            uint8 committedQuarters = GlobalDollarX(token).committedQuarters();

            uint16 startQuarter = unlockQuarter - committedQuarters;

            if (currentQuarter <= startQuarter) continue;

            uint8 stageCheck = uint8(currentQuarter - startQuarter);

            if (stageCheck >= 1) {
                uint256 supply = GlobalDollarX(token).viewSupply();
                total += supply;
                if (currentQuarter <= unlockQuarter && currentQuarter > startQuarter) {
                    unlockPrincipal += supply;
                }
            }
        }
    }

    function addToDividendPools(
        uint256 poolAmount,
        uint16 currentQuarter,
        uint256 timeStamp,
        bytes32 depositHash
    ) external payable onlyOwner nonReentrant {

        if (currentQuarter != lastUpdatedTime) {
            calldates(currentQuarter);
        }
        
        if ((currentQuarter + 1) != updatedStartQuarter) {
            updatedStartQuarter = currentQuarter + 1;
        }

        EcoQuarterData storage g = ecoDataByQuarter[currentQuarter];
        uint256 newTotal;

        // If pool has never been set, allow initialization
        if (g.ecoSupply == 0) {

            revert("Pool Values Not Determined.. Must compute quarter global ranges");

        } else {

            // If pool already exists, ensure we are not exceeding limits
            newTotal = g.ecoPool + poolAmount - g.ecoRedemptions;


            if (newTotal > (g.poolMax - g.ecoRedemptions)) { 
                g.ecoPool = g.poolMax - g.ecoRedemptions;
            } else if (newTotal < (g.poolMin - g.ecoRedemptions)) { 
                revert("Pool amount is not sufficient");
            } else {
                // Update pool
                g.ecoPool = newTotal;
            }
        }

        ledgerProxy.recordVaultPoolDeposit(payoutToken, address(this), timeStamp, newTotal, depositHash);

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

    function populateMultipliers() public {
        for (uint256 i = 0; i < stakeables.length; i++) {
            if (i <= 9) {
                multiplier[stakeables[i]] = 110;
                quartersCommitted[stakeables[i]] = 2;
            } else if (i <= 20) {
                multiplier[stakeables[i]] = 115;
                quartersCommitted[stakeables[i]] = 3;
            } else if (i <= 32) {
                multiplier[stakeables[i]] = 120;
                quartersCommitted[stakeables[i]] = 4;
            } else if (i <= 45) {
                multiplier[stakeables[i]] = 130;
                quartersCommitted[stakeables[i]] = 5;
            } else if (i <= 59) {
                multiplier[stakeables[i]] = 140;
                quartersCommitted[stakeables[i]] = 6;
            } else if (i <= 74) {
                multiplier[stakeables[i]] = 150;
                quartersCommitted[stakeables[i]] = 7;
            } else if (i <= 90) {
                multiplier[stakeables[i]] = 160;
                quartersCommitted[stakeables[i]] = 8;
            }
        }

        rateRange[0]  = RateRange(RATE_102, RATE_098);
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

        rateRange[20] = RateRange(RATE_100000, RATE_100000);
        rateRange[23] = RateRange(RATE_100000, RATE_100000);

        rateRange[22] = RateRange(RATE_16000, RATE_16000);
        rateRange[24] = RateRange(RATE_16000, RATE_16000);

        rateRange[22] = RateRange(RATE_600, RATE_600);

    }

    function getUserTermCount(address user) external view returns (uint256) {
        return withdrawalsByUser[user].length;
    }

    function getUserWithdrawals(address user)
        external
        view
        returns (User[] memory)
    {
        return withdrawalsByUser[user];
    }

    function getUserCurrentTerm(address user)
        external
        view
        returns (User memory)
    {
        uint32 index = uint32(withdrawalsByUser[msg.sender].length - 1);
        return withdrawalsByUser[user][index];
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

    function getQuarterData(uint16 quarter) external view returns (EcoQuarterData memory) {
        return ecoDataByQuarter[quarter];
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

    function changePayoutAddress(address newUser) external onlyOwner {
        uint256 len = withdrawalsByUser[msg.sender].length;
        require(len > 0, "No withdrawals found");

        // Get the most recent withdrawal entry
        User storage u = withdrawalsByUser[msg.sender][len - 1];

        // Only the current payout address can change it
        require(msg.sender == u.user, "Not authorized");

        u.user = newUser;
    }

    function autoPay() external {
        uint256 len = withdrawalsByUser[msg.sender].length;
        require(len > 0, "No withdrawals found");

        User storage u = withdrawalsByUser[msg.sender][len - 1];
        u.autoPay = true;
    }

    function updatePayoutTxHash(
        address user,
        bytes32 newTxHash,
        bytes32 refundHash
    ) external {

        if (_isAdmin(msg.sender)) {

            // At least one of the supplied hashes must be non-zero
            if (newTxHash == bytes32(0) && refundHash == bytes32(0)) {
                revert("No Hash Included In The Transaction Call");
            }

            // Old hash must exist
            bytes32 old;
            bytes32 newHash;

            if (newTxHash != bytes32(0)) {

                Withdraw memory wr = withdrawByHash[newTxHash];
                User storage u = withdrawalsByUser[wr.user][wr.termIndex];

                require(wr.termIndex < withdrawalsByUser[user].length, "Invalid term index");
                require(!processedDeposits[newTxHash], "Duplicate Hash");
                processedDeposits[newTxHash] = true;

                require(!u.finalize, "All payouts completed");
                require(wr.stage <= u.quartersCommitted, "Stage exceeds committed quarters");
                require(wr.stage < 8, "Stage out of range");

                // Must have a payout computed
                uint256 payout = u.amountout[wr.stage];
                require(payout != 0, "Payout not yet computed");

                // Prevent overwriting
                if (u.payoutTxHash[wr.stage] != bytes32(0)) {
                    emit UnexpectedPayoutTxHash(
                        user,
                        u.unlockQuarter,
                        u.payoutTxHash[wr.stage],
                        u.payoutSetter[wr.stage],
                        payout,
                        msg.sender
                    );
                    return;
                }

                // Record tx hash
                u.payoutTxHash[wr.stage] = newTxHash;
                u.payoutSetter[wr.stage] = msg.sender;

                emit PayoutTxHashCorrected(user, wr.stage, old, newHash, msg.sender);

            } else if (refundHash != bytes32(0)) {

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
        } else {
            revert("Permission Denied");
        }
    }

    function correctPayoutTxHash(
        address user,
        uint32 termIndex,
        uint8 stage,
        bytes32 newTxHash,
        bytes32 refundHash
    ) external onlyOwner {

        // Validate term index
        //require(termIndex < withdrawalsByUser[user].length, "Invalid term index");

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

            // Load the correct term record
            Withdraw memory wr = withdrawByHash[newTxHash];
            User storage u = withdrawalsByUser[user][termIndex];


            // No corrections allowed after final payout
            //require(!u.finalize, "All payouts completed");

            // Stage must be within committed quarters
            require(stage <= u.quartersCommitted, "Stage exceeds committed quarters");

            // Stage must be within array bounds (0–7)
            //require(stage < 8, "Stage out of range");

            // A payout must exist for this stage before correcting a hash
            require(u.amountout[stage] != 0, "Payout not yet computed");

            old = u.payoutTxHash[stage];
            newHash = newTxHash;

            // Apply correction
            u.payoutTxHash[wr.stage] = newTxHash;
            u.payoutSetter[wr.stage] = msg.sender;

        } else if (refundHash != bytes32(0)) {
            require(!processedDeposits[refundHash], "Duplicate Hash");
            processedDeposits[refundHash] = true;

            DepositRef memory r = depositsByHash[refundHash];
            Deposit storage d = depositsByUser[r.user][r.depositIndex];

            //old = d.refundHash;
            newHash = refundHash;

            // Apply correction
            d.depositTxHash = refundHash;
            
        } else {
            revert("Invalid Parameters");
        }

        emit PayoutTxHashCorrected(user, stage, old, newHash, msg.sender);
    }

    function getDepositsInRange(uint256 startTs, uint256 endTs) public {

        if (msg.sender == owner()) {

            for (uint256 i = 0; i < depositTimestamps.length; i++) {
                uint256 ts = depositTimestamps[i];
                if (ts >= startTs && ts <= endTs) {
                    DepositRef memory r = depositsByTimestamp[ts];
                    Deposit memory w = depositsByUser[r.user][r.depositIndex];
                    emit DepositInRange(w.timestamp, w.user, w.token, w.dividend, w.quartersCommitted, w.amountin, w.amountout);
                }
            }

        } else {

            require (_isAdmin(msg.sender), "Permission Denied");

            for (uint256 i = 0; i < depositTimestamps.length; i++) {
                uint256 ts = depositTimestamps[i];
                if (ts >= startTs && ts <= endTs) {
                    DepositRef memory r = depositsByTimestamp[ts];
                    Deposit memory w = depositsByUser[r.user][r.depositIndex];
                    emit DepositInRange(w.timestamp, w.user, w.token, w.dividend, w.quartersCommitted, w.amountin, w.amountout);
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
