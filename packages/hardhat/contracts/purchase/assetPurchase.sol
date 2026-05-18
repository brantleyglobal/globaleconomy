// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../proxies/globalLedgerProxy.sol";


contract AssetPurchase is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    GlobalLedgerProxy public ledgerProxy;

    struct Purchase {
        address user;
        address token;
        address purchaseSetter;
        address refundSetter;
        uint8 region;
        uint32 purchaseIndex;
        uint32 quantity;
        uint64 id;
        uint256 timestamp;
        uint256[22] amount;
        uint256 shipping;
        uint256 customizations;
        uint256 rate;
        bool refund;
        bytes32 purchaseTxHash;
        bytes32 refundHash;
    }

    struct Refund {
        address user;
        uint32 purchaseIndex;
        uint256 adjustedAmount;
    }

    struct Affiliate {
        address user;
        address affiliate;
        address commissionSetter;
        uint32 purchaseIndex;
        uint256 commission;
        bytes32 commissionHash;
    }

    struct RateRange {
        uint256 min;
        uint256 max;
    }

    struct PurchaseRef {
        address user;
        uint32 purchaseIndex;
    }

    uint256 public processTimestamp;
    uint256 public feeBasisPoints;
    uint256 public totalWithdrawn;
    uint256 internal constant MAX_BPS = 10000;
    uint256[] public purchaseTimestamps;

    address public feeRecipient;
    address public payoutAddress;
    address public poolManagerAddress;
    address[] public stablecoins;
    address[] public affiliates;
    address[] public admins;

    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private affiliateWhitelistMap;
    // Mapping from user address => productId => quantity
    mapping(address => mapping(uint64 => mapping(uint8 => uint32))) private userAssetQuantities;
    mapping(uint32 => mapping(uint8 => uint256)) public accumBase;
    mapping(uint256 => PurchaseRef) public purchasesByTimestamp;
    mapping(bytes32 => PurchaseRef) public purchasesByHash;
    mapping(address => Purchase[]) public purchasesByUser;
    mapping(address => mapping(uint32 => Affiliate)) public affiliateByUserIndex;
    mapping(address => mapping(uint32 => Refund)) public refundsByUserIndex;
    mapping(bytes32 => bool) public processedHashes;
    mapping(uint256 => bool) public processedPurchase;
    mapping(address => uint8) stablecoinIndex;
    mapping(uint8 => RateRange) public rateRange;

    // --- Events ---
    event AssetAdded(uint64 indexed id);
    event PayoutAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    event PurchaseMade(address indexed buyer, uint64 assetId, uint32 quantity, uint256 rate, uint256 baseAmount, uint256 fee);
    event DebugPurchase(uint32 productId, uint256 base);
    event PurchaseTimestamp(
        address indexed user,
        address token,
        uint64 id,
        uint32 quantity,
        uint32 purchaseIndex,
        uint256[22] amount,
        uint256 shipping,
        uint8 region,
        uint256 customizations,
        uint256 rate,
        address affiliate,
        uint256 commission,
        address purchaseSetter,
        bool refund,
        bytes32 refundHash
        );
    event PayoutTxHashCorrected(address user, bytes32 oldUserHash, bytes32 newUserHash, address payoutSetter);
    event UnexpectedPayoutTxHash(address indexed user, bytes32 existingHash, address existingSetter, uint256 amount, address attemptedSetter);
    event RefundPayment(bool txType, address user, uint256[] amount);

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

    modifier onlyPoolManager() {
        require(msg.sender == poolManagerAddress, "Not authorized");
        _;
    }

    // --- Initializer ---
    function initialize(
        address _owner,
        address[] memory initialStables,
        address[] memory adminList,
        address ledgerProxyAddress
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

        
        feeBasisPoints = 25;
        feeRecipient = _owner;
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
        for (uint256 i = 0; i < adminList.length; i++) {
            address a = adminList[i];
            require(a != address(0), "Zero address not allowed");

            adminWhitelistMap[a] = true;
            admins.push(a);
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

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function _isAffiliate(address admin) internal view returns (bool) {
        return affiliateWhitelistMap[admin];
    }

    // --- Purchase Entry ---
    function purchase(
        address buyer,
        address stable,
        uint32 productId,
        uint256 amount,
        uint256 shipping,
        uint256 customizations,
        uint32 quantity,
        uint256 rate,
        address affiliate,
        uint256 commission,
        uint8 region,
        bytes32 depositHash,
        uint256 purchaseTimeStamp
    ) external payable nonReentrant {
        require(quantity > 0, "Invalid quantity: must be >0");
        require(rate > 0, "Missing rate: must be >0");
        require(!processedPurchase[purchaseTimeStamp], "Duplicate Timestamp");
        processedPurchase[purchaseTimeStamp] = true;
        
        // Add asset and emit event
        userAssetQuantities[buyer][productId][region] += quantity;
        uint256 baseAmount = accumBase[productId][region] * quantity; // unscaled integer
        uint256 ts = purchaseTimeStamp;

        if (baseAmount == 0 ){
            initializeAccumBase();
        }

        uint256 total;
        uint256 fee;

        if (stable == address(0)) {

            uint256 nativeAmount = msg.value - customizations;
            
            require (nativeAmount == baseAmount, "Transferred amount does not match Product base amount");

            total = nativeAmount * quantity;

            // Calculate total payment, fee, and net amount
            fee = 0;

        } else {
            require(_isWhitelisted(stable), "Token not whitelisted");
            require (_isAdmin(msg.sender), "Permission Denied");
            require(!processedHashes[depositHash], "Duplicate Hash");
            processedHashes[depositHash] = true;

            total = amount * quantity;

            uint8 i = stablecoinIndex[stable];
            RateRange memory r = rateRange[i];

            uint256 minRate = (((baseAmount * DECIMALS) / GBDr) * r.min) / DECIMALS;
            uint256 maxRate = (((baseAmount * DECIMALS) / GBDr) * r.max) / DECIMALS;

            if (baseAmount < minRate || baseAmount > maxRate) {
                total = minRate;
            }
            // Calculate total payment, fee, and net amount
            fee = (total * feeBasisPoints) / MAX_BPS;
        }
        _savePurchase(
            buyer,
            stable,
            productId,
            total,
            shipping,
            customizations,
            quantity,
            rate,
            affiliate,
            commission,
            region,
            depositHash,
            ts
        );
    }

    // helper: write a Purchase into storage for a given buyer/index
    function _savePurchase(
        address buyer,
        address stable,
        uint32 productId,
        uint256 total,
        uint256 shipping,
        uint256 customizations,
        uint32 quantity,
        uint256 rate,
        address affiliate,
        uint256 commission,
        uint8 region,
        bytes32 depositHash,
        uint256 ts
    ) internal {
        // allocate new slot and get storage pointer
        purchasesByUser[buyer].push();
        uint256 index = purchasesByUser[buyer].length - 1;
        Purchase storage p = purchasesByUser[buyer][index];
        uint8 coinIndex = stablecoinIndex[stable];
        

        // set fields individually (avoid copying whole struct at once)
        p.user = buyer;
        p.token = stable;
        p.id = productId;
        p.purchaseIndex = uint32(index);
        p.quantity = quantity;
        p.amount[coinIndex] = total;
        p.region = region;
        p.shipping = shipping;
        p.customizations = customizations;
        p.rate = rate;
        p.purchaseTxHash = depositHash;
        p.purchaseSetter = msg.sender;
        
        purchaseTimestamps.push(ts);

        require(purchasesByTimestamp[ts].user == address(0), "Timestamp already used");
        purchasesByTimestamp[ts] = PurchaseRef({ user: buyer, purchaseIndex: uint32(index) });

        if (_isAffiliate(affiliate) == true) {
            affiliateByUserIndex[buyer][uint32(index)] = Affiliate({
                user: buyer,
                affiliate: affiliate,
                commissionSetter: msg.sender,
                purchaseIndex: uint32(index),
                commission: commission,
                commissionHash: bytes32(0)
            });
        } else {
            affiliateByUserIndex[buyer][uint32(index)] = Affiliate({
                user: buyer,
                affiliate: address(0),
                commissionSetter: msg.sender,
                purchaseIndex: uint32(index),
                commission: commission,
                commissionHash: bytes32(0)
            });
        }

        refundsByUserIndex[buyer][uint32(index)] = Refund({
            user: buyer,
            purchaseIndex: uint32(index),
            adjustedAmount: total
        });

        uint256 nativeAmount = 0;
        uint256 stableAmount = 0;
        if (stable == address(0)) {
            nativeAmount = total;
        } else {
            stableAmount = total;
        }

        ledgerProxy.recordPurchase(buyer, stable, ts,  nativeAmount, stableAmount, rate, depositHash);

        emit PurchaseMade(buyer, productId, quantity, rate, total, 0); // fee passed in earlier if needed
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
                totalWithdrawn += tokenBalance;
                emit FundsWithdrawn(token, payoutAddress, tokenBalance);
            }
        }
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

    // Helper to set mapping
    function _setBaseAmount(uint32 productId, uint8 region, uint256 baseAmount) internal {
        accumBase[productId][region] = baseAmount;
    }

    function getUserTermCount(address user) external view returns (uint256) {
        return purchasesByUser[user].length;
    }

    function getUserTerm(address user, uint32 index)
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
        return purchasesByUser[user];
    }

    function correctPayoutTxHash(
        address user,
        uint32 termIndex,
        bytes32 newTxHash,
        bytes32 partnerHash,
        bytes32 refundHash
    ) external onlyOwner {
        // Validate term index
        require(termIndex < purchasesByUser[user].length, "Invalid term index");

        // Load the correct term record (use storage so changes persist)
        Purchase storage u = purchasesByUser[user][termIndex];
        Affiliate storage a = affiliateByUserIndex[user][termIndex];

        // A payout must exist for this stage before correcting a hash
        uint8 cid = stablecoinIndex[u.token];
        require(u.amount[cid] != 0, "Payout not yet computed");

        // Old hashes for event
        bytes32 oldHash;
        
        // At least one of the supplied hashes must be non-zero
        if (newTxHash == bytes32(0) && refundHash == bytes32(0) && partnerHash == bytes32(0)) {
            revert("No Hash Included In The Transaction Call");
        }

        // Check duplicates only for non-zero incoming hashes
        bytes32 newHash;

        if (newTxHash != bytes32(0)) {
            require(!processedHashes[newTxHash], "Duplicate Purchase Hash");
            processedHashes[newTxHash] = true;
            u.purchaseTxHash = newTxHash;
            u.purchaseSetter = msg.sender;
            newHash = newTxHash;
            oldHash = u.purchaseTxHash;
        }
        if (refundHash != bytes32(0)) {
            require(!processedHashes[refundHash], "Duplicate Refund Hash");
            processedHashes[refundHash] = true;
            u.refundHash = refundHash;
            u.refundSetter = msg.sender;
            newHash = refundHash;
            oldHash = u.refundHash;
        }
        if (partnerHash != bytes32(0)) {
            require(!processedHashes[partnerHash], "Duplicate Commission Hash");
            processedHashes[partnerHash] = true;
            a.commissionHash = partnerHash;
            a.commissionSetter = msg.sender;
            newHash = partnerHash;
            oldHash = a.commissionHash;
        }

        emit PayoutTxHashCorrected(user, oldHash, newHash, msg.sender);
    }

    function getPurchase(uint256 timestamp) public {

        PurchaseRef memory r = purchasesByTimestamp[timestamp];
        Purchase memory w = purchasesByUser[r.user][r.purchaseIndex];
        Affiliate memory a = affiliateByUserIndex[w.user][w.purchaseIndex];

        if (msg.sender == owner()) {

            emit PurchaseTimestamp(
                w.user,
                w.token,
                w.id,
                w.quantity,
                w.purchaseIndex,
                w.amount,
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

            require(_isAdmin(msg.sender), "Permission Denied");

            emit PurchaseTimestamp(
                w.user,
                w.token,
                w.id,
                w.quantity,
                w.purchaseIndex,
                w.amount,
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

    function getPurchasesInRange(uint256 startTs, uint256 endTs, bool process) public {

        if (process == true){

            require (msg.sender == owner(), "Only Owner Required for off-chain deposits");
            for (uint256 i = 0; i < purchaseTimestamps.length; i++) {
                uint256 ts = purchaseTimestamps[i];
                if (ts >= processTimestamp && ts <= endTs) {
                    PurchaseRef memory r = purchasesByTimestamp[ts];
                    Purchase memory w = purchasesByUser[r.user][r.purchaseIndex];
                    Affiliate memory a = affiliateByUserIndex[r.user][r.purchaseIndex];
                    emit PurchaseTimestamp(
                        w.user,
                        w.token,
                        w.id,
                        w.quantity,
                        w.purchaseIndex,
                        w.amount,
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
            processTimestamp = endTs;

        } else {

            require(_isAdmin(msg.sender), "Permission Denied");

            for (uint256 i = 0; i < purchaseTimestamps.length; i++) {
                uint256 ts = purchaseTimestamps[i];
                if (ts >= startTs && ts <= endTs) {
                    PurchaseRef memory r = purchasesByTimestamp[ts];
                    Purchase memory w = purchasesByUser[r.user][r.purchaseIndex];
                    Affiliate memory a = affiliateByUserIndex[w.user][w.purchaseIndex];
                    emit PurchaseTimestamp(
                        w.user,
                        w.token,
                        w.id,
                        w.quantity,
                        w.purchaseIndex,
                        w.amount,
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
        }
    }

    function refund (bytes32 purchaseHash, uint256 timeStamp) public {

        PurchaseRef memory r = purchasesByHash[purchaseHash];
        Purchase storage u = purchasesByUser[r.user][r.purchaseIndex];
        Refund storage x = refundsByUserIndex[r.user][r.purchaseIndex];

        require(_isAdmin(msg.sender) || msg.sender == r.user, "Permission Denied");
        
        uint256 ts = timeStamp;
        uint grace = 15 days;
        uint grace2 = 45 days;
        uint grace3 = 120 days;
        require(processedHashes[purchaseHash], "Hash Not Found");

        require(u.refundHash == bytes32(0), "Refund Payout Made");

        require(u.refund != true, "Refund In Process");
        require (msg.sender == r.user, "Only Transacting User Can Request Refund");

        u.refund = true;

        uint8 coinIndex = stablecoinIndex[u.token];

        if ((ts - grace) <= u.timestamp) {

            // --- ADJUSTED PER TERMS & CONDITIONS --- //
            x.adjustedAmount = (u.amount[coinIndex] * 90) / 100;
            u.timestamp = ts;

        } else if ((ts - grace2) <= u.timestamp && (ts - grace) > u.timestamp) {

            // --- ADJUSTED PER TERMS & CONDITIONS --- //
            x.adjustedAmount = (u.amount[coinIndex] * 70) / 100;
            u.timestamp = ts;

        } else if ((ts - grace3) <= u.timestamp) {

            // --- ADJUSTED PER TERMS & CONDITIONS --- //
            x.adjustedAmount = (u.amount[coinIndex] * 50) / 100;
            u.timestamp = ts;

        } else {
            revert("Not Eligibable For Refund. Refund Request Period Has Expired");
        }

        uint256 nativeAmount = 0;
        uint256 stableAmount = 0;
        if (u.token == address(0)) {
            nativeAmount = x.adjustedAmount;
        } else {
            stableAmount = x.adjustedAmount;
        }

        (uint256[22] memory stableOuts) = ledgerProxy.refundPurchase( u.user, u.token, timeStamp,  nativeAmount, stableAmount, u.rate, purchaseHash);

        // Store per-currency outputs
        for (uint256 i = 0; i < 22; i++) {
            //uint8 cid = cids[i];
            uint256 amt = stableOuts[i];

            u.amount[i] = amt;

            // Effective rate for THIS currency only
            // (native consumed for this currency) / (stable returned)
            // You can also have repayNative return this directly.
            // --- Rates applied in Ledger
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

    function addAdffiliate (address affiliate) external onlyOwner {
        affiliates.push(affiliate);
    }

    function removeAffiliate (address affiliate) external onlyOwner {
        for (uint i = 0; i < affiliates.length; i++) {
            if (affiliates[i] == affiliate) {
                affiliates[i] = affiliates[affiliates.length - 1];
                affiliates.pop();
                break;
            }
        }
    }

    // --- Upgrade Authorization ---
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // --- Native Currency Support ---
    receive() external payable {}
}
