// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IGlobalLedger.sol";


contract AssetPurchase is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IGlobalLedger public ledgerProxy;

    struct Purchase {
        address user;
        address token;
        address purchaseSetter;
        address refundSetter;
        uint256 region;
        uint256 purchaseIndex;
        uint256 quantity;
        uint256 id;
        uint256 timestamp;
        uint256 amount;
        uint256 shipping;
        uint256 customizations;
        uint256 rate;
        bool refund;
        bytes32 purchaseTxHash;
        bytes32 refundHash;
        bytes32 configs;
    }

    struct Refund {
        address user;
        uint256 purchaseIndex;
        uint256 adjustedAmount;
    }

    struct Affiliate {
        address user;
        address affiliate;
        address commissionSetter;
        uint256 purchaseIndex;
        uint256 commission;
        bytes32 commissionHash;
        bytes32 buyerAffiliateCreditHash;
    }

    struct RateRange {
        uint256 min;
        uint256 max;
    }

    struct PurchaseRef {
        address user;
        uint256 purchaseIndex;
    }

    struct PurchaseHandle {
        address buyer;
        address stable;
        address affiliate;
        uint256 productId;
        uint256 total;
        uint256 shipping;
        uint256 customizations;
        bytes32 configs;
        uint256 quantity;
        uint256 rate;
        uint256 fee;
        uint256 commission;
        uint256 region;
        uint256 ts;
        bytes32 depositHash;
    }

    error NotAuthorized();
    error InvalidPaymentReceived();
    error SpendNotApproved();
    error UserAffiliateCreditFailed();
    error FeeOutofBounds();
    error InvalidAddress();
    error UnapprovedToken();
    error HashDuplicated();
    error TimestampDuplicated();
    error InvalidHash();
    error InvalidTerm();
    error InvalidParameters();
    error InvalidQuantity();
    error InvalidRate();
    error RefundInProcess();
    error PayoutMade();
    error RefundWindowExpired();


    uint256 public processTimestamp;
    uint256 private systemTimestamp;
    uint256 public feeBasisPoints;
    uint256 public totalWithdrawn;
    uint256 internal constant MAX_BPS = 10000;
    uint256[] public purchaseTimestamps;

    address public feeRecipient;
    address public payoutAddress;
    address[] public stables;
    address[] private admins;
    address[] private affiliates;

    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private affiliateWhitelistMap;
    // Mapping from user address => productId => quantity
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) private userAssetQuantities;
    mapping(uint256 => mapping(uint256 => uint256)) public accumBase;
    mapping(uint256 => PurchaseRef) public purchasesByTimestamp;
    mapping(bytes32 => PurchaseRef) public purchasesByHash;
    mapping(address => Purchase[]) public purchasesByUser;
    mapping(address => mapping(uint256 => uint256)) public purchaseCredits;
    mapping(address => mapping(uint256 => Affiliate)) public affiliateByUserIndex;
    mapping(address => Affiliate[]) public affiliateRecords;
    mapping(address => mapping(uint256 => bool)) public affiliateIndexSettled;
    mapping(address => mapping(uint256 => Refund)) public refundsByUserIndex;
    mapping(bytes32 => bool) public processedHashes;
    mapping(uint256 => bool) public processedPurchase;
    mapping(address => uint256) stablecoinIndex;
    mapping(address => uint256) adminIndex;
    mapping(address => uint256) affiliateIndex;
    mapping(uint256 => RateRange) public rateRange;
    mapping(address => mapping(uint256 => uint256[])) purchasePayouts;

    // --- Events ---
    event AssetAdded(uint256 indexed id);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event PurchaseMade(address indexed buyer, uint256 assetId, uint256 quantity, uint256 rate, uint256 baseAmount, uint256 fee);
    event PurchaseTimestamp(
        address indexed user,
        address token,
        uint256 id,
        uint256 quantity,
        uint256 purchaseIndex,
        uint256 amount,
        uint256[] stableOut,
        uint256 shipping,
        uint256 region,
        uint256 customizations,
        uint256 rate,
        address affiliate,
        uint256 commission,
        address purchaseSetter,
        bool refund,
        bytes32 refundHash
    );
    event PayoutTxHashCorrected(address user, bytes32 oldUserHash, bytes32 newUserHash, address payoutSetter);
    event RefundPayment(address user, uint256[] amount);

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

    // --- Initializer ---
    function initialize(
        address _owner,
        address ledgerProxyAddress
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

        feeBasisPoints = 25;
        feeRecipient = _owner;
        ledgerProxy = IGlobalLedger(ledgerProxyAddress);
    }

    // --- Admin ---
    function setPayoutAddress(address newAddress) external onlyOwner {
        if(newAddress == address(0)) revert InvalidAddress();
        emit PayoutAddressUpdated(payoutAddress, newAddress);
        payoutAddress = newAddress;
    }

    function setFeeBasisPoints(uint256 newBps) external onlyOwner {
        if(newBps > 5000) revert FeeOutofBounds();
        feeBasisPoints = newBps;
    }

    function _isWhitelisted(address token) internal view returns (bool) {
        return stablecoinWhitelistMap[token];
    }

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function _isAffiliate(address affiliate) public view returns (bool) {
        return affiliateWhitelistMap[affiliate];
    }

    // --- Purchase Entry ---
    function purchase(
        address buyer,
        address stable,
        uint256 productId,
        uint256 amount,
        uint256 shipping,
        uint256 customizations,
        bytes32 configs,
        uint256 quantity,
        uint256 rate,
        address affiliate,
        uint256 commission,
        uint256 region,
        bytes32 depositHash,
        uint256 purchaseTimeStamp
    ) external payable nonReentrant {
        if(quantity == 0) revert InvalidQuantity();
        if(rate == 0) revert InvalidRate();
        
        // Replay Protection Gate
        if(processedPurchase[purchaseTimeStamp]) revert TimestampDuplicated();
        processedPurchase[purchaseTimeStamp] = true;
        
        // Direct internal balance track adjustments
        userAssetQuantities[buyer][productId][region] += quantity;
        
        // Read product baseline once
        uint256 productBase = accumBase[productId][region];
        if (productBase == 0) {
            initializeAccumBase();
            productBase = accumBase[productId][region]; // Refresh cached pointer
        }

        uint256 baseAmount = productBase * quantity;
        uint256 total;
        uint256 fee;

        if (stable == address(0)) {
            // Native Asset Path Security Check
            uint256 nativeAmount = msg.value - customizations;
            if(nativeAmount != baseAmount) revert InvalidPaymentReceived();

            // Removed the duplicate quantity multiplier compounding error
            total = nativeAmount; 
            fee = 0;

        } else {
            if(!_isWhitelisted(stable)) revert UnapprovedToken();
            if(!_isAdmin(msg.sender)) revert NotAuthorized();
            if(processedHashes[depositHash]) revert HashDuplicated();
            processedHashes[depositHash] = true;

            total = amount * quantity;

            uint256 i = stablecoinIndex[stable];
            RateRange memory r = rateRange[i];

            uint256 decimalsCached = DECIMALS;
            uint256 minRate = (((baseAmount * decimalsCached) * r.min) / GBDr) / decimalsCached;
            uint256 maxRate = (((baseAmount * decimalsCached) * r.max) / GBDr) / decimalsCached;

            if (baseAmount < minRate || baseAmount > maxRate) {
                total = minRate;
            }
            
            fee = (total * feeBasisPoints) / MAX_BPS;

            // Secure payment extraction barrier line item
            //SafeERC20.safeTransferFrom(IERC20(stable), buyer, address(this), total);
        }

        _savePurchase(
            PurchaseHandle({
                buyer: buyer,
                stable: stable,
                affiliate: affiliate,
                productId: productId,
                total: total,
                shipping: shipping,
                customizations: customizations,
                configs: configs,
                quantity: quantity,
                rate: rate,
                fee: fee,
                commission: commission,
                region: region,
                depositHash: depositHash,
                ts: purchaseTimeStamp
            })
        ); 
        emit PurchaseMade(buyer, productId, quantity, rate, total, fee);
    }

    function _savePurchase(
        PurchaseHandle memory h
    ) internal {
        // Direct push allocation storage assignment pattern win
        Purchase storage p = purchasesByUser[h.buyer].push();
        uint256 index;
        unchecked { index = purchasesByUser[h.buyer].length - 1; }
        address activeAffiliate = _isAffiliate(h.affiliate) ? h.affiliate : address(0);
        uint256 total = h.total;
        if(activeAffiliate != address(0)) { unchecked { purchaseCredits[h.buyer][index] += (300 * 1e18); } }

        p.user = h.buyer;
        p.token = h.stable;
        p.id = h.productId;
        p.purchaseIndex = index;
        p.quantity = h.quantity;
        p.amount = total;
        p.region = h.region;
        p.shipping = h.shipping;
        p.customizations = h.customizations;
        p.rate = h.rate;
        p.purchaseTxHash = h.depositHash;
        p.purchaseSetter = msg.sender;
        p.configs = h.configs;
        
        purchaseTimestamps.push(h.ts);

        if(purchasesByTimestamp[h.ts].user != address(0)) revert TimestampDuplicated();
        purchasesByTimestamp[h.ts] = PurchaseRef({ user: h.buyer, purchaseIndex: index });

        // Optimized Inline conditional structure mappings
        affiliateByUserIndex[h.buyer][index] = Affiliate({
            user: h.buyer,
            affiliate: activeAffiliate,
            commissionSetter: msg.sender,
            purchaseIndex: index,
            commission: h.commission,
            commissionHash: bytes32(0),
            buyerAffiliateCreditHash: bytes32(0)
        });

        refundsByUserIndex[h.buyer][index] = Refund({
            user: h.buyer,
            purchaseIndex: index,
            adjustedAmount: 0
        });

        _recordPurchase(p, h.ts);

        emit AssetAdded(h.productId);
    }

    function _recordPurchase(Purchase storage p, uint256 ts) internal {

        uint256 nativeAmount = 0;
        uint256 stableAmount = 0;
        if (p.token == address(0)) {
            nativeAmount = p.amount;
        } else {
            stableAmount = p.amount;
        }

        IGlobalLedger.LedgerPurchaseHandle memory purchaseData = IGlobalLedger.LedgerPurchaseHandle({
            user: p.user,
            token: p.token,
            nativeAmount: nativeAmount,
            stableAmount: stableAmount,
            exchangeRate: p.rate,
            timeStamp: ts,
            purchaseHash: p.purchaseTxHash
        });

        ledgerProxy.recordPurchase(purchaseData);
    }

    function refund(bytes32 purchaseHash) external nonReentrant {
        // Ensure purchase track hash exists
        if(!processedHashes[purchaseHash]) revert InvalidHash();
        
        PurchaseRef storage r = purchasesByHash[purchaseHash];
        Purchase storage u = purchasesByUser[r.user][r.purchaseIndex];
        Refund storage x = refundsByUserIndex[r.user][r.purchaseIndex];

        // Unified permission gate allowing both the true user AND admins to act
        if(!_isAdmin(msg.sender) || msg.sender != r.user) revert NotAuthorized();

        // Core Status Validation Gates
        if(u.refundHash != bytes32(0)) revert PayoutMade();
        if(u.refund) revert RefundInProcess();

        u.refund = true;

        // Enforce time strictly using the internal system clock state variable
        uint256 currentTxTime = systemTimestamp;
        uint256 purchaseTime = u.timestamp;
        uint256 purchaseAmount = u.amount;

        // GUARDRAIL: Ensure the system clock makes logical sense relative to creation time
        if(currentTxTime <= purchaseTime) revert InvalidParameters();

        // Swapped to additive inequalities to guarantee underflow protection
        if (currentTxTime <= purchaseTime + 15 days) {
            
            // --- Tier 1: 0 to 15 Days -> 90% Refund ---
            x.adjustedAmount += (purchaseAmount * 90) / 100;
            u.timestamp = currentTxTime;

        } else if (currentTxTime <= purchaseTime + 45 days) {
            
            // --- Tier 2: 15 to 45 Days -> 70% Refund ---
            x.adjustedAmount += (purchaseAmount * 70) / 100;
            u.timestamp = currentTxTime;

        } else if (currentTxTime <= purchaseTime + 120 days) {
            
            // --- Tier 3: 45 to 120 Days -> 50% Refund ---
            x.adjustedAmount += (purchaseAmount * 50) / 100;
            u.timestamp = currentTxTime;

        } else {
            // Hard fallback limit rule protection
            revert RefundWindowExpired();
        }
        
        _recordRefund(u, x); 
    }

    function _recordRefund(Purchase storage u, Refund storage x) internal {

        uint256 nativeAmount = 0;
        uint256 stableAmount = 0;
        if (u.token == address(0)) {
            nativeAmount = x.adjustedAmount;
        } else {
            stableAmount = x.adjustedAmount;
        }

        IGlobalLedger.LedgerPurchaseHandle memory refundData = IGlobalLedger.LedgerPurchaseHandle({
            user: u.user,
            token: u.token,
            nativeAmount: nativeAmount,
            stableAmount: stableAmount,
            exchangeRate: 0,
            timeStamp: 0,
            purchaseHash: u.purchaseTxHash
        });
        (uint256[] memory stableOuts) = ledgerProxy.refundPurchase(
            refundData
        );

        purchasePayouts[x.user][x.purchaseIndex] = stableOuts;

        uint256[] storage src = purchasePayouts[x.user][x.purchaseIndex];

        emit RefundPayment(u.user, src);
    }

    function getUserProductQuantity(address user, uint256 productId, uint256 region) external view returns (uint256) {
        return userAssetQuantities[user][productId][region];
    }

    function initializeAccumBase() public {
        // ESeries standard shipping rates (productIds: 120720, 120745, 120770)
        _setBaseAmount(120720, 0, 15400 + 180);
        _setBaseAmount(120720, 1, 15400 + 250);
        _setBaseAmount(120720, 2, 15400 + 220);
        _setBaseAmount(120720, 3, 15400 + 230);
        _setBaseAmount(120720, 4, 15400 + 260);
        _setBaseAmount(120720, 5, 15400 + 210);
        _setBaseAmount(120720, 6, 15400 + 280);
        _setBaseAmount(120720, 7, 15400 + 300);
        _setBaseAmount(120720, 8, 15400 + 350);

        _setBaseAmount(120745, 0, 16500 + 180);
        _setBaseAmount(120745, 1, 16500 + 250);
        _setBaseAmount(120745, 2, 16500 + 220);
        _setBaseAmount(120745, 3, 16500 + 230);
        _setBaseAmount(120745, 4, 16500 + 260);
        _setBaseAmount(120745, 5, 16500 + 210);
        _setBaseAmount(120745, 6, 16500 + 280);
        _setBaseAmount(120745, 7, 16500 + 300);
        _setBaseAmount(120745, 8, 16500 + 350);

        _setBaseAmount(120770, 0, 17600 + 180);
        _setBaseAmount(120770, 1, 17600 + 250);
        _setBaseAmount(120770, 2, 17600 + 220);
        _setBaseAmount(120770, 3, 17600 + 230);
        _setBaseAmount(120770, 4, 17600 + 260);
        _setBaseAmount(120770, 5, 17600 + 210);
        _setBaseAmount(120770, 6, 17600 + 280);
        _setBaseAmount(120770, 7, 17600 + 300);
        _setBaseAmount(120770, 8, 17600 + 350);

        // XSeries heavy shipping rates (productIds: 1207100, 1207200, 1207300,... up to 1207600)
        _setBaseAmount(1207100, 0, 47300 + 450);
        _setBaseAmount(1207100, 1, 47300 + 650);
        _setBaseAmount(1207100, 2, 47300 + 600);
        _setBaseAmount(1207100, 3, 47300 + 620);
        _setBaseAmount(1207100, 4, 47300 + 700);
        _setBaseAmount(1207100, 5, 47300 + 580);
        _setBaseAmount(1207100, 6, 47300 + 750);
        _setBaseAmount(1207100, 7, 47300 + 800);
        _setBaseAmount(1207100, 8, 47300 + 900);

        _setBaseAmount(1207200, 0, 58300 + 450);
        _setBaseAmount(1207200, 1, 58300 + 650);
        _setBaseAmount(1207200, 2, 58300 + 600);
        _setBaseAmount(1207200, 3, 58300 + 620);
        _setBaseAmount(1207200, 4, 58300 + 700);
        _setBaseAmount(1207200, 5, 58300 + 580);
        _setBaseAmount(1207200, 6, 58300 + 750);
        _setBaseAmount(1207200, 7, 58300 + 800);
        _setBaseAmount(1207200, 8, 58300 + 900);

        _setBaseAmount(1207300, 0, 69300 + 450);
        _setBaseAmount(1207300, 1, 69300 + 650);
        _setBaseAmount(1207300, 2, 69300 + 600);
        _setBaseAmount(1207300, 3, 69300 + 620);
        _setBaseAmount(1207300, 4, 69300 + 700);
        _setBaseAmount(1207300, 5, 69300 + 580);
        _setBaseAmount(1207300, 6, 69300 + 750);
        _setBaseAmount(1207300, 7, 69300 + 800);
        _setBaseAmount(1207300, 8, 69300 + 900);

        _setBaseAmount(1207400, 0, 80300 + 450);
        _setBaseAmount(1207400, 1, 80300 + 650);
        _setBaseAmount(1207400, 2, 80300 + 600);
        _setBaseAmount(1207400, 3, 80300 + 620);
        _setBaseAmount(1207400, 4, 80300 + 700);
        _setBaseAmount(1207400, 5, 80300 + 580);
        _setBaseAmount(1207400, 6, 80300 + 750);
        _setBaseAmount(1207400, 7, 80300 + 800);
        _setBaseAmount(1207400, 8, 80300 + 900);

        _setBaseAmount(1207500, 0, 88000 + 450);
        _setBaseAmount(1207500, 1, 88000 + 650);
        _setBaseAmount(1207500, 2, 88000 + 600);
        _setBaseAmount(1207500, 3, 88000 + 620);
        _setBaseAmount(1207500, 4, 88000 + 700);
        _setBaseAmount(1207500, 5, 88000 + 580);
        _setBaseAmount(1207500, 6, 88000 + 750);
        _setBaseAmount(1207500, 7, 88000 + 800);
        _setBaseAmount(1207500, 8, 88000 + 900);

        _setBaseAmount(1207600, 0, 99000 + 450);
        _setBaseAmount(1207600, 1, 99000 + 650);
        _setBaseAmount(1207600, 2, 99000 + 600);
        _setBaseAmount(1207600, 3, 99000 + 620);
        _setBaseAmount(1207600, 4, 99000 + 700);
        _setBaseAmount(1207600, 5, 99000 + 580);
        _setBaseAmount(1207600, 6, 99000 + 750);
        _setBaseAmount(1207600, 7, 99000 + 800);
        _setBaseAmount(1207600, 8, 99000 + 900);
    }

    function _populateGlobals() external {
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

    // Helper to set mapping
    function _setBaseAmount(uint256 productId, uint256 region, uint256 baseAmount) internal {
        accumBase[productId][region] = baseAmount;
    }

    function getUserTermCount(address user) external view returns (uint256) {
        return purchasesByUser[user].length;
    }

    function getUserTerm(address user, uint256 index)
        external
        view
        returns (Purchase memory)
    {
        return purchasesByUser[user][index];
    }

    function getUserPurchases(address user)
        external
        view
        returns (Purchase[] memory)
    {
        if (!_isAdmin(msg.sender) || msg.sender != user) revert NotAuthorized();
        return purchasesByUser[user];
    }

    function setPurchaseCredit(
        address user, 
        uint256 purchaseIndex, 
        uint256 creditAmount
    ) external onlyOwner {
        // Guard to ensure we are referencing a valid, pre-existing purchase execution
        require(purchaseIndex < purchasesByUser[user].length, "IndexOutOfBounds");
        
        purchaseCredits[user][purchaseIndex] += creditAmount;
    }

    function getUserPurchasesWithCredits(address user) 
        external 
        view 
        returns (Purchase[] memory terms, uint256[] memory credits) 
    {
        uint256 count = purchasesByUser[user].length;
        terms = purchasesByUser[user];
        credits = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            credits[i] = purchaseCredits[user][i];
        }
    }

    function recordAffiliateCommission(
        address user,
        address affiliate,
        uint256 purchaseIndex,
        uint256 commission,
        bytes32 commissionHash,
        bytes32 buyerAffiliateCreditHash
    ) external onlyOwner {
        // Safety verification: The customer must have a valid purchase on record
        require(purchaseIndex < purchasesByUser[user].length, "InvalidPurchaseIndex");
        // Prevent double-allocation of standard partner cuts for a single order index
        require(!affiliateIndexSettled[user][purchaseIndex], "AffiliateCommissionAlreadySettled");

        affiliateRecords[affiliate].push(Affiliate({
            user: user,
            affiliate: affiliate,
            commissionSetter: msg.sender,
            purchaseIndex: purchaseIndex,
            commission: commission,
            commissionHash: commissionHash,
            buyerAffiliateCreditHash: buyerAffiliateCreditHash
        }));

        affiliateIndexSettled[user][purchaseIndex] = true;
    }

    function getAffiliateHistory(address affiliate) 
        external 
        view 
        returns (Affiliate[] memory) 
    {
        return affiliateRecords[affiliate];
    }

    function correctPayoutTxHash(
        address user,
        uint256 termIndex,
        bytes32 newTxHash,
        bytes32 partnerHash,
        bytes32 creditHash,
        bytes32 refundHash
    ) external onlyOwner {
        // Validate term index
        if(termIndex > purchasesByUser[user].length) revert InvalidTerm();

        // Load the correct term record (use storage so changes persist)
        Purchase storage u = purchasesByUser[user][termIndex];
        Affiliate storage a = affiliateByUserIndex[user][termIndex];

        // A payout before correcting a hash
        if(u.amount == 0) revert SpendNotApproved();

        // Old hashes for event
        bytes32 oldHash;
        
        // At least one of the supplied hashes must be non-zero
        if (newTxHash == bytes32(0) && refundHash == bytes32(0) && partnerHash == bytes32(0)) {
            revert InvalidHash();
        }

        // Check duplicates only for non-zero incoming hashes
        bytes32 newHash;

        if (newTxHash != bytes32(0)) {
            if(processedHashes[newTxHash]) revert HashDuplicated();
            processedHashes[newTxHash] = true;
            oldHash = u.purchaseTxHash;
            u.purchaseTxHash = newTxHash;
            u.purchaseSetter = msg.sender;
            newHash = newTxHash;
        }
        if (refundHash != bytes32(0)) {
            if(processedHashes[refundHash]) revert HashDuplicated();
            processedHashes[refundHash] = true;
            oldHash = u.refundHash;
            u.refundHash = refundHash;
            u.refundSetter = msg.sender;
            newHash = refundHash;
        }
        if (partnerHash != bytes32(0)) {
            if(!processedHashes[partnerHash]) revert HashDuplicated();
            processedHashes[partnerHash] = true;
            oldHash = a.commissionHash;
            a.commissionHash = partnerHash;
            a.commissionSetter = msg.sender;
            newHash = partnerHash;
        }
        if (creditHash != bytes32(0)) {
            if(!processedHashes[creditHash]) revert HashDuplicated();
            processedHashes[creditHash] = true;
            oldHash = a.buyerAffiliateCreditHash;
            a.buyerAffiliateCreditHash = creditHash;
            a.commissionSetter = msg.sender;
            newHash = creditHash;
        }

        emit PayoutTxHashCorrected(user, oldHash, newHash, msg.sender);
    }

    function getPurchase(uint256 timestamp) public {

        PurchaseRef memory r = purchasesByTimestamp[timestamp];
        Purchase memory w = purchasesByUser[r.user][r.purchaseIndex];
        Affiliate memory a = affiliateByUserIndex[w.user][w.purchaseIndex];
        uint256[] memory src = purchasePayouts[r.user][r.purchaseIndex];

        if (msg.sender == owner()) {

            emit PurchaseTimestamp(
                w.user,
                w.token,
                w.id,
                w.quantity,
                w.purchaseIndex,
                w.amount,
                src,
                w.shipping,
                w.region,
                w.customizations,
                w.rate,
                a.affiliate,
                a.commission,
                w.purchaseSetter,
                w.refund,
                w.refundHash
            );

        } else {

            if(!_isAdmin(msg.sender)) revert NotAuthorized();

            emit PurchaseTimestamp(
                w.user,
                w.token,
                w.id,
                w.quantity,
                w.purchaseIndex,
                w.amount,
                src,
                w.shipping,
                w.region,
                w.customizations,
                w.rate,
                a.affiliate,
                a.commission,
                w.purchaseSetter,
                w.refund,
                w.refundHash
            );

        }
    }

    function getPurchasesInRange(uint256 startTs, uint256 endTs, uint256 ts, bool process) public {

        if (process) {

            if(msg.sender != owner()) revert NotAuthorized();
            uint256 effectiveStamp = processTimestamp - 120 days;
            _emitPurchase(effectiveStamp, endTs);

            processTimestamp = endTs;
            systemTimestamp = ts;

        } else {

            if(!_isAdmin(msg.sender)) revert NotAuthorized();

            systemTimestamp = ts;

            _emitPurchase(startTs, endTs);
        }
    }

    function _emitPurchase(uint256 startTs, uint256 endTs) internal {

        // Cache array length to memory to prevent continuous storage reads (SLOAD)
        uint256 len = purchaseTimestamps.length;

        for (uint256 i = 0; i < len;) {
            uint256 ts = purchaseTimestamps[i];
            
            if (ts >= startTs && ts <= endTs) {
                // Read pointers to storage instead of copying the whole struct to memory
                PurchaseRef storage r = purchasesByTimestamp[ts];
                Purchase storage w = purchasesByUser[r.user][r.purchaseIndex];
                Affiliate storage a = affiliateByUserIndex[w.user][w.purchaseIndex];
                
                emit PurchaseTimestamp(
                    w.user,
                    w.token,
                    w.id,
                    w.quantity,
                    w.purchaseIndex,
                    w.amount,
                    purchasePayouts[r.user][r.purchaseIndex],
                    w.shipping,
                    w.region,
                    w.customizations,
                    w.rate,
                    a.affiliate,
                    a.commission,
                    w.purchaseSetter,
                    w.refund,
                    w.refundHash
                );
            }

            // Use unchecked increments for the loop counter to bypass safety checks
            unchecked { i++; }
        }
    }

    function _additionHelper(address[] memory addresses, bool stc, bool aff, bool adn) internal {
        uint256 len = addresses.length;
        
        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];

            // Skip if ALREADY added to prevent array bloating
            if (stc && !stablecoinWhitelistMap[sc]) {
                stablecoinIndex[sc] = stables.length; // FIXED: Tracks actual state array position
                stables.push(sc);
                stablecoinWhitelistMap[sc] = true;
            }
            if (aff && !affiliateWhitelistMap[sc]) {
                affiliateIndex[sc] = affiliates.length;
                affiliates.push(sc);
                affiliateWhitelistMap[sc] = true;
            }
            if (adn && !adminWhitelistMap[sc]) {
                adminIndex[sc] = admins.length;
                admins.push(sc);
                adminWhitelistMap[sc] = true;
            }
            
            unchecked { i++; }
        }
    } 

    function _removalHelper(address[] memory addresses, bool stc, bool aff, bool adn) internal {
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

            if (aff && affiliateWhitelistMap[sc]) {
                uint256 index = affiliateIndex[sc];
                uint256 lastIndex = affiliates.length - 1;

                if (index != lastIndex) {
                    address lastAddr = affiliates[lastIndex];
                    affiliates[index] = lastAddr;
                    affiliateIndex[lastAddr] = index;
                }
                affiliates.pop();
                affiliateWhitelistMap[sc] = false;
                delete affiliateIndex[sc];
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
        bool aff = false;
        bool adn = false;

        _additionHelper(stableAddress, stc, aff, adn);
    }

    function stableIndex() external view onlyOwner returns(address[] memory stable) {
        
        return stables;
    }

    function removeFromStableWhitelist(address[] memory stableAddress) external onlyOwner {

        bool stc = true;
        bool aff = false;
        bool adn = false;

        _removalHelper(stableAddress, stc, aff, adn);
    }

    function addToAffiliateWhitelist(address[] memory affiliateAddress) external onlyOwner {

        bool stc = false;
        bool aff = true;
        bool adn = false;
        
        _additionHelper(affiliateAddress, stc, aff, adn);
    }

    function affiliatesIndex() external view onlyOwner returns(address[] memory stakes) {
        
        return affiliates;
    }

    function removeFromAffiliateWhitelist(address[] memory affiliate) external onlyOwner {

        bool stc = false;
        bool aff = true;
        bool adn = false;

        _removalHelper(affiliate, stc, aff, adn);
    }

    function addToAdminWhitelist(address[] memory adminToAdd) external onlyOwner {

        bool stc = false;
        bool aff = false;
        bool adn = true;
       
        _additionHelper(adminToAdd, stc, aff, adn);
    }

    function adminsIndex() external view onlyOwner returns(address[] memory admin) {
        
        return admins;
    }

    function removeFromAdminWhitelist(address[] memory adminToRemove) external onlyOwner {

        bool stc = false;
        bool aff = false;
        bool adn = true;

        _removalHelper(adminToRemove, stc, aff, adn);
    }

    // --- Upgrade Authorization ---
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // --- Native Currency Support ---
    receive() external payable {}
}
