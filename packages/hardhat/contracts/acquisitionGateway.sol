// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./libraries/smartVaultLib.sol";
import "./GBDo.sol";
import "./GBDx.sol";
import "./COPx.sol";

contract AcquisitionGateway is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    struct Purchase {
        uint256 timestamp;
        address user;
        address token;
        uint256 amountin;
        uint256 amountout;
    }

    GlobalDollar public stakeablecoins;

    address[] public stablecoins;
    
    address constant NATIVE_TOKEN = address(0);

    uint256[] public purchaseTimestamps;
    uint256 public depositFeeBps;
    
    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(uint256 => Purchase) public purchasesByTimestamp;

    event Acquisitioned(address indexed user, uint256 amountOut, uint256 amountIn);
    event PurchaseTimestamp( uint256 timestamp, address indexed user, address token, uint256 amountOut, uint256 amountIn);


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
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        depositFeeBps = 25;

        // Initialize stablecoin whitelist and store in map and array for iteration
        for (uint256 i = 0; i < initialStables.length; i++) {
            require(initialStables[i] != address(0), "Zero address not allowed");
            stablecoinWhitelistMap[initialStables[i]] = true;
            stablecoins.push(initialStables[i]);
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
        uint256 rate
    ) external payable onlyOwner nonReentrant {
        require(_isWhitelisted(token), "Token not whitelisted");
        
        uint256 fee = (amountin * depositFeeBps) / 10000;
        uint256 baseAmount = amountout / rate;
        uint256 netAmount = baseAmount - fee;
        uint256 gbdAmountout = amountout - fee;
        
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
                } else if (i == 22) {
                    maxRate = (((netAmount * DECIMALS) / GBDr) * RATE_600) / DECIMALS;
                    minRate = (((netAmount * DECIMALS) / GBDr) * RATE_600) / DECIMALS;
                }

                if (gbdAmountout < minRate || gbdAmountout > maxRate) {
                    gbdAmountout = minRate;
                }

                break; // Exit loop once stable is matched and processed
            }
        }

        /*GlobalDollar gbdo = GlobalDollar(stablecoins[0]);
        gbdo.mint(user, gbdAmountout);*/

        uint256 ts = block.timestamp;
        purchasesByTimestamp[ts] = Purchase(ts, user, token, amountin, gbdAmountout);
        purchaseTimestamps.push(ts);

        emit Acquisitioned(user, gbdAmountout, amountin);
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
