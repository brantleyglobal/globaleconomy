// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./libraries/smartVaultLib.sol";
import "./GBDx.sol";
import "./COPx.sol";

contract RegionInfrastructure is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    GlobalDollarX public stakeablecoins;

    struct Deposit {
        uint256 timestamp;
        address user;
        address token;
        address venture;
        uint256 amountin;
        uint256 amountout;  
    }

    struct Withdraw {
        uint256 timestamp;
        address user;
        address token;
        address venture;
        uint256 amountin;
        uint256 amountout; 
    }

    struct User {
        address user;
        address token;
        uint8 quartersCommitted;
        uint16 startQuarter;
        uint16 unlockQuarter;
        uint256 userDividendAmount;
        uint256 convertedDividendAmount;
        uint256 termTotalSupply;
        address[8] payoutSetter;
        uint256[8] amountout;
        bytes32[8] payoutTxHash;
        bool finalize;
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
    address public poolManagerAddress;
    address public feeRecipient;
    address constant NATIVE_TOKEN = address(0);
    address constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    uint constant QUARTER_DAYS = 91;
    uint8 public constant TOTAL_TERMS = 8;
    // Add this state variable to track injected time
    uint16 public lastUpdatedTime;
    uint256 public depositFeeBps;
    uint256 public totalWithdrawn;
    uint256[] public depositTimestamps;
    uint256[] public withdrawTimestamps;


    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(address => uint256) public tokenPoolBalances;
    mapping(address => uint256) public vaultSupply;
    mapping(address => uint8) public multiplier;
    mapping(address => uint8) public quartersCommitted;
    mapping(uint256 => Deposit) public depositsByTimestamp;
    mapping(uint256 => Withdraw) public withdrawByTimestamp;
    mapping(address => User[]) public withdrawalsByUser;
    mapping(uint16 => UnlockD) public poolByUnlockQuarter;

    event Deposited(address indexed user, uint256 amountOut, uint256 amountIn, uint256 fee, uint32 committedQuarters);
    event DividendPaid(address indexed user, uint256 amount);
    event RedemptionPaid(address indexed user, uint256 amount);
    event RedemptionFulfilled(address indexed user, address indexed payoutToken, uint256 amount, uint256 tokenId);
    event PoolAdjustment(address indexed user, uint256 totalWeightedMultiplier, uint256 totalToRedeem);
    event CapitalSpent(address indexed recipient, uint256 amount, string reason);
    event AddressChecked(address dividendToken, address payoutToken, uint16 unlockQ);
    event StakeableAddress(address indexed addr);
    event UpdateFailed(address indexed addr, uint256 index, string reason);
    event PoolBalanceUpdated(address indexed token, uint256 newBalance);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    event Purge(address indexed token, uint256 amount);
    event WithdrawInRange( uint256 timestamp, address indexed user, address token, address venture, uint256 amountin, uint256 amountout);
    event DepositInRange( uint256 timestamp, address indexed user, address token, address venture, uint256 amountin, uint256 amountout);
    event DepositTimestamp( uint256 timestamp, address indexed user, address token, address venture, uint256 amountin, uint256 amountout);
    event WithdrawTimestamp( uint256 timestamp, address indexed user, address token, address venture, uint256 amountin, uint256 amountout);
    event UserWithdraw( uint256 timestamp, address indexed user, uint8 quartersCommitted, uint16 unlockQuarter, uint256 amountout);
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

    modifier onlyPoolManager() {
        require(msg.sender == poolManagerAddress, "Not authorized");
        _;
    }

    // Modifier to validate the injected time parameter
    modifier validInjectedTime(uint256 injectedTime) {
        require(injectedTime > lastUpdatedTime, "Injected time must advance");
        // Optionally allow some future tolerance, e.g., not more than 10 minutes ahead of block.timestamp
        require(injectedTime <= block.timestamp + 10 minutes, "Injected time too far in future");
        _;
    }

    function initialize(
        address _owner,
        address[] memory initialStables,
        address[] memory initialStakeables,
        address _payoutToken
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

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

    function setPoolManager(address newManager) external onlyOwner {
        poolManagerAddress = newManager;
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

    function calldates(uint16 _injectedTime) public {
        // Unlock quarters already set, just update
        for (uint256 i = 0; i < stakeables.length; i++) {
            address addr = stakeables[i];
            //emit StakeableAddress(addr);

            uint256 purgeAmount = 0;
            uint16 redemptionEnd = GlobalDollarX(addr).comingQuarter();
            if (_injectedTime >= redemptionEnd) {
                purgeAmount += tokenPoolBalances[addr];
                tokenPoolBalances[addr] = 0;
                uint256 deduct = vaultSupply[addr];
                uint256 updatedSupply = GlobalDollarX(addr).viewSupply() - deduct;
                GlobalDollarX(addr).supply(updatedSupply);
            }

            try GlobalDollarX(addr).update(_injectedTime) {
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
        uint16 injectedTime,
        uint256 incomingRate 
    ) external payable onlyOwner nonReentrant {
        lastUpdatedTime = injectedTime;
        require(_isWhitelisted(token), "Token not whitelisted");
        calldates(injectedTime);
        
        uint256 fee = (amount * depositFeeBps) / 10000;
        uint256 baseAmount = (amount * incomingRate) / 1e18;
        uint256 netAmount = baseAmount - fee;
        uint256 gbdAmountout = amount - fee;
        uint8 committedQuarters;

        for (uint256 i = 0; i < stakeables.length; i++) {
            if (stakeables[i] == venture) {
                if (i == 3 || i == 4){
                    committedQuarters = 4;
                }else{
                    committedQuarters = 12;
                }

                break; // Exit loop once stable is matched and processed

            }
        }
        
        for (uint256 i = 0; i < stablecoins.length; i++) {
            if (stablecoins[i] == token) {
                uint256 minRate;
                uint256 maxRate;
                if (i == 1 || i == 3 || i == 5 || i == 9 || i == 11 || i == 12 || i == 13) {
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
        depositsByTimestamp[ts] = Deposit(ts, user, payoutToken, venture, amount, gbdAmountout);
        depositTimestamps.push(ts);

        emit Deposited(user, gbdAmountout, amount, fee, committedQuarters);
    }

    function computeStartQuarter(uint16 unlockQuarter, uint8 committedQuarters)
        internal
        pure
        returns (uint16)
    {
        uint16 year    = unlockQuarter / 10000;
        uint8 quarter  = uint8(unlockQuarter / 100) % 100;

        uint8 startQ = quarter;
        uint16 startY = year;

        // subtract committedQuarters with rollover
        for (uint8 i = 0; i < committedQuarters; i++) {
            if (startQ == 1) {
                startQ = 4;
                startY -= 1;
            } else {
                startQ -= 1;
            }
        }

        // day = 1 because quarter always begins on day 1
        return (startY * 10000) + (startQ * 100) + 1;
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

    function _processInitialWithdraw(
        address dividendToken,
        uint16 injectedTime,
        uint256 holderBalance,
        uint256 rate
    ) internal {
        uint16 quarterCheck = GlobalDollarX(dividendToken).unlockQuarter();
        uint16 redemptionEnd = GlobalDollarX(dividendToken).comingQuarter();
        uint8 committedQuarters = GlobalDollarX(dividendToken).committedQuarters();
        uint16 startQuarter = computeStartQuarter(quarterCheck, committedQuarters);

        uint256 stableAmountOut = _computeStableAmountOut(holderBalance, rate);

        if ((quarterCheck >= injectedTime) && (injectedTime < redemptionEnd)) {
            // stableAmountOut already adjusted in helper
        }

        uint256 totalSupply = GlobalDollarX(dividendToken).viewSupply();
        uint256 poolBalance = tokenPoolBalances[dividendToken];

        uint256 payout = ((holderBalance * poolBalance) / totalSupply) + stableAmountOut;

        IERC20(dividendToken).safeTransferFrom(msg.sender, address(this), holderBalance);
        vaultSupply[dividendToken] += holderBalance;

        uint256 ts = block.timestamp;
        withdrawByTimestamp[ts] = Withdraw(ts, msg.sender, payoutToken, dividendToken, holderBalance, payout);
        withdrawTimestamps.push(ts);

        User memory u;
        u.user = msg.sender;
        u.token = dividendToken;
        u.startQuarter = startQuarter;
        u.quartersCommitted = committedQuarters;
        u.unlockQuarter = quarterCheck;
        u.userDividendAmount = holderBalance;
        u.convertedDividendAmount = stableAmountOut;
        u.termTotalSupply = totalSupply;
        u.amountout = [uint256(payout),0,0,0,0,0,0,0];
        u.finalize = false;

        withdrawalsByUser[msg.sender].push(u);

        emit UserWithdraw(ts, msg.sender, committedQuarters, quarterCheck, payout);
        emit AddressChecked(dividendToken, payoutToken, quarterCheck);
    }

    function _processPayout(uint16 injectedTime) internal {
        uint256 ts = block.timestamp;

        User storage u = withdrawalsByUser[msg.sender][withdrawalsByUser[msg.sender].length - 1];
        require(u.user != address(0), "No prior withdrawal found");
        if (u.finalize) revert("All payouts completed");

        uint16 sY = u.startQuarter / 10000;
        uint8  sQ = uint8((u.startQuarter / 100) % 100);

        uint16 iY = injectedTime / 10000;
        uint8  iQ = uint8((injectedTime / 100) % 100);

        uint32 startIndex   = uint32(sY) * 4 + uint32(sQ);
        uint32 currentIndex = uint32(iY) * 4 + uint32(iQ);

        uint32 elapsed = currentIndex - startIndex;
        uint8 stage = uint8(elapsed);

        require(stage <= u.quartersCommitted, "No more payouts");
        require(stage < 8, "Stage out of range");
        require(u.amountout[stage] == 0, "Stage already paid");

        UnlockD storage p = poolByUnlockQuarter[u.unlockQuarter];

        uint256 payout;
        if (stage == u.quartersCommitted) {
            uint256 finalDividend = (u.userDividendAmount * p.poolBlalance) / u.termTotalSupply;
            payout = finalDividend + u.userDividendAmount + u.convertedDividendAmount;
            u.finalize = true;
        } else {
            payout = (u.userDividendAmount * p.poolBlalance) / u.termTotalSupply;
        }

        u.amountout[stage] = payout;

        emit UserWithdraw(ts, msg.sender, u.quartersCommitted, u.unlockQuarter, payout);
    }

    function withdraw(
        address dividendToken,
        uint16 injectedTime,
        uint256 holderBalance,
        uint256 rate
    ) external payable nonReentrant {
        calldates(injectedTime);

        if (holderBalance != 0) {
            _processInitialWithdraw(dividendToken, injectedTime, holderBalance, rate);
        } else {
            _processPayout(injectedTime);
        }
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

    function addToDividendPools(
        uint256 poolAmount,
        address venture,
        uint16 injectedTime
    ) external payable nonReentrant {
        uint256 totalWeightedMultiplier = 0;
        uint256 totalRedemptions = 0;

        //IERC20(payoutToken).safeTransferFrom(msg.sender, address(this), poolAmount);

        // First pass: identify redemption and eligible tokens, sum multipliers and total redemption amounts
        GlobalDollarX instance = GlobalDollarX(venture);

        uint16 redemptionEnd = instance.comingQuarter();
        uint16 redemptionStart = instance.unlockQuarter();

        if (injectedTime >= redemptionStart && injectedTime <= redemptionEnd) {
            // Token in redemption period: sum redemption amounts to subtract later
            totalRedemptions += vaultSupply[venture];
        } else {
            // Token eligible for dividend pool
            totalWeightedMultiplier += multiplier[venture];
        }

        emit PoolAdjustment(msg.sender, totalWeightedMultiplier, totalRedemptions);

        require(totalWeightedMultiplier > 0 || totalRedemptions > 0, "No tokens eligible or no redemptions");

        // Adjust the pool amount by removing redemptions
        require(poolAmount >= totalRedemptions, "Pool amount less than redemption total");
        uint256 adjustedPoolAmount = poolAmount - totalRedemptions;

        // Second pass: distribute adjusted pool amount proportionally to eligible tokens,
        // add redemption amounts directly to pool balances for tokens in redemption.

        if (injectedTime >= redemptionStart && injectedTime <= redemptionEnd) {
            // Add redemption amount directly to pool balance for this token
            uint256 redemptionAmount = vaultSupply[venture];
            if (redemptionAmount > 0) {
                tokenPoolBalances[venture] += redemptionAmount;
                emit PoolBalanceUpdated(venture, tokenPoolBalances[venture]);
            }
        } else {
            // Allocate proportional share of adjustedPoolAmount based on multiplier
            uint8 tokenMultiplier = multiplier[venture];
            if (tokenMultiplier > 0) {
                uint256 tokenShare = (adjustedPoolAmount * tokenMultiplier) / totalWeightedMultiplier;
                tokenPoolBalances[venture] += tokenShare;
                emit PoolBalanceUpdated(venture, tokenPoolBalances[venture]);
            }
        }
    }

    function withdrawLapsed(uint16 _injectedTime ) external onlyOwner nonReentrant {

        uint256 purgeAmount = 0;

        for (uint256 i = 0; i < stakeables.length; i++) {
            address addr = stakeables[i];
            //emit StakeableAddress(addr);

            uint16 redemptionEnd = GlobalDollarX(addr).comingQuarter();
            if (_injectedTime >= redemptionEnd) {
                purgeAmount += tokenPoolBalances[addr];
                tokenPoolBalances[addr] = 0;
                uint256 deduct = vaultSupply[addr];
                uint256 updatedSupply = GlobalDollarX(addr).viewSupply() - deduct;
                GlobalDollarX(addr).supply(updatedSupply);
            }

            try GlobalDollarX(addr).update(_injectedTime) {
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

    function populateMultipliers() external {
        for (uint256 i = 0; i < stakeables.length; i++) {
            if (i <= 3) {
                multiplier[stakeables[i]] = 110;
                quartersCommitted[stakeables[i]] = 2;
            } else if (i <= 9) {
                multiplier[stakeables[i]] = 115;
                quartersCommitted[stakeables[i]] = 3;
            } else if (i <= 15) {
                multiplier[stakeables[i]] = 120;
                quartersCommitted[stakeables[i]] = 4;
            } else if (i <= 23) {
                multiplier[stakeables[i]] = 130;
                quartersCommitted[stakeables[i]] = 5;
            } else if (i <= 31) {
                multiplier[stakeables[i]] = 140;
                quartersCommitted[stakeables[i]] = 6;
            } else if (i <= 40) {
                multiplier[stakeables[i]] = 150;
                quartersCommitted[stakeables[i]] = 7;
            } else if (i <= 49) {
                multiplier[stakeables[i]] = 160;
                quartersCommitted[stakeables[i]] = 8;
            } else {
                multiplier[stakeables[i]] = 100;
                quartersCommitted[stakeables[i]] = 9;
            }
        }
    }

    function batchWithdraw() external onlyOwner {
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
    }

    function toDate(address dividendToken, uint256 _holderBalance) public view returns (uint256) {
        
        uint256 poolBalance = tokenPoolBalances[dividendToken];
        uint256 totalSupply = GlobalDollarX(dividendToken).viewSupply();

        uint256 stableAmountOut = 0;
        uint256 decimals = 1e18;
        uint256 minRate = (_holderBalance * 103 * decimals) / (98 * decimals);
        uint256 maxRate = (_holderBalance * 102 * decimals) / (102 * decimals);
        if (stableAmountOut < minRate || stableAmountOut > maxRate) {
            stableAmountOut = (_holderBalance * 101) / (98 * decimals);
        }

        uint256 dividends = (stableAmountOut * poolBalance) / (totalSupply);

        return dividends;
    }

    function getRedemptionSupply(uint16 injectedTime) external view returns (uint256 totalSupply) {
        uint256 length = stakeables.length;
        totalSupply = 0;

        for (uint256 i = 0; i < length; i++) {
            address token = stakeables[i];
            GlobalDollarX instance = GlobalDollarX(token);

            uint16 redemptionStart = instance.unlockQuarter();
            uint16 redemptionEnd = instance.comingQuarter();

            if (injectedTime >= redemptionStart && injectedTime <= redemptionEnd) {
                uint256 supply = instance.viewSupply();
                totalSupply += supply;
            }
        }

        return totalSupply; // Returns sum of supply for all eligible tokens
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

    function updatePayoutTxHash(
        address user,
        uint256 termIndex,
        uint8 stage,
        bytes32 txHash
    ) external {

        // Validate term index
        require(termIndex < withdrawalsByUser[user].length, "Invalid term index");

        // Load the correct term record
        User storage u = withdrawalsByUser[user][termIndex];

        // No updates allowed after final payout
        require(!u.finalize, "All payouts completed");

        // Stage must be within committed quarters
        require(stage <= u.quartersCommitted, "Stage exceeds committed quarters");

        // Stage must be within array bounds (0–7)
        require(stage < 8, "Stage out of range");

        // A payout must exist for this stage before setting a tx hash
        require(u.amountout[stage] != 0, "Payout not yet computed");

        // Prevent overwriting an existing tx hash
        if (u.payoutTxHash[stage] != bytes32(0)) {
            emit UnexpectedPayoutTxHash(
                user,
                u.unlockQuarter,
                u.payoutTxHash[stage],
                u.payoutSetter[stage],
                u.amountout[stage],
                msg.sender
            );
            return;
        }

        // Update tx hash + setter
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
        require(termIndex < withdrawalsByUser[user].length, "Invalid term index");

        // Load the correct term record
        User storage u = withdrawalsByUser[user][termIndex];

        // No corrections allowed after final payout
        require(!u.finalize, "All payouts completed");

        // Stage must be within committed quarters
        require(stage <= u.quartersCommitted, "Stage exceeds committed quarters");

        // Stage must be within array bounds (0–7)
        require(stage < 8, "Stage out of range");

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

    function getDeposit(uint256 timestamp) public {
        Deposit memory d = depositsByTimestamp[timestamp];
        emit DepositTimestamp(d.timestamp, d.user, d.token, d.venture, d.amountin, d.amountout);
    }

    function getWithdraw(uint256 timestamp) public {
        Withdraw memory w = withdrawByTimestamp[timestamp];
        emit WithdrawTimestamp(w.timestamp, w.user, w.token, w.venture, w.amountin, w.amountout);
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
                emit WithdrawInRange(w.timestamp, w.user, w.token, w.venture, w.amountin, w.amountout);
            }
        }
    }

    uint256[50] __gap;
}
