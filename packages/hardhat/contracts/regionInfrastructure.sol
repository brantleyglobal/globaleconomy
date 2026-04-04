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
        uint16 termIndex;
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
    mapping(address => uint256[]) public depositTimestampsByUser;
    mapping(uint256 => Withdraw) public withdrawByTimestamp;
    mapping(address => User[]) public withdrawalsByUser;
    mapping(uint16 => UnlockD) public poolByUnlockQuarter;

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
    event WithdrawInRange( uint256 timestamp, address indexed user, uint256 amountout, address payoutToken, uint16 termIndex, uint8 stage);
    event DepositInRange( uint256 timestamp, address indexed user, address token, address venture, uint256 amountin, uint256 amountout);
    event UserWithdraw( uint256 timestamp, address indexed user, uint8 quartersCommitted, uint16 unlockQuarter, uint256 amountout, uint16 termIndex, uint8 stage);
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

    // Modifier to validate the injected time parameter //INVALID
    modifier validInjectedTime(uint256 currentQuarter) {
        require(currentQuarter > lastUpdatedTime, "Injected time must advance");
        // Optionally allow some future tolerance, e.g., not more than 10 minutes ahead of block.timestamp
        require(currentQuarter <= block.timestamp + 10 minutes, "Injected time too far in future");
        _;
    }

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
        for (uint256 i = 0; i < initialStables.length; i++) {
            require(initialStables[i] != address(0), "Zero address not allowed");
            stablecoinWhitelistMap[initialStables[i]] = true;
            stablecoins.push(initialStables[i]);
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

    function calldates(uint16 _currentQuarter) public {
        // Unlock quarters already set, just update
        lastUpdatedTime = _currentQuarter;
        for (uint256 i = 0; i < stakeables.length; i++) {
            address addr = stakeables[i];
            //emit StakeableAddress(addr);

            uint256 purgeAmount = 0;
            uint16 redemptionEnd = GlobalDollarX(addr).comingQuarter();
            if (_currentQuarter >= redemptionEnd) {
                purgeAmount += tokenPoolBalances[addr];
                tokenPoolBalances[addr] = 0;
                uint256 deduct = vaultSupply[addr];
                uint256 updatedSupply = GlobalDollarX(addr).viewSupply() - deduct;
                GlobalDollarX(addr).supply(updatedSupply);
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
        address user,
        address token,
        address venture,
        uint256 amount,
        uint16 currentQuarter,
        uint256 incomingRate 
    ) external payable nonReentrant {

        if (token == address(0)) {
            uint8 gracePeriod = GlobalDollarX(venture).gracePeriod();
            uint8 committedQuarters = GlobalDollarX(venture).committedQuarters();
            uint16 unlockQuarter = GlobalDollarX(venture).unlockQuarter();

            require(lastUpdatedTime > (unlockQuarter - committedQuarters) + gracePeriod, "Deposit outside grace period");

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
            //d.depositTxHash = depositHash;
            depositsByTimestamp[ts] = d;

            depositTimestamps.push(ts);

            emit Deposited(user, nativeAmount, nativeAmount, fee, committedQuarters);

        } else {
            require(_isWhitelisted(token), "Token not whitelisted");
            require (msg.sender == owner(), "Only Owner Required for off-chain deposits");

            uint8 gracePeriod = GlobalDollarX(venture).gracePeriod();
            uint8 committedQuarters = GlobalDollarX(venture).committedQuarters();
            uint16 unlockQuarter = GlobalDollarX(venture).unlockQuarter();

            require(lastUpdatedTime > (unlockQuarter - committedQuarters) + gracePeriod, "Deposit outside grace period");

            calldates(currentQuarter);

            uint256 fee = (amount * (depositFeeBps)) / 10000;
            uint256 baseAmount = (amount * incomingRate) / 1e18;
            uint256 netAmount = baseAmount - fee;
            uint256 gbdAmountout = amount - fee;

            for (uint256 i = 0; i < stablecoins.length; i++) {
                if (stablecoins[i] == token) {
                    uint256 minRate;
                    uint256 maxRate;
                    if (i == 0 || i == 1 || i == 3 || i == 5 || i == 9 || i == 11 || i == 12 || i == 13) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_098) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_102) / DECIMALS;
                    } else if (i == 14) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_065) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_069) / DECIMALS;
                    } else if (i == 2) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_072) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_076) / DECIMALS;
                    } else if (i == 4 || i == 19) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_108) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_112) / DECIMALS;
                    } else if (i == 6) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_097) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_100) / DECIMALS;
                    } else if (i == 7) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_0065) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_0073) / DECIMALS;
                    } else if (i == 8) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_058) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_062) / DECIMALS;
                    } else if (i == 10) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_074) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_076) / DECIMALS;
                    } else if (i == 15) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_054) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_064) / DECIMALS;
                    } else if (i == 16) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_019) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_021) / DECIMALS;
                    } else if (i == 17) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_120) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_130) / DECIMALS;
                    } else if (i == 18) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_030) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_033) / DECIMALS;
                    } else if (i == 20) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_100000) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_100000) / DECIMALS;
                    } else if (i == 21) {
                        maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_16000) / DECIMALS;
                        minRate = (((netAmount * DECIMALS) / GBDr) * RATE_16000) / DECIMALS;
                    }

                    if (gbdAmountout < maxRate) {
                        gbdAmountout = maxRate;
                    } else if (gbdAmountout > maxRate) {
                        gbdAmountout = maxRate;
                    }

                    break; // Exit loop once stable is matched and processed
                }
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
            //d.depositTxHash = depositHash;
            depositsByTimestamp[ts] = d;

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

        // Start quarter is simply unlock minus committed
        startQuarter = unlockQuarter - committedQuarters;

        // -----------------------------
        // 2. Compute stageCheck
        // -----------------------------

        stageCheck = uint8(currentQuarter - startQuarter);
    }

    function _computeStableAmountOut(
        uint256 holderBalance,
        uint256 rate
    ) internal view returns (uint256) {
        uint256 stableAmountOut = (holderBalance * rate) / 1e18;

        for (uint256 i = 0; i < stablecoins.length; i++) {
            if (stablecoins[i] == payoutToken) {
                uint256 minRate;
                uint256 maxRate;

                if (i == 1 || i == 3 || i == 5 || i == 9 || i == 11 || i == 12 || i == 13) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_098) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_102) * GBDr) / DECIMALS;
                } else if (i == 14) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_065) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_069) * GBDr) / DECIMALS;
                } else if (i == 2) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_072) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_076) * GBDr) / DECIMALS;
                } else if (i == 4 || i == 19) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_108) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_112) * GBDr) / DECIMALS;
                } else if (i == 6) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_097) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_100) * GBDr) / DECIMALS;
                } else if (i == 7) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_0065) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_0073) * GBDr) / DECIMALS;
                } else if (i == 8) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_058) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_062) * GBDr) / DECIMALS;
                } else if (i == 10) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_074) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_076) * GBDr) / DECIMALS;
                } else if (i == 15) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_054) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_064) * GBDr) / DECIMALS;
                } else if (i == 16) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_019) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_021) * GBDr) / DECIMALS;
                } else if (i == 17) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_120) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_130) * GBDr) / DECIMALS;
                } else if (i == 18) {
                    maxRate = (((holderBalance * DECIMALS) / RATE_030) * GBDr) / DECIMALS;
                    minRate = (((holderBalance * DECIMALS) / RATE_033) * GBDr) / DECIMALS;
                }

                if (stableAmountOut < maxRate) {
                    stableAmountOut = maxRate;
                } else if (stableAmountOut > maxRate) {
                    stableAmountOut = maxRate;
                }

                break;
            }
        }

        return stableAmountOut;
    }

    function _computeWithdrawData(
        address dividendToken,
        uint16 currentQuarter,
        uint256 holderBalance
    )
        internal
        view
        returns (
            uint256 stableAmountOut,
            uint256 payout,
            uint256 totalSupply
        )
    {
        // --- Load token parameters ---
        (uint16 startQuarter, uint16 unlockQuarter,,) = computeQuarterData(dividendToken, currentQuarter);
        uint8 redeemPeriod       = GlobalDollarX(dividendToken).redeemPeriod();
        uint256 rate = 107e16; //1.07

        // --- Stable amount (unchanged logic) ---
        stableAmountOut = _computeStableAmountOut(holderBalance, rate);

        uint16 milestoneQuarter = startQuarter + 4;
        uint32 interestElapsed = 0;

        // Before milestone
        if (currentQuarter >= milestoneQuarter) {
            // milestone counts as 1
            interestElapsed = 1;

            if (currentQuarter >= unlockQuarter) {
                // unlock counts as 1 more
                interestElapsed = 2 + (currentQuarter - unlockQuarter);
            }
        }
        
        if (interestElapsed > redeemPeriod) {
            interestElapsed = redeemPeriod;
        }

        uint16 interestRate = 500; // 5% simple interest per quarter after milestone

        // --- Simple interest amortized payout ---
        uint256 principal = holderBalance;
        uint256 principalSlice = principal / redeemPeriod;
        uint256 interestSlice  = (principal * interestRate) / 10000;

        // 1. Before milestone → no payout
        if (interestElapsed == 0) {
            payout = 0;
        }

        // 2. At milestone → first amortized payment
        if (interestElapsed >= 1) {
            payout = principalSlice + interestSlice;
        }

        // --- Total supply (if needed externally) ---
        totalSupply = GlobalDollarX(dividendToken).viewSupply();
    }

    function _processInitialWithdraw(
        address dividendToken,
        uint16 injectedTime,
        uint256 holderBalance
    ) internal {

        (uint16 startQuarter, uint16 unlockQuarter, uint8 committedQuarters, uint8 stageCheck) = computeQuarterData(dividendToken, injectedTime);

        // --- Quarter math (copied from _findEligibleTerm) ---

        bool quarterLapsed = stageCheck >= 1;
        //bool unlockReached = injectedTime >= quarterCheck;

        require(quarterLapsed, "Quarter has not lapsed or unlock quarter not reached");

        IERC20(dividendToken).safeTransferFrom(msg.sender, address(this), holderBalance);
        vaultSupply[dividendToken] += holderBalance;

        // Allocate a new struct slot
        withdrawalsByUser[msg.sender].push();

        // Now get the index of the new struct
        uint16 termIndex = uint16(withdrawalsByUser[msg.sender].length - 1);
        uint8 stage = 0;
        uint256 ts = block.timestamp;

        User storage u = withdrawalsByUser[msg.sender][termIndex];

        (
            uint256 stableAmountOut,
            uint256 payout,
            uint256 totalSupply
        ) = _computeWithdrawData(dividendToken, injectedTime, holderBalance);

        u.user = msg.sender;
        u.token = dividendToken;
        u.startQuarter = startQuarter;
        u.quartersCommitted = committedQuarters;
        u.unlockQuarter = unlockQuarter;
        u.userDividendAmount = holderBalance;
        u.convertedDividendAmount = stableAmountOut;
        u.termTotalSupply = totalSupply;
        u.amountout[0] = payout;
        u.finalize = false;

        withdrawByTimestamp[ts] = Withdraw(
            ts,
            stableAmountOut,
            msg.sender,
            payoutToken,
            termIndex,
            stage,
            u.autoPay
        );

        withdrawTimestamps.push(ts);

        emit UserWithdraw(ts, msg.sender, committedQuarters, unlockQuarter, payout, termIndex, stage);
        emit AddressChecked(dividendToken, payoutToken, unlockQuarter);
    }

    function _findEligibleTerm(address user, uint16 currentQuarter)
        internal
        view
        returns (uint16)   // <-- return uint16 instead of uint256
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
                    return uint16(i);
                }
            }
        }

        revert("No eligible unpaid term found");
    }

    function _computePayoutStage(
        User storage u,
        uint8 lastStage,
        uint16 currentQuarter
    )
        internal
        view
        returns (
            uint256 payout
        )
    {
        uint8 redeemPeriod = GlobalDollarX(u.token).redeemPeriod();

        // --- Interest-eligible elapsed quarters (after unlock) ---
        uint32 rawInterestElapsed = currentQuarter - u.unlockQuarter;
        uint32 uRawinterestElapsed = rawInterestElapsed > 0 ? rawInterestElapsed - 1 : 0;

        // --- Skip if stage not yet unlocked ---
        require(uRawinterestElapsed >= lastStage + 1, "Stage not unlocked yet");

        // --- Force Term & Stage Alignment ---
        uint8 stageAligned = lastStage + 1;

        uint256 rate = 500; // 5% simple interest per quarter after milestone (adjust as needed)

        uint32 interestElapsed = stageAligned;
        if (interestElapsed > redeemPeriod) {
            interestElapsed = redeemPeriod;
        }

        uint256 principal = u.convertedDividendAmount;

        // --- Quarterly payout with principal + interest ---
        uint256 principalSlice = principal / redeemPeriod;
        uint256 interestSlice  = (principal * rate) / 10000;

        payout = principalSlice + interestSlice;

        return (payout);
    }

    function _processPayout(
        address user,
        uint16 currentQuarter
    ) internal {

        uint16 termIndex = _findEligibleTerm(user, currentQuarter);
        uint256 ts = block.timestamp;

        User storage u = withdrawalsByUser[user][termIndex];

        require(u.user != address(0), "No prior withdrawal found");
        if (u.finalize) revert("All payouts completed");

        require(currentQuarter >= u.unlockQuarter, "Unlock quarter not reached");

        // --- Determine last completed stage ---
        uint8 lastStage = 0;
        for (uint8 i = 0; i < u.quartersCommitted; i++) {
            if (u.amountout[i] == 0) {
                lastStage = i;
                break;
            }
        }

        // --- Determine eligible stage from time ---
        uint8 stageCheck = uint8(currentQuarter - u.unlockQuarter);

        // --- Enforce sequential progression ---
        uint8 nextStage = lastStage;
        require(nextStage < u.quartersCommitted, "No more payouts");
        require(stageCheck >= nextStage, "Next stage not unlocked yet");

        // --- Compute payout (ignore returned stage) ---
        (uint256 payout) = _computePayoutStage(u, nextStage, currentQuarter);

        uint8 stage = nextStage;

        // --- Record payout ---
        u.amountout[stage] = payout;

        withdrawByTimestamp[ts] = Withdraw(
            ts,
            payout,
            user,
            payoutToken,
            termIndex,
            stage,
            u.autoPay
        );

        withdrawTimestamps.push(ts);

        // --- Final payout completes the term ---
        if (stage == u.quartersCommitted - 1) {
            u.finalize = true;
        }

        emit UserWithdraw(
            ts,
            user,
            u.quartersCommitted,
            u.unlockQuarter,
            payout,
            termIndex,
            stage
        );
    }

    function withdraw(
        address dividendToken
    ) external payable nonReentrant {
        uint256 holderBalance = IERC20(dividendToken).balanceOf(msg.sender);

        if (holderBalance != 0) {
            _processInitialWithdraw(dividendToken, lastUpdatedTime, holderBalance);
        } else {
            _processPayout(msg.sender, lastUpdatedTime);
        }
    }

    function withdrawAdmin(
        address user,
        uint16 injectedTime
    ) external payable onlyOwner {
        //calldates(injectedTime);

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

    function computeGlobalPoolRange(uint16 currentQuarter, address venture)
        public
        view
        returns (uint256 minPool, uint256 maxPool)
    {
        uint256 annualRate = 500; // 5%
        uint256 quarterlyRate = annualRate * 1e14 / 4; // 1.25% scaled

        uint8 term = GlobalDollarX(venture).redeemPeriod();

        for (uint256 t = 0; t < stakeables.length; t++) {
            address token = stakeables[t];
            User[] storage terms = withdrawalsByUser[token];

            for (uint256 i = 0; i < terms.length; i++) {
                User storage u = terms[i];

                // Skip if struct has been finalized
                if (u.finalize) continue;

                // Skip if before start or after unlock window
                if (currentQuarter < u.startQuarter || currentQuarter > u.unlockQuarter)
                    continue;

                // Compute milestone index (1 year = 4 quarters)
                uint32 milestoneIndex = u.startQuarter + 4;


                uint256 principal = u.convertedDividendAmount;

                // ============================================================
                // 1. MILESTONE PAYMENT (include once)
                // ============================================================
                if (currentQuarter >= milestoneIndex && u.amountout[0] == 0) {
                    uint256 milestoneInterest = (principal * 500) / 10000; // 5%
                    uint256 milestonePayout = milestoneInterest + u.userDividendAmount;

                    minPool += milestonePayout;
                    maxPool += milestonePayout;
                }

                // ============================================================
                // 2. POST-UNLOCK AMORTIZED PAYMENTS
                // ============================================================

                // Skip if before unlock window
                if (currentQuarter < u.unlockQuarter)
                    continue;

                uint32 interestElapsed = currentQuarter - u.unlockQuarter;
                if (interestElapsed > term)
                    interestElapsed = term;

                uint256 principalSlice = principal / term;
                uint256 interestSlice  = (principal * quarterlyRate) / 1e18;

                minPool += interestSlice;
                maxPool += interestSlice;

                // Final quarter adds remaining principal
                if (interestElapsed == term) {
                    uint256 remainingPrincipal = principal - (principalSlice * (term - 1));
                    minPool += remainingPrincipal;
                    maxPool += remainingPrincipal;
                }
            }
        }
    }

    function addToDividendPools(
        uint256 poolAmount,
        uint16 currentQuarter
    ) external onlyOwner nonReentrant {

        calldates(currentQuarter);

        for (uint256 i = 0; i < stakeables.length; i++) {
            address token = stakeables[i];

            // Compute the required payout range for THIS token
            (uint256 minPool, uint256 maxPool) =
                computeGlobalPoolRange(currentQuarter, token);

            // Ensure the poolAmount is valid for this token
            require(poolAmount <= maxPool, "Pool amount out of range");

            // Add the minimum required pool to this token’s pool balance
            tokenPoolBalances[token] += minPool;

            emit PoolBalanceUpdated(token, tokenPoolBalances[token]);
        }
    }

    function withdrawLapsed(uint16 _currentQuarter ) external onlyOwner nonReentrant {

        uint256 purgeAmount = 0;

        for (uint256 i = 0; i < stakeables.length; i++) {
            address addr = stakeables[i];
            //emit StakeableAddress(addr);

            uint16 redemptionEnd = GlobalDollarX(addr).comingQuarter();
            if (_currentQuarter >= redemptionEnd) {
                purgeAmount += tokenPoolBalances[addr];
                tokenPoolBalances[addr] = 0;
                uint256 deduct = vaultSupply[addr];
                uint256 updatedSupply = GlobalDollarX(addr).viewSupply() - deduct;
                GlobalDollarX(addr).supply(updatedSupply);
            }

            try GlobalDollarX(addr).update(_currentQuarter) {
                // success
            } catch Error(string memory reason) {
                emit UpdateFailed(addr, i, reason);
            } catch {
                emit UpdateFailed(addr, i, "Unknown error");
            }
        }

        //IERC20(payoutToken).safeTransfer(feeRecipient, purgeAmount);
        emit Purge(payoutToken, purgeAmount);

    }

    // ============================================================
    // Possible for future payouts in Platform Currency
    // ============================================================

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

    function getUserTerm(address user, uint256 index)
        external
        view
        returns (User memory)
    {
        return withdrawalsByUser[user][index];
    }

    function getUserDepositCount(address user) external view returns (uint256) {
        return depositTimestampsByUser[user].length;
    }

    function getUserDeposit(address user, uint256 index)
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
        uint256 termIndex,
        uint8 stage,
        bytes32 txHash
    ) external {

        require(termIndex < withdrawalsByUser[user].length, "Invalid term index");

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
        uint256 termIndex,
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
