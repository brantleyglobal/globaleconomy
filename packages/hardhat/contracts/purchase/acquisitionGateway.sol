// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IGlobalLedger.sol";
import "../currency/globalDollar.sol";

contract AcquisitionGateway is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IGlobalLedger public ledgerProxy;
    GlobalDollar public stakeablecoins;

    struct Purchase {
        uint256 timestamp;
        address user;
        address token;
        address payoutSetter;
        address refundSetter;
        uint256 termIndex;
        uint256 amountin;
        uint256 amountout;
        uint256 exchangeRate;
        bytes32 purchaseTxHash;
        bytes32 payoutTxHash;
        bytes32 refundHash;
        bool refund;
        bool credit;
    }

    struct RateRange {
        uint256 min;
        uint256 max;
    }

    struct PurchaseRef {
        address user;
        uint256 purchaseIndex;
    }

    struct AcquisitionParams {
        address user;
        address token;
        uint256 amountin;
        uint256 amountout;
        uint256 rate;
        bytes32 depositHash;
        uint256 timeStamp;
    }

    error NotAuthorized();
    error PayoutFailed();
    error FeeOutofBounds();
    error UnapprovedToken();
    error HashDuplicated();
    error InvalidHash();
    error InvalidTerm();
    
    address constant NATIVE_TOKEN = address(0);

    address[] public stables;
    address[] private admins;
    uint256[] public purchaseTimestamps;
    uint256 public depositFeeBps;
    uint256 public processTimestamp;
    uint256 private _supply;
    
    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(uint256 => PurchaseRef) public purchasesByTimestamp;
    mapping(address => Purchase[]) public purchasesByUser;
    mapping(bytes32 => bool) public processedHashes;
    mapping(address => uint256) stablecoinIndex;
    mapping(address => uint256) adminIndex;
    mapping(uint256 => RateRange) public rateRange;
    mapping(address => mapping(uint256 => uint256[])) purchasePayouts;

    event Acquisitioned(address indexed user, uint256 amountOut, uint256 amountIn);
    event PurchaseTimestamp(
        uint256 timestamp,
        address indexed user,
        address token,
        uint256 termIndex,
        uint256[] stableOut,
        uint256 amountOut,
        uint256 amountIn,
        bytes32 payoutHash,
        bool refund,
        bytes32 refundHash
    );
    event PayoutTxHashCorrected(address user, bytes32 old, bytes32 newTxHash, address payoutSetter);
    event PayoutProcessed(uint256 timeStamp, address user, uint256 amount, uint256 termIndex, bytes32 payoutHash);
    event LiquidateUser(address user, uint256[] stableOut, uint256 amountin);

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
    uint256 constant RATE_100000 = 100000000000000000000000;   // 100_000 * 1e18 (adjust if needed)
    uint256 constant RATE_16000 = 16000000000000000000000;   // 16_000 * 1e18 (adjust if needed)
    uint256 constant RATE_600 = 600000000000000000000;   // 600 * 1e18 (adjust if needed)

    // Events omitted for brevity...

    function initialize(
        address _owner,
        address ledgerProxyAddress
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

        depositFeeBps = 25;
        ledgerProxy = IGlobalLedger(ledgerProxyAddress);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Check token whitelist using map
    function _isWhitelisted(address token) internal view returns (bool) {
        return stablecoinWhitelistMap[token];
    }

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function _safeTransferGlobal(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // Deposit with reentrancy guard
    function acquisition(
        address user,
        address token,
        uint256 amountin,
        uint256 amountout,
        uint256 rate,
        uint256 currentTxTime,
        bytes32 depositHash
    ) external payable nonReentrant {
        // Authorization & Replay Gates
        if(!_isAdmin(msg.sender)) revert NotAuthorized();
        if(!_isWhitelisted(token)) revert UnapprovedToken();
        if(processedHashes[depositHash]) revert HashDuplicated();
        processedHashes[depositHash] = true;

        uint256 gbdAmountout = amountout;

        // Math & Rate Adjustments
        {
            uint256 fee = (amountin * depositFeeBps) / 10000;
            
            // Fixed-point scaling to prevent integer truncation down to 0
            uint256 baseAmount = (amountout * 1e18) / rate;
            if(baseAmount < fee) revert FeeOutofBounds();
            uint256 netAmount = baseAmount - fee;

            uint256 idx = stablecoinIndex[token];
            RateRange memory r = rateRange[idx];
            uint256 decimalsCached = DECIMALS;
            
            uint256 minRate = (((netAmount * decimalsCached) * r.min) / GBDr) / decimalsCached;
            uint256 maxRate = (((netAmount * decimalsCached) * r.max) / GBDr) / decimalsCached;

            if (gbdAmountout < minRate || gbdAmountout > maxRate) {
                gbdAmountout = minRate;
            }
        }

        // Internal State Updates (Executed BEFORE external interactions)
        uint256 currentSupply = viewSupply();
        supply(currentSupply + gbdAmountout);

        // Allocate new purchase slot cleanly
        Purchase storage p = purchasesByUser[user].push();
        uint256 index;
        unchecked { index = purchasesByUser[user].length - 1; }

        p.timestamp = currentTxTime;
        p.user = user;
        p.token = token;
        p.amountin = amountin;
        p.amountout = gbdAmountout;
        p.exchangeRate = rate;
        p.termIndex = index;
        p.purchaseTxHash = depositHash;
        p.payoutSetter = msg.sender;
        p.credit = true;

        purchaseTimestamps.push(currentTxTime);
        purchasesByTimestamp[currentTxTime] = PurchaseRef({ user: user, purchaseIndex: index });

        if (processTimestamp == 0) {
            processTimestamp = currentTxTime;
        }

        _recordPurchase(p);

        // External Value Transfers (Safely at the very bottom)  ********** DID YOU ADD FUNDS TO THE CONTRACT ***************
        (bool success, ) = user.call{value: gbdAmountout}("");
        if(!success) revert PayoutFailed();

        emit Acquisitioned(user, gbdAmountout, amountin);
    }

    function _recordPurchase(Purchase storage p) internal {

        IGlobalLedger.LedgerAcquisitionHandle memory acquisitionData = IGlobalLedger.LedgerAcquisitionHandle({
            user: p.user,
            token: p.token,
            nativeAmount: p.amountout,
            stableAmount: p.amountin,
            exchangeRate: p.exchangeRate,
            timeStamp: p.timestamp,
            purchaseHash: p.purchaseTxHash
        });

        ledgerProxy.recordAcquisition(acquisitionData);

    }

    function liquidate (address payoutToken, uint256 amount, uint256 timeStamp) external payable {

        uint256 ts = timeStamp;

        if (_isAdmin(msg.sender)) {

            //require(purchasesByTimestamp[ts].user == address(0), "Timestamp already used");
            PurchaseRef memory r = purchasesByTimestamp[timeStamp];
            Purchase memory p = purchasesByUser[r.user][r.purchaseIndex];

            // --- Ledger Logic
            (uint256[] memory stableOuts) = ledgerProxy.liquidateNative(p.user, p.amountin, timeStamp);

            purchasePayouts[r.user][r.purchaseIndex] = stableOuts;

            uint256[] memory src = purchasePayouts[r.user][r.purchaseIndex];

            emit LiquidateUser(p.user, src, amount);

        } else {

            require(msg.value > 0, "No Currency Value Detected");

            purchasesByUser[msg.sender].push();
            uint256 index = purchasesByUser[msg.sender].length - 1;
            Purchase storage p = purchasesByUser[msg.sender][index];

            // Fill the struct
            p.timestamp = ts;
            p.user = msg.sender;
            p.token = payoutToken;
            p.amountin = amount;
            p.termIndex = index;
            p.payoutSetter = msg.sender;
            p.refund = true;
            p.credit = false;

            // Store timestamp for iteration (NOT automatic)
            purchaseTimestamps.push(ts);

            //require(purchasesByTimestamp[ts].user == address(0), "Timestamp already used");
            purchasesByTimestamp[ts] = PurchaseRef({ user: msg.sender, purchaseIndex: index });

             _recordLiquidation(p);

        }
    }

    function _recordLiquidation(Purchase storage p) internal {

        // --- Ledger Logic
        (uint256[] memory stableOuts) = ledgerProxy.liquidateNative(p.user, p.amountin, p.timestamp);

        purchasePayouts[p.user][p.termIndex] = stableOuts;

        uint256[] memory src = purchasePayouts[p.user][p.termIndex];

        emit LiquidateUser(p.user, src, p.amountin);


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
        rateRange[20] = RateRange(RATE_102, RATE_098);
        rateRange[21] = RateRange(RATE_102, RATE_098);

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

        rateRange[22] = RateRange(RATE_100, RATE_100);
        rateRange[23] = RateRange(RATE_100, RATE_100);

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

    function viewSupply() internal view returns (uint256) {
        return _supply;
    }

    function supply(uint256 amount) internal {
        _supply = amount;
    }

    function computeReconciliationPool()
        public
        view
        returns (
            uint256 reconciliationAmount
        )
    {

        reconciliationAmount = viewSupply();

        return (reconciliationAmount);
    }

    function correctPayoutTxHash(
        address user,
        uint256 termIndex,
        bytes32 newTxHash,
        bytes32 refundHash
    ) external onlyOwner {
        // Validate term index
        if(termIndex > purchasesByUser[user].length) revert InvalidTerm();

        // Load the correct term record (use storage so changes persist)
        Purchase storage u = purchasesByUser[user][termIndex];

        // Old hashes for event
        bytes32 oldHash;
        
        // At least one of the supplied hashes must be non-zero
        bytes32 newHash;
        if (newTxHash == bytes32(0) && refundHash == bytes32(0)) {
            revert InvalidHash();
        }

        // Check duplicates only for non-zero incoming hashes
        if (newTxHash != bytes32(0)) {
            if(processedHashes[newTxHash]) revert HashDuplicated();
            processedHashes[newTxHash] = true;
            newHash = newTxHash;
            oldHash = u.purchaseTxHash;
            u.purchaseTxHash = newTxHash;
            u.payoutSetter = msg.sender;
        }
        if (refundHash != bytes32(0)) {
            if(processedHashes[refundHash]) revert HashDuplicated();
            processedHashes[refundHash] = true;
            newHash = refundHash;
            oldHash = u.refundHash;
            u.refundHash = refundHash;
            u.refundSetter = msg.sender;
        }

        emit PayoutTxHashCorrected(user, oldHash, newHash, msg.sender);
    }

    function getPurchase(uint256 timestamp) public {

        if (msg.sender == owner()) {

            PurchaseRef memory r = purchasesByTimestamp[timestamp];
            Purchase memory w = purchasesByUser[r.user][r.purchaseIndex];
            uint256[] memory src = purchasePayouts[r.user][r.purchaseIndex];

            emit PurchaseTimestamp(w.timestamp, w.user, w.token, w.termIndex, src, w.amountout, w.amountin, w.payoutTxHash, w.refund, w.refundHash);

        } else {

            if(!_isAdmin(msg.sender)) revert NotAuthorized();
            PurchaseRef memory r = purchasesByTimestamp[timestamp];
            Purchase memory w = purchasesByUser[r.user][r.purchaseIndex];
            uint256[] memory src = purchasePayouts[r.user][r.purchaseIndex];

            emit PurchaseTimestamp(w.timestamp, w.user, w.token, w.termIndex, src, w.amountout, w.amountin, w.payoutTxHash, w.refund, w.refundHash);
        }
    }

    function getPurchasesInRange(uint256 startTs, uint256 endTs, bool process) public {

        if (process == true){

            if(msg.sender != owner()) revert NotAuthorized();

            _emitPurchase(processTimestamp, endTs);

            processTimestamp = endTs;

        } else {
            
            if(!_isAdmin(msg.sender)) revert NotAuthorized();

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
                
                emit PurchaseTimestamp(
                    w.timestamp,
                    w.user,
                    w.token,
                    w.termIndex,
                    purchasePayouts[r.user][r.purchaseIndex],
                    w.amountout,
                    w.amountin,
                    w.payoutTxHash,
                    w.refund,
                    w.refundHash
                );
            }

            // Use unchecked increments for the loop counter to bypass safety checks
            unchecked { i++; }
        }
    }

    function _additionHelper(address[] memory addresses, bool stc, bool adn) internal {
        uint256 len = addresses.length;
        
        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];

            // Skip if ALREADY added to prevent array bloating
            if (stc && !stablecoinWhitelistMap[sc]) {
                stablecoinIndex[sc] = stables.length; // FIXED: Tracks actual state array position
                stables.push(sc);
                stablecoinWhitelistMap[sc] = true;
            }
            if (adn && !adminWhitelistMap[sc]) {
                adminIndex[sc] = admins.length;
                admins.push(sc);
                adminWhitelistMap[sc] = true;
            }
            
            unchecked { i++; }
        }
    } 

    function _removalHelper(address[] memory addresses, bool stc, bool adn) internal {
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
        bool adn = false;

        _additionHelper(stableAddress, stc, adn);
    }

    function stableIndex() external view onlyOwner returns(address[] memory stable) {
        
        return stables;
    }

    function removeFromStableWhitelist(address[] memory stableAddress) external onlyOwner {

        bool stc = true;
        bool adn = false;

        _removalHelper(stableAddress, stc, adn);
    }

    function addToAdminWhitelist(address[] memory adminToAdd) external onlyOwner {

        bool stc = false;
        bool adn = true;
       
        _additionHelper(adminToAdd, stc, adn);
    }

    function adminsIndex() external view onlyOwner returns(address[] memory admin) {
        
        return admins;
    }

    function removeFromAdminWhitelist(address[] memory adminToRemove) external onlyOwner {

        bool stc = false;
        bool adn = true;

        _removalHelper(adminToRemove, stc, adn);
    }

    uint256[50] __gap;
}
