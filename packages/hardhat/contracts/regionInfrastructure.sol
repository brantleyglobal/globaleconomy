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

    GlobalDominionX public stakeablecoins;

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

    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(address => uint256) public tokenPoolBalances;
    mapping(address => uint256) public vaultSupply;
    mapping(address => uint8) public multiplier;
    mapping(address => uint8) public quartersCommitted;

    event Deposited(address indexed user, uint256 amount, uint32 committedQuarters);
    event DividendPaid(address indexed user, uint256 amount);
    event RedemptionPaid(address indexed user, uint256 amount);
    event RedemptionFulfilled(address indexed user, uint256 amount, uint256 tokenId);
    event CapitalSpent(address indexed recipient, uint256 amount, string reason);
    event AddressChecked(address dividendToken, address payoutToken, uint16 unlockQ);
    event StakeableAddress(address indexed addr);
    event UpdateFailed(address indexed addr, uint256 index, string reason);
    event PoolBalanceUpdated(address indexed token, uint256 newBalance);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);

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

            try GlobalDominionX(addr).update(_injectedTime) {
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
        address token,
        uint256 amount,
        uint8 committedQuarters,
        uint16 injectedTime
    ) external payable nonReentrant {
        lastUpdatedTime = injectedTime;
        require(_isWhitelisted(token), "Token not whitelisted");
        calldates(injectedTime);
        
        uint256 fee = (amount * depositFeeBps) / 10000;
        uint256 netAmount = amount - fee;
        uint256 gbdAmountout = 0;
        
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

                    if (gbdAmountout < minRate || gbdAmountout > maxRate) {
                        gbdAmountout = minRate;
                    }

                    break; // Exit loop once stable is matched and processed
            }
        }

        uint256 startIndex;
        uint256 endIndex;
        // Map committed quarter groups to array indices
        if (committedQuarters == 2) {
            startIndex = 0; endIndex = 3;
        } else if (committedQuarters == 3) {
            startIndex = 4; endIndex = 9;
        } else if (committedQuarters == 4) {
            startIndex = 10; endIndex = 15;
        } else if (committedQuarters == 5) {
            startIndex = 16; endIndex = 23;
        } else if (committedQuarters == 6) {
            startIndex = 23; endIndex = 31;
        } else if (committedQuarters == 7) {
            startIndex = 32; endIndex = 40;
        } else if (committedQuarters == 8) {
            startIndex = 41; endIndex = 49;
        }

        bool minted = false;

        // Phase 1: Check 15 day window first
        for (uint256 i = startIndex; i <= endIndex; i++) {
            GlobalDominionX instance = GlobalDominionX(stakeables[i]);
            uint16 previousComingQuarter = instance.previousComingQuarter();
            if (injectedTime >= previousComingQuarter && injectedTime <= previousComingQuarter + 15 && previousComingQuarter != 0) {
                instance.mint(msg.sender, gbdAmountout);
                minted = true;
                uint256 tokenSupply = instance.viewSupply();
                uint256 supply = (tokenSupply + gbdAmountout);
                instance.supply(supply);
                break; // exit loop on first mint
            }
        }

        // Phase 2: Only run if not minted yet
        if (!minted) {
            uint16 closestComingQuarter = type(uint16).max;
            uint256 closestIndex = type(uint256).max;

            for (uint256 i = startIndex; i <= endIndex; i++) {
                GlobalDominionX instance = GlobalDominionX(stakeables[i]);
                uint16 comingQuarter = instance.comingQuarter();
                if (comingQuarter > injectedTime && comingQuarter < closestComingQuarter) {
                    closestComingQuarter = comingQuarter;
                    closestIndex = i;
                }
            }

            if (closestIndex != type(uint256).max) {
                GlobalDominionX instance = GlobalDominionX(stakeables[closestIndex]);
                instance.mint(msg.sender, gbdAmountout);
                minted = true;
                uint256 tokenSupply = instance.viewSupply();
                uint256 supply = (tokenSupply + gbdAmountout);
                instance.supply(supply);
            }
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        if (fee > 0) {
            IERC20(token).safeTransfer(feeRecipient, fee);
        }

        emit Deposited(msg.sender, gbdAmountout, committedQuarters);
    }

    function withdraw(address dividendToken, uint16 injectedTime, uint256 holderBalance) external payable nonReentrant{
        //require(_isWhitelistedx(dividendToken), "Token not whitelisted");

        calldates(injectedTime);

        //*****Quarter Check ******/
        uint16 quarterCheck = GlobalDominionX(dividendToken).unlockQuarter();
        uint16 redemptionEnd = GlobalDominionX(dividendToken).comingQuarter();

        uint256 stableAmountOut = 0;
        
        if ((quarterCheck >= injectedTime) && (injectedTime < redemptionEnd)) {
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

                    if (stableAmountOut < minRate || stableAmountOut > maxRate) {
                        stableAmountOut = minRate;
                    }

                    break; // Exit loop once stable is matched and processed
                }
            }
        }

        uint256 totalSupply = GlobalDominionX(dividendToken).viewSupply();
        uint256 test = 5000 * 1e18;
        tokenPoolBalances[dividendToken] += test;
        uint256 poolBalance = tokenPoolBalances[dividendToken];

        uint256 payout = ((stableAmountOut * (poolBalance)) / (totalSupply)) + stableAmountOut;

        IERC20(dividendToken).safeTransferFrom(msg.sender, address(this), holderBalance);

        vaultSupply[dividendToken] += holderBalance;

        // Transfer the underlying asset to the user
        IERC20(payoutToken).safeTransfer(msg.sender, payout);

        emit RedemptionFulfilled(msg.sender, stableAmountOut, holderBalance);
        emit AddressChecked(dividendToken, payoutToken, quarterCheck);
    }

    function getEcoSupply(address token) public view returns (uint256){
        uint256 totalSupply = 0;
        for (uint256 i = 0; i < stakeables.length; i++) {
            if (stakeables[i] == token) {
                GlobalDominionX instance = GlobalDominionX(stakeables[i]);
                uint256 supply = instance.viewSupply();
                totalSupply += supply;
            }
        }
        return totalSupply;
    }

    function addToDividendPools(
        uint256 poolAmount,
        uint16 injectedTime
    ) external payable nonReentrant {
        uint256 length = stakeables.length;
        uint256 totalWeightedMultiplier = 0;
        uint256 totalRedemptions = 0;

        IERC20(payoutToken).safeTransferFrom(msg.sender, address(this), poolAmount);

        // First pass: identify redemption and eligible tokens, sum multipliers and total redemption amounts
        for (uint256 i = 0; i < length; i++) {
            address token = stakeables[i];
            GlobalDominionX instance = GlobalDominionX(token);

            uint16 redemptionEnd = instance.comingQuarter();
            uint16 redemptionStart = instance.unlockQuarter();

            if (injectedTime >= redemptionStart && injectedTime <= redemptionEnd) {
                // Token in redemption period: sum redemption amounts to subtract later
                totalRedemptions += vaultSupply[token];
            } else {
                // Token eligible for dividend pool
                totalWeightedMultiplier += multiplier[token];
            }
        }

        emit RedemptionFulfilled(msg.sender, totalWeightedMultiplier, totalRedemptions);

        require(totalWeightedMultiplier > 0 || totalRedemptions > 0, "No tokens eligible or no redemptions");

        // Adjust the pool amount by removing redemptions
        require(poolAmount >= totalRedemptions, "Pool amount less than redemption total");
        uint256 adjustedPoolAmount = poolAmount - totalRedemptions;

        // Second pass: distribute adjusted pool amount proportionally to eligible tokens,
        // add redemption amounts directly to pool balances for tokens in redemption.
        for (uint256 i = 0; i < length; i++) {
            address token = stakeables[i];
            GlobalDominionX instance = GlobalDominionX(token);

            uint16 redemptionEnd = instance.comingQuarter();
            uint16 redemptionStart = instance.unlockQuarter();

            if (injectedTime >= redemptionStart && injectedTime <= redemptionEnd) {
                // Add redemption amount directly to pool balance for this token
                uint256 redemptionAmount = vaultSupply[token];
                if (redemptionAmount > 0) {
                    tokenPoolBalances[token] += redemptionAmount;
                    emit PoolBalanceUpdated(token, tokenPoolBalances[token]);
                }
            } else {
                // Allocate proportional share of adjustedPoolAmount based on multiplier
                uint8 tokenMultiplier = multiplier[token];
                if (tokenMultiplier > 0) {
                    uint256 tokenShare = (adjustedPoolAmount * tokenMultiplier) / totalWeightedMultiplier;
                    tokenPoolBalances[token] += tokenShare;
                    emit PoolBalanceUpdated(token, tokenPoolBalances[token]);
                }
            }
        }
    }

    function withdrawLapsed(uint16 _injectedTime ) external onlyOwner nonReentrant {

        uint256 purgeAmount = 0;

        for (uint256 i = 0; i < stakeables.length; i++) {
            address addr = stakeables[i];
            //emit StakeableAddress(addr);

            uint16 redemptionEnd = GlobalDominionX(addr).comingQuarter();
            if (_injectedTime >= redemptionEnd) {
                purgeAmount += tokenPoolBalances[addr];
                tokenPoolBalances[addr] = 0;
                uint256 deduct = vaultSupply[addr];
                uint256 updatedSupply = GlobalDominionX(addr).viewSupply() - deduct;
                GlobalDominionX(addr).supply(updatedSupply);
            }

            try GlobalDominionX(addr).update(_injectedTime) {
                // success
            } catch Error(string memory reason) {
                emit UpdateFailed(addr, i, reason);
            } catch {
                emit UpdateFailed(addr, i, "Unknown error");
            }
        }

        IERC20(payoutToken).safeTransfer(feeRecipient, purgeAmount);

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
                multiplier[stakeables[i]] = 100; // default or fallback multiplier if index > 49
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
                IERC20(token).safeTransfer(payoutAddress, tokenBalance);
                totalWithdrawn += tokenBalance;
                emit FundsWithdrawn(token, payoutAddress, tokenBalance);
            }
        }
    }

    function toDate(address dividendToken, uint256 _holderBalance) public view returns (uint256) {
        
        uint256 poolBalance = tokenPoolBalances[dividendToken];
        uint256 totalSupply = GlobalDominionX(dividendToken).viewSupply();

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
            GlobalDominionX instance = GlobalDominionX(token);

            uint16 redemptionStart = instance.unlockQuarter();
            uint16 redemptionEnd = instance.comingQuarter();

            if (injectedTime >= redemptionStart && injectedTime <= redemptionEnd) {
                uint256 supply = instance.viewSupply();
                totalSupply += supply;
            }
        }

        return totalSupply; // Returns sum of supply for all eligible tokens
    }

    uint256[50] __gap;
}
