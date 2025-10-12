// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AssetPurchase is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    // --- Storage ---
    uint256 public feeBasisPoints;
    uint256 public totalWithdrawn;
    uint256 internal constant MAX_BPS = 10000;

    address public feeRecipient;
    address public payoutAddress;
    address public poolManagerAddress;
    address[] public stablecoins;

    mapping(address => bool) private stablecoinWhitelistMap;
    // Mapping from user address => productId => quantity
    mapping(address => mapping(uint64 => mapping(uint8 => uint32))) private userAssetQuantities;
    mapping(uint32 => mapping(uint8 => uint256)) public accumBase;

    // --- Events ---
    event AssetAdded(uint64 indexed id);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    event PurchaseMade(
        address indexed buyer,
        uint64 assetId,
        uint32 quantity,
        uint256 rate,
        uint256 baseAmount,
        uint256 fee
    );

    event DebugPurchase(uint32 productId, uint256 base);

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

    modifier onlyPoolManager() {
        require(msg.sender == poolManagerAddress, "Not authorized");
        _;
    }

    // --- Initializer ---
    function initialize(address _owner, address[] memory initialStables) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);
        feeBasisPoints = 25;
        feeRecipient = _owner;

        for (uint256 i = 0; i < initialStables.length; i++) {
            require(initialStables[i] != address(0), "Zero address not allowed");
            stablecoinWhitelistMap[initialStables[i]] = true;
            stablecoins.push(initialStables[i]);
        }
    }

    // --- Admin ---
    function setPayoutAddress(address newAddress) external onlyOwner {
        require(newAddress != address(0), "Invalid address");
        emit PayoutAddressUpdated(payoutAddress, newAddress);
        payoutAddress = newAddress;
    }

    function setPoolManager(address newManager) external onlyOwner {
        poolManagerAddress = newManager;
    }

    function setFeeBasisPoints(uint256 newBps) external onlyOwner {
        require(newBps <= 5000, "Fee too high");
        feeBasisPoints = newBps;
    }

    function _isWhitelisted(address token) internal view returns (bool) {
        return stablecoinWhitelistMap[token];
    }

    // --- Purchase Entry ---
    function purchase(
        address buyer,
        address stable,
        uint32 productId,
        uint256 amount,
        uint32 quantity,
        uint256 rate,
        uint8 region
    ) external payable nonReentrant {
        require(quantity > 0, "Invalid quantity: must be >0");
        require(_isWhitelisted(stable), "Token not whitelisted");
        require(rate > 0, "Missing rate: must be >0");
        require(msg.value == 0, "ETH not accepted for ERC20 payments");
        
        // Add asset and emit event
        userAssetQuantities[buyer][productId][region] += quantity;
        uint256 baseAmount = accumBase[productId][region] * quantity; // unscaled integer

        if (baseAmount == 0 ){
            initializeAccumBase();
        }

        uint256 total = amount * quantity;

        for (uint256 i = 0; i < stablecoins.length; i++) {
            if (stablecoins[i] == stable) {
                uint256 minRate;
                uint256 maxRate;
                if (i == 1 || i == 3 || i == 5 || i == 9 || i == 11 || i == 12 || i == 13) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_098) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_102) * GBDr) / DECIMALS;
                } else if (i == 14) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_065) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_069) * GBDr) / DECIMALS;
                } else if (i == 2) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_072) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_076) * GBDr) / DECIMALS;
                } else if (i == 4 || i == 19) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_108) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_112) * GBDr) / DECIMALS;
                } else if (i == 6) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_097) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_100) * GBDr) / DECIMALS;
                } else if (i == 7) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_0065) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_0073) * GBDr) / DECIMALS;
                } else if (i == 8) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_058) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_062) * GBDr) / DECIMALS;
                } else if (i == 10) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_074) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_076) * GBDr) / DECIMALS;
                } else if (i == 15) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_054) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_064) * GBDr) / DECIMALS;
                } else if (i == 16) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_019) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_021) * GBDr) / DECIMALS;
                } else if (i == 17) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_120) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_130) * GBDr) / DECIMALS;
                } else if (i == 18) {
                    maxRate = (((baseAmount * DECIMALS) / RATE_030) * GBDr) / DECIMALS;
                    minRate = (((baseAmount * DECIMALS) / RATE_033) * GBDr) / DECIMALS;
                }

                if (total < minRate || total > maxRate) {
                    total = minRate;
                }

                break; // Exit loop once stable is matched and processed
            }
        }

        // Calculate total payment, fee, and net amount
        uint256 fee = (total * feeBasisPoints) / MAX_BPS;

        // Transfer total from buyer to contract
        IERC20(stable).safeTransferFrom(msg.sender, address(this), total);

        // Transfer fee to feeRecipient if applicable
        if (fee > 0) {
            IERC20(stable).safeTransfer(feeRecipient, fee);
        }

        emit PurchaseMade(buyer, productId, quantity, rate, baseAmount, fee);
        emit AssetAdded(productId);
    }

    function getUserProductQuantity(address user, uint64 productId, uint8 region) external view returns (uint32) {
        return userAssetQuantities[user][productId][region];
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

    function initializeAccumBase() public {
        // ESeries standard shipping rates (productIds: 120720, 120745, 120770)
        _setBaseAmount(120720, 0, 14000 + 180);
        _setBaseAmount(120720, 1, 14000 + 250);
        _setBaseAmount(120720, 2, 14000 + 220);
        _setBaseAmount(120720, 3, 14000 + 230);
        _setBaseAmount(120720, 4, 14000 + 260);
        _setBaseAmount(120720, 5, 14000 + 210);
        _setBaseAmount(120720, 6, 14000 + 280);
        _setBaseAmount(120720, 7, 14000 + 300);
        _setBaseAmount(120720, 8, 14000 + 350);

        _setBaseAmount(120745, 0, 15000 + 180);
        _setBaseAmount(120745, 1, 15000 + 250);
        _setBaseAmount(120745, 2, 15000 + 220);
        _setBaseAmount(120745, 3, 15000 + 230);
        _setBaseAmount(120745, 4, 15000 + 260);
        _setBaseAmount(120745, 5, 15000 + 210);
        _setBaseAmount(120745, 6, 15000 + 280);
        _setBaseAmount(120745, 7, 15000 + 300);
        _setBaseAmount(120745, 8, 15000 + 350);

        _setBaseAmount(120770, 0, 16000 + 180);
        _setBaseAmount(120770, 1, 16000 + 250);
        _setBaseAmount(120770, 2, 16000 + 220);
        _setBaseAmount(120770, 3, 16000 + 230);
        _setBaseAmount(120770, 4, 16000 + 260);
        _setBaseAmount(120770, 5, 16000 + 210);
        _setBaseAmount(120770, 6, 16000 + 280);
        _setBaseAmount(120770, 7, 16000 + 300);
        _setBaseAmount(120770, 8, 16000 + 350);

        // XSeries heavy shipping rates (productIds: 1207100, 1207200, 1207300,... up to 1207600)
        _setBaseAmount(1207100, 0, 43000 + 450);
        _setBaseAmount(1207100, 1, 43000 + 650);
        _setBaseAmount(1207100, 2, 43000 + 600);
        _setBaseAmount(1207100, 3, 43000 + 620);
        _setBaseAmount(1207100, 4, 43000 + 700);
        _setBaseAmount(1207100, 5, 43000 + 580);
        _setBaseAmount(1207100, 6, 43000 + 750);
        _setBaseAmount(1207100, 7, 43000 + 800);
        _setBaseAmount(1207100, 8, 43000 + 900);

        _setBaseAmount(1207200, 0, 53000 + 450);
        _setBaseAmount(1207200, 1, 53000 + 650);
        _setBaseAmount(1207200, 2, 53000 + 600);
        _setBaseAmount(1207200, 3, 53000 + 620);
        _setBaseAmount(1207200, 4, 53000 + 700);
        _setBaseAmount(1207200, 5, 53000 + 580);
        _setBaseAmount(1207200, 6, 53000 + 750);
        _setBaseAmount(1207200, 7, 53000 + 800);
        _setBaseAmount(1207200, 8, 53000 + 900);

        _setBaseAmount(1207300, 0, 63000 + 450);
        _setBaseAmount(1207300, 1, 63000 + 650);
        _setBaseAmount(1207300, 2, 63000 + 600);
        _setBaseAmount(1207300, 3, 63000 + 620);
        _setBaseAmount(1207300, 4, 63000 + 700);
        _setBaseAmount(1207300, 5, 63000 + 580);
        _setBaseAmount(1207300, 6, 63000 + 750);
        _setBaseAmount(1207300, 7, 63000 + 800);
        _setBaseAmount(1207300, 8, 63000 + 900);

        _setBaseAmount(1207400, 0, 73000 + 450);
        _setBaseAmount(1207400, 1, 73000 + 650);
        _setBaseAmount(1207400, 2, 73000 + 600);
        _setBaseAmount(1207400, 3, 73000 + 620);
        _setBaseAmount(1207400, 4, 73000 + 700);
        _setBaseAmount(1207400, 5, 73000 + 580);
        _setBaseAmount(1207400, 6, 73000 + 750);
        _setBaseAmount(1207400, 7, 73000 + 800);
        _setBaseAmount(1207400, 8, 73000 + 900);

        _setBaseAmount(1207500, 0, 80000 + 450);
        _setBaseAmount(1207500, 1, 80000 + 650);
        _setBaseAmount(1207500, 2, 80000 + 600);
        _setBaseAmount(1207500, 3, 80000 + 620);
        _setBaseAmount(1207500, 4, 80000 + 700);
        _setBaseAmount(1207500, 5, 80000 + 580);
        _setBaseAmount(1207500, 6, 80000 + 750);
        _setBaseAmount(1207500, 7, 80000 + 800);
        _setBaseAmount(1207500, 8, 80000 + 900);

        _setBaseAmount(1207600, 0, 90000 + 450);
        _setBaseAmount(1207600, 1, 90000 + 650);
        _setBaseAmount(1207600, 2, 90000 + 600);
        _setBaseAmount(1207600, 3, 90000 + 620);
        _setBaseAmount(1207600, 4, 90000 + 700);
        _setBaseAmount(1207600, 5, 90000 + 580);
        _setBaseAmount(1207600, 6, 90000 + 750);
        _setBaseAmount(1207600, 7, 90000 + 800);
        _setBaseAmount(1207600, 8, 90000 + 900);
    }

    // Helper to set mapping
    function _setBaseAmount(uint32 productId, uint8 region, uint256 baseAmount) internal {
        accumBase[productId][region] = baseAmount;
    }

    // --- Upgrade Authorization ---
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // --- Native Currency Support ---
    receive() external payable {}
}
