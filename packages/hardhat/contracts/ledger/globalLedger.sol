// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract GlobalLedger is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable { 

    // -------------------------
    // DATA STRUCTURES
    // -------------------------
    struct Global {
        uint256[22] balanceAmount;
        uint256[22] liquidAmount;
        uint256[22] depletedFIFO;
        uint256[22] purchases;
        uint256[22] vaultDepositAmount;
        uint256[22] ventureDepositAmount;
        uint256[22] venturePoolAmount;
        uint256[22] vaultPoolAmount;
        uint256 timestamp;
    }

    struct User {
        address user;
        uint256[22] balanceAmount;
        uint256[22] liquidAmount;
        uint256[22] purchases;
        uint256[22] vaultDepositAmount;
        uint256[22] ventureDepositAmount;
        uint256 timestamp;
    }

    struct PurchaseLot {
      address user;
      uint8 currencyID;
      uint256 stableAmount;
      uint256 nativeAmount;
      uint256 exchangeRate;
      uint256 timestamp;
      bool credit;
      bool status;
      bytes32 purchaseHash;
    }

    struct AcquisitionRef {
      address user;
      uint256 refLot;
    }

    struct PurchaseRef {
      address user;
      uint256 refLot;
    }

    struct AcquisitionLot {
      address user;
      uint8 currencyID;
      uint256 stableAmount;
      uint256 nativeAmount;
      uint256 remainingNative;
      uint256 remainingStable;
      uint256 exchangeRate;
      uint256 nativeSnapShot;
      uint256 stableSnapShot;
      uint256 timestamp;
      uint256 chapterHead;
      uint256 chapterEnd;
      bool credit;
      bool status;
      bytes32 purchaseHash;
    }

    struct VaultLot {
      address user;
      uint8 currencyID;
      uint256 stableAmount;
      uint256 nativeAmount;
      uint256 exchangeRate;
      uint256 timestamp;
      bool credit;
      bool status;
      bytes32 depositHash;
    }

    struct VentureLot {
      address user;
      uint8 currencyID;
      uint256 stableAmount;
      uint256 nativeAmount;
      uint256 exchangeRate;
      uint256 timestamp;
      bool credit;
      bool status;
      bytes32 depositHash;
    }

    struct VaultWithdrawLot {
      address user;
      uint8 currencyID;
      uint8 vaultID;
      uint256 stableAmount;
      uint256 timestamp;
      bool credit;
    }

    struct VentureWithdrawLot {
      address user;
      uint8 currencyID;
      uint8 vaultID;
      uint256 stableAmount;
      uint256 timestamp;
      bool credit;
    }

    struct VaultPoolLot {
      address sourceContract;
      uint8 currencyID;
      uint256 stableAmount;
      uint256 timestamp;
      bool credit;
      bool status;
      bytes32 depositHash;
    }

    struct VenturePoolLot {
      address sourceContract;
      uint8 currencyID;
      uint256 stableAmount;
      uint256 timestamp;
      bool credit;
      bool status;
      bytes32 depositHash;
    }
 
    address[] public stablecoins;
    address[] public stakeablecoins;
    address[] public venturecoins;
    address[] public users;
    address[] public admins;
    address[] public contracts;
    uint256 public nextLotId;
    uint256 private globalHead;
    uint8 private global;
    uint8 private globalID;  

    mapping(address => Global[]) public globalView;
    mapping(address => User[]) public userView;
    mapping(address => bool) public activeUsers;
    mapping(address => bool) public activeGlobal;
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private contractWhitelistMap;
    mapping(bytes32 => bool) public acquisitionHashes;
    mapping(bytes32 => AcquisitionRef) public acquisitionsByHash;
    mapping(uint256 => AcquisitionLot) public acquisitionLots;
    mapping(bytes32 => PurchaseRef) public purchasesByHash;
    mapping(uint256 => PurchaseLot) public purchaseLots;
    mapping(uint256 => VaultLot) public vaultLots;
    mapping(uint256 => VentureLot) public ventureLots;
    mapping(uint256 => VaultWithdrawLot) public vaultWithdrawLots;
    mapping(uint256 => VentureWithdrawLot) public ventureWithdrawLots;
    mapping(uint256 => VaultPoolLot) public vaultPoolLots;
    mapping(uint256 => VenturePoolLot) public venturePoolLots;
    mapping(address => uint256[]) public userNativeQueue;
    mapping(address => uint256[]) public acquisitionChapter;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeablecoinWhitelistMap;
    mapping(address => bool) private venturecoinWhitelistMap;
    mapping(address => uint8) stablecoinIndex;
    mapping(address => uint8) stakeablecoinIndex;
    mapping(address => uint8) venturecoinIndex;

    // -------------------------
    // EVENTS
    // -------------------------
    event Deposit(uint256 lotId, address indexed user, uint8 currency, uint256 amount);
    event Spend(uint256 lotId, address indexed user, uint8 currency, uint256 amount, address indexed caller);
    event Refund(uint256 lotId, address indexed user, uint8 currency, uint256 amount,  address indexed caller);
    event Withdrawal(uint256 lotId, address indexed user, uint8 currency, uint256 amount);

    //Add mapping for native currency purchases
    //Product purchases are treated as spend but only after day 15 and after day 30 that spend increases.  If paid in with native currency purchase will need to account for individual stable coin balance, being insufficient. Add time stamp to ledger.

    // -------------------------
    // INITIALIZER
    // -------------------------
    function initialize(
        address _owner,
        address[] memory initialStables,
        address[] memory initialStakeables
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

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
            address sk = initialStakeables[i];
            require(sk != address(0), "Zero address not allowed");

            stakeablecoinWhitelistMap[sk] = true;
            stakeablecoins.push(sk);

            stakeablecoinIndex[sk] = uint8(i);
        }
    }

    modifier onlyContracts() {
        require(_isContract(msg.sender), "Not authorized");
        _;
    }

    // Check token whitelist using map
    function _isWhitelisted(address token) internal view returns (bool) {
        return stablecoinWhitelistMap[token];
    }

    function _isXWhitelisted(address token) internal view returns (bool) {
        return stakeablecoinWhitelistMap[token];
    }

    function _isVWhitelisted(address token) internal view returns (bool) {
        return venturecoinWhitelistMap[token];
    }

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function _isContract(address incomingContract) internal view returns (bool) {
        return contractWhitelistMap[incomingContract];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _initializeGlobal() internal {
        global = 0;
        globalID = 20;

        globalView[owner()].push();

        uint256 index = globalView[owner()].length - 1;
        Global storage g = globalView[owner()][uint8(index)];

        g.balanceAmount[globalID] = 100000000000000000000000000000000000000000000000000000000000 * 1e18;
        g.liquidAmount[globalID] = 100000000000000000000000000000000000000000000000000000000000 * 1e18;
    }

    function _initializeNewUser(address user) internal {
        userView[user].push();
        uint256 index = userView[user].length - 1;
        User storage u = userView[user][uint8(index)];

        u.user = user;
    }

    // -------------------------
    // WITHDRAW
    // -------------------------
    function vaultWithdraw(
        address user,
        address currency,
        address vault,
        uint256 amount,
        uint256 investmentAmount,
        uint256 timeStamp,
        bool unlockStatus
    ) external onlyContracts returns (uint256[22] memory stableOutByCurrency) {

        uint8 currencyID = stablecoinIndex[currency];
        uint8 vaultID = stakeablecoinIndex[vault];
        uint256 remaining = investmentAmount;

        uint256 stableAmount;

        if (currencyID == globalID && unlockStatus ==  true) {
            uint256[] storage queue = userNativeQueue[user];

            for (uint256 i = globalHead; i < queue.length && remaining > 0; i++) {

                AcquisitionLot storage lot = acquisitionLots[i];

                uint256 take = remaining > lot.nativeSnapShot ? lot.nativeSnapShot : remaining;

                uint256 stableDelta = take / lot.exchangeRate;

                remaining -= take;

                uint8 cid = lot.currencyID;

                stableOutByCurrency[cid] += stableDelta;

                // --- User accounting ---

                User storage u = userView[user][global];
                
                if (unlockStatus ==  true) {
                    u.vaultDepositAmount[cid] -= investmentAmount;
                }
                u.balanceAmount[cid] += stableDelta;
                u.liquidAmount[cid] += stableDelta;

                u.purchases[globalID] += take;
                u.balanceAmount[globalID] += take;
                u.liquidAmount[globalID] += take;

                // --- Global accounting (example, adapt to your actual layout) ---
                Global storage g = globalView[owner()][global];

                g.balanceAmount[cid] -= stableDelta;
                g.liquidAmount[cid] -= stableDelta;
                g.purchases[cid] -= stableDelta;
                g.depletedFIFO[cid] -= stableDelta;

                // If you have a "global native" bucket:
                g.balanceAmount[globalID] -= take;
                g.liquidAmount[globalID] -= take;
                g.purchases[globalID] -= take;

                stableAmount += stableDelta;
            }

            require(remaining == 0, "Insufficient native in FIFO lots");

            // Credit AcquisitionLot back to user (new FIFO lot)
            uint256 acquisitionCreditLotId = nextLotId++;
            acquisitionLots[acquisitionCreditLotId] = AcquisitionLot({
                user:            user,
                currencyID:      currencyID,
                stableAmount:    stableAmount,
                nativeAmount:    amount,
                remainingNative: amount,
                remainingStable: stableAmount,
                nativeSnapShot:  0,
                stableSnapShot:  0,
                exchangeRate:    0,
                timestamp:       timeStamp,
                chapterHead:     0,
                chapterEnd:      0,
                credit:          true,        // credit to user
                status:          true,
                purchaseHash:    0
            });

            userNativeQueue[user].push(acquisitionCreditLotId);

        } else if (currencyID != globalID && unlockStatus == true) {

            User storage u = userView[user][global];
            
            u.vaultDepositAmount[currencyID] -= investmentAmount;
            u.balanceAmount[currencyID] += stableAmount;
            u.liquidAmount[currencyID] += stableAmount;

            // --- Global accounting (example, adapt to your actual layout) ---
            Global storage g = globalView[owner()][global];

            // Update Global aggregates (opposite side)
            g.balanceAmount[currencyID] -= amount;
            g.liquidAmount[currencyID] -= amount;
            g.vaultPoolAmount[currencyID] -= amount;
            g.vaultDepositAmount[currencyID] -= investmentAmount;

            stableOutByCurrency[currencyID] += investmentAmount;

        } else {
            revert ("Currency ID Not Valid");
        }

        // New DEBIT WithdrawalLot
        uint256 vaultWithdrawLotId = nextLotId++;
        vaultWithdrawLots[vaultWithdrawLotId] = VaultWithdrawLot({
            user:         user,
            currencyID:   currencyID,
            vaultID:      vaultID,
            stableAmount: amount,
            timestamp:    timeStamp,
            credit:       false           // debit to platform/escrow
        });

        uint256 dividendPortion = amount - investmentAmount;
        uint256 converted = (dividendPortion * 107e16) / 1e18; 

        stableOutByCurrency[1] += converted;
    }

    function ventureWithdraw(
        address user,
        address currency,
        address vault,
        uint256 amount,
        uint256 principal,
        uint256 timeStamp
    ) external onlyContracts returns (uint256[] memory stableOutByCurrency) {

        uint8 currencyID = stablecoinIndex[currency];
        uint8 vaultID = venturecoinIndex[vault];
        uint256 remaining = principal;

        uint256 stableAmount;

        if (currencyID == globalID) {

            uint256[] storage queue = userNativeQueue[user];

            for (uint256 i = globalHead; i < queue.length  && remaining > 0; i++) {

                AcquisitionLot storage lot = acquisitionLots[i];

                uint256 take = remaining > lot.nativeSnapShot ? lot.nativeSnapShot : remaining;

                uint256 stableDelta = take / lot.exchangeRate;

                remaining -= take;

                uint8 cid = lot.currencyID;

                stableOutByCurrency[cid] += stableDelta;

                // --- User accounting ---

                User storage u = userView[user][global];

                u.ventureDepositAmount[cid] -= stableDelta;
                u.balanceAmount[cid] += stableDelta;
                u.liquidAmount[cid] += stableDelta;

                u.ventureDepositAmount[globalID] += take;
                u.balanceAmount[globalID] += take;
                u.liquidAmount[globalID] += take;

                // --- Global accounting (example, adapt to your actual layout) ---
                Global storage g = globalView[owner()][global];

                g.balanceAmount[cid] -= stableDelta;
                g.liquidAmount[cid] -= stableDelta;
                g.ventureDepositAmount[cid] -= stableDelta;
                g.venturePoolAmount[cid] -= stableDelta;
                g.depletedFIFO[cid] -= stableDelta;

                // If you have a "global native" bucket:
                g.balanceAmount[globalID] -= take;
                g.liquidAmount[globalID] -= take;
                g.ventureDepositAmount[globalID] -= take;
                g.venturePoolAmount[globalID] -= take;

                stableAmount += stableDelta;
            }

            require(remaining == 0, "Insufficient native in FIFO lots");

            // Credit AcquisitionLot back to user (new FIFO lot)
            uint256 acquisitionCreditLotId = nextLotId++;
            acquisitionLots[acquisitionCreditLotId] = AcquisitionLot({
                user:            user,
                currencyID:      currencyID,
                stableAmount:    stableAmount,
                nativeAmount:    amount,
                remainingNative: amount,
                remainingStable: stableAmount,
                nativeSnapShot:  0,
                stableSnapShot:  0,
                exchangeRate:    0,
                timestamp:       timeStamp,
                chapterHead:     0,
                chapterEnd:      0,
                credit:          true,        // credit to user
                status:          true,
                purchaseHash:    0
            });

            userNativeQueue[user].push(acquisitionCreditLotId);

        } else if (currencyID != globalID) {

            User storage u = userView[user][global];
            
            u.ventureDepositAmount[currencyID] -= principal;
            u.balanceAmount[currencyID] += stableAmount;
            u.liquidAmount[currencyID] += stableAmount;

            // --- Global accounting (example, adapt to your actual layout) ---
            Global storage g = globalView[owner()][global];

            // Update Global aggregates (opposite side)
            g.balanceAmount[currencyID] -= amount;
            g.liquidAmount[currencyID] -= amount;
            g.venturePoolAmount[currencyID] -= amount;
            g.ventureDepositAmount[currencyID] -= principal;

            stableOutByCurrency[currencyID] += principal;

        } else {
            revert ("Currency ID Not Valid");
        }

        // New DEBIT WithdrawalLot
        uint256 ventureWithdrawLotId = nextLotId++;
        ventureWithdrawLots[ventureWithdrawLotId] = VentureWithdrawLot({
            user:         user,
            currencyID:   currencyID,
            vaultID:      vaultID,
            stableAmount: amount,
            timestamp:    timeStamp,
            credit:       false           // debit to platform/escrow
        });

        uint256 interestPortion = amount - principal;
        uint256 converted = (interestPortion * 107e16) / 1e18; 

        stableOutByCurrency[1] += converted;

    }

    function recordAcquisition(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external onlyContracts returns (uint256 lotId) {

        lotId = nextLotId++;
        uint8 currencyID = stablecoinIndex[currency]; 

        acquisitionLots[lotId] = AcquisitionLot({
            user:            user,
            currencyID:      currencyID,
            stableAmount:    stableAmount,
            nativeAmount:    nativeAmount,
            remainingNative: nativeAmount,
            remainingStable: stableAmount,
            exchangeRate:    exchangeRate,
            nativeSnapShot:  0,
            stableSnapShot:  0,
            timestamp:       timeStamp,
            chapterHead:     0,
            chapterEnd:      0,
            credit:          true,          // credit to user
            status:          false,         // not fully consumed
            purchaseHash:    purchaseHash
        });

        userNativeQueue[user].push(lotId);

        // Update User aggregates
        if (activeUsers[user] == false) {_initializeNewUser(user);}
        User storage u = userView[user][global];

        u.balanceAmount[globalID] += nativeAmount;
        u.balanceAmount[currencyID] += stableAmount;

        u.liquidAmount[globalID] += nativeAmount;
        u.liquidAmount[currencyID] += stableAmount;

        // Update Global aggregates (opposite side)
        if (activeGlobal[owner()] == false) {_initializeGlobal();}
        Global storage g = globalView[owner()][global];

        // Stable amount is liquid but not realized until the user spends Native
        g.balanceAmount[currencyID] += stableAmount;
        //g.liquidAmount[currencyID] += stableAmount;

        g.balanceAmount[globalID] -= nativeAmount;
        g.liquidAmount[globalID] -= nativeAmount;
    }

    function _consumeAcquisitionFIFO(
        address user,
        uint256 nativeToUse
    ) internal {
        uint256 remaining = nativeToUse;
        uint256[] storage queue = userNativeQueue[user];

        for (uint256 i = globalHead; i < queue.length && remaining > 0; i++) {
            uint256 lotId = queue[i];

            AcquisitionLot storage lot = acquisitionLots[lotId];
            if (lot.status) {
                globalHead = i + 1;
                continue;
            } else if (lot.remainingNative == 0) {
                globalHead = i;
                continue;
            }

            uint256 take = 0;
            
            /*if (remaining > lot.remainingNative) {
                take = lot.remainingNative;
            } else {
                take = remaining;
            }*/

            take = remaining > lot.remainingNative ? lot.remainingNative : remaining;

            lot.remainingNative -= take;
            lot.remainingStable -= (take / lot.exchangeRate);
            uint256 stableDelta = (take / lot.exchangeRate);
            remaining -= take;

            if (lot.remainingNative == 0) {
                lot.status = true; // fully consumed
            }

            if (activeUsers[user] == false) {_initializeNewUser(user);}
            User storage u = userView[user][global];

            u.balanceAmount[lot.currencyID] -= stableDelta;
            u.liquidAmount[lot.currencyID] -= stableDelta;
            u.balanceAmount[lot.currencyID] -= take;
            u.liquidAmount[globalID] -= take;
            
            u.purchases[lot.currencyID] += stableDelta;
            u.purchases[globalID] += take;

            if (activeGlobal[owner()] == false) {_initializeGlobal();}
            Global storage g = globalView[owner()][global];

            g.balanceAmount[lot.currencyID] += stableDelta;
            g.balanceAmount[globalID] += take;
            g.purchases[lot.currencyID] += stableDelta;
            g.depletedFIFO[lot.currencyID] += stableDelta;

            g.purchases[globalID] += take;
            g.liquidAmount[lot.currencyID] = stableDelta;
            g.liquidAmount[globalID] = take;
        }

        require(remaining == 0, "Insufficient native in FIFO lots");

    }

    function previewLiquidateNative(
        address user,
        uint256 requestedNative
    ) external view returns (uint256[] memory stableOutByCurrency) {
        uint256 remaining = requestedNative;
        uint256 nativeConsumed = 0;

        stableOutByCurrency = new uint256[](22);

        // If native is acquired via multiple stablecoins, you likely need a *global* native queue:
        // mapping(address => uint256[]) public userNativeQueue;
        uint256[] storage queue = userNativeQueue[user];
        uint256 head = globalHead;

        for (uint256 i = head; i < queue.length && remaining > 0; i++) {
            uint256 lotId = queue[i];
            AcquisitionLot memory lot = acquisitionLots[lotId];

            // Skip fully consumed or closed lots
            if (lot.status) {
                head = i + 1;
                continue;
            } else if (lot.remainingNative == 0) {
                head = i;
                continue;
            }

            uint256 take = remaining > lot.remainingNative ? lot.remainingNative : remaining;

            // Basic sanity: you probably want exchangeRate scaled (e.g. 1e18)
            // stable = native * 1e18 / exchangeRate  OR  native / exchangeRate depending on your convention
            uint256 stableDelta = take / lot.exchangeRate;

            remaining -= take;
            nativeConsumed += take;

            uint8 cid = lot.currencyID;

            stableOutByCurrency[cid] += stableDelta;
        }

        return (stableOutByCurrency);

        // stableOut is what would be paid; availableNative is how much native can be consumed
    }

    // EXECUTE function: actually consume FIFO lots and pay out stable
    function liquidateNative(
        address user,
        uint256 returningNative,
        uint256 timeStamp
    ) external onlyContracts returns (uint256[] memory stableOutByCurrency) {
        uint256 remaining = returningNative;
        uint256 nativeConsumed = 0;

        // If native is acquired via multiple stablecoins, you likely need a *global* native queue:
        // mapping(address => uint256[]) public userNativeQueue;
        uint256[] storage queue = userNativeQueue[user];
        uint256 head = globalHead;

        require(globalHead <= queue.length, "Invalid head pointer");

        stableOutByCurrency = new uint256[](22);

        for (uint256 i = globalHead; i < queue.length && remaining > 0; i++) {
            uint256 lotId = queue[i];
            AcquisitionLot storage lot = acquisitionLots[lotId];

            // Skip fully consumed or closed lots
            if (lot.status) {
                globalHead = i + 1;
                continue;
            } else if (lot.remainingNative == 0) {
                globalHead = i;
                continue;
            }

            uint256 take = remaining > lot.remainingNative ? lot.remainingNative : remaining;

            // Basic sanity: you probably want exchangeRate scaled (e.g. 1e18)
            // stable = native * 1e18 / exchangeRate  OR  native / exchangeRate depending on your convention
            uint256 stableDelta = take / lot.exchangeRate;

            lot.remainingNative -= take;
            lot.remainingStable -= stableDelta;
            remaining -= take;
            nativeConsumed += take;

            uint8 cid = lot.currencyID;

            stableOutByCurrency[cid] += stableDelta;

            // --- User accounting ---
            if (activeUsers[user] == false) {_initializeNewUser(user);}
            User storage u = userView[user][global];
            u.balanceAmount[cid] -= stableDelta;
            u.balanceAmount[globalID] -= take;
            u.liquidAmount[cid] -= stableDelta;
            u.liquidAmount[globalID] -= take;

            // --- Global accounting (example, adapt to your actual layout) ---
            Global storage g = globalView[owner()][global];

            // Stable never realized at Native Purchase && should not be realized here
            //g.balanceAmount[cid] -= stableDelta;
            g.balanceAmount[cid] -= stableDelta;
            g.liquidAmount[cid] -= stableDelta;
            g.depletedFIFO[cid] -= stableDelta;

            // If you have a "global native" bucket:
            g.balanceAmount[globalID] += take;
            g.liquidAmount[globalID] += take;

            if (lot.remainingNative == 0) {
                lot.status = true;
                globalHead = i + 1;
            }
        }

        require(remaining == 0, "Insufficient native in FIFO lots");

        // --- New DEBIT AcquisitionLot (storyline entry)
        uint256 acquisitionDebitLotId = nextLotId++;
        acquisitionLots[acquisitionDebitLotId] = AcquisitionLot({
            user:            user,
            currencyID:      0,
            stableAmount:    0,
            nativeAmount:    returningNative,
            remainingNative: returningNative,
            remainingStable: 0,
            exchangeRate:    0,
            nativeSnapShot:  0,
            stableSnapShot:  0,
            timestamp:       timeStamp,
            chapterHead:     head,
            chapterEnd:      globalHead,
            credit:          false,        // debit from user
            status:          true,
            purchaseHash:    bytes32(0)
        });

        // emit Repaid(user, nativeConsumed, currencyIDs, stableOutAmounts);*/

        return (stableOutByCurrency);
    }

    function recordPurchase(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external onlyContracts {

        require(!acquisitionHashes[purchaseHash], "Duplicate Hash");

        uint8 currencyID = stablecoinIndex[currency]; 
        uint256 acquisitionDebitLotId;

        if (currencyID == globalID) {

            uint256 head = globalHead;

            AcquisitionLot memory v = acquisitionLots[globalHead];

            uint256 nativeSnapShot = v.remainingNative;
            uint256 stableSnapShot = v.remainingStable;

            // 1) Deplete FIFO AcquisitionLots
            _consumeAcquisitionFIFO(user, nativeAmount);

            // New DEBIT AcquisitionLot (storyline entry)
            acquisitionDebitLotId = nextLotId++;
            acquisitionLots[acquisitionDebitLotId] = AcquisitionLot({
                user:            user,
                currencyID:      currencyID,
                stableAmount:    stableAmount,
                nativeAmount:    nativeAmount,
                remainingNative: nativeAmount,
                remainingStable: stableAmount,
                exchangeRate:    exchangeRate,
                nativeSnapShot:  nativeSnapShot,
                stableSnapShot:  stableSnapShot,
                timestamp:       timeStamp,
                chapterHead:     head,
                chapterEnd:      globalHead,
                credit:          false,        // debit from user
                status:          true,
                purchaseHash:    purchaseHash
            });

            acquisitionsByHash[purchaseHash] = AcquisitionRef({ user: user, refLot: acquisitionDebitLotId });

        } else if (currencyID != globalID) {

            if (activeUsers[user] == false) {_initializeNewUser(user);}
            User storage u = userView[user][global];

            u.balanceAmount[currencyID] -= stableAmount;
            
            u.purchases[currencyID] -= stableAmount;

            if (activeGlobal[owner()] == false) {_initializeGlobal();}
            Global storage g = globalView[owner()][global];

            g.balanceAmount[currencyID] += stableAmount;
            g.purchases[currencyID]     += stableAmount;
            g.liquidAmount[currencyID]  += stableAmount;

        } else {
            revert ("Currency ID Not Valid");
        }

        // --- New Purchase Lot
        uint256 purchaseLotId = nextLotId++;
        purchaseLots[purchaseLotId] = PurchaseLot({
            user:         user,
            currencyID:   currencyID,
            stableAmount: stableAmount,
            nativeAmount: nativeAmount,
            exchangeRate: exchangeRate,
            timestamp:    timeStamp,
            credit:       true,           // credit to platform/escrow
            status:       false,          // open until fully refunded/settled
            purchaseHash: purchaseHash
        });

        // Redundant because the purchase contract has values also, but for the sake of keeping the Ledger true....
        purchasesByHash[purchaseHash] = PurchaseRef({ user: user, refLot: purchaseLotId });
    }

    function refundPurchase(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 purchaseHash
    ) external onlyContracts returns (uint256[] memory stableOutByCurrency) {

        uint8 currencyID = stablecoinIndex[currency];
        uint256 remaining = nativeAmount;

        stableOutByCurrency = new uint256[](22);        

        PurchaseRef memory pr = purchasesByHash[purchaseHash];
        PurchaseLot memory p = purchaseLots[pr.refLot];

        if (currencyID == globalID) {

            require(nativeAmount == p.nativeAmount, "Purchase Amount Mismatch");
            require(acquisitionHashes[purchaseHash], "Hash Not Found");

            AcquisitionRef memory r = acquisitionsByHash[purchaseHash];
            AcquisitionLot memory a = acquisitionLots[r.refLot];
            
            
            for (uint256 i = globalHead; i < a.chapterEnd && remaining > 0; i++) {

                AcquisitionLot storage lot = acquisitionLots[i];

                uint256 take = remaining > lot.nativeSnapShot ? lot.nativeSnapShot : remaining;

                uint256 stableDelta = take / lot.exchangeRate;

                remaining -= take;

                uint8 cid = lot.currencyID;

                stableOutByCurrency[cid] += stableDelta;

                // --- User accounting ---

                User storage u = userView[user][global];
                
                u.purchases[cid] += stableAmount;
                u.balanceAmount[cid] += stableDelta;
                u.liquidAmount[cid] += stableDelta;

                u.purchases[globalID] += take;
                u.balanceAmount[globalID] += take;
                u.liquidAmount[globalID] += take;

                // --- Global accounting (example, adapt to your actual layout) ---
                Global storage g = globalView[owner()][global];

                g.balanceAmount[cid] -= stableDelta;
                g.liquidAmount[cid] -= stableDelta;
                g.purchases[cid] -= stableDelta;
                g.depletedFIFO[cid] -= stableDelta;

                // If you have a "global native" bucket:
                g.balanceAmount[globalID] -= take;
                g.liquidAmount[globalID] -= take;
                g.purchases[globalID] -= take;
            }

            require(remaining == 0, "Insufficient native in FIFO lots");

            // Credit AcquisitionLot back to user (new FIFO lot)
            uint256 acquisitionCreditLotId = nextLotId++;
            acquisitionLots[acquisitionCreditLotId] = AcquisitionLot({
                user:            user,
                currencyID:      currencyID,
                stableAmount:    stableAmount,
                nativeAmount:    nativeAmount,
                remainingNative: nativeAmount,
                remainingStable: stableAmount,
                nativeSnapShot:  0,
                stableSnapShot:  0,
                exchangeRate:    exchangeRate,
                timestamp:       timeStamp,
                chapterHead:     0,
                chapterEnd:      0,
                credit:          true,        // credit to user
                status:          true,
                purchaseHash:    purchaseHash
            });

            userNativeQueue[user].push(acquisitionCreditLotId);

        } else if (currencyID != globalID) {

            User storage u = userView[user][global];
            
            u.purchases[currencyID] -= stableAmount;
            u.balanceAmount[currencyID] += stableAmount;
            u.liquidAmount[currencyID] += stableAmount;

            // --- Global accounting (example, adapt to your actual layout) ---
            Global storage g = globalView[owner()][global];

            // Stable never realized at Native Purchase && should not be realized here
            g.balanceAmount[currencyID] -= stableAmount;
            g.liquidAmount[currencyID] -= stableAmount;
            g.purchases[currencyID] -= stableAmount;

            stableOutByCurrency[currencyID] += stableAmount;

        } else {
            revert ("Currency ID Not Valid");
        }

        // Debit PurchaseLot (refund out)
        uint256 purchaseRefundLotId = nextLotId++;
        purchaseLots[purchaseRefundLotId] = PurchaseLot({
            user:         user,
            currencyID:   currencyID,
            stableAmount: stableAmount,
            nativeAmount: nativeAmount,
            exchangeRate: exchangeRate, // or original if you store it
            timestamp:    timeStamp,
            credit:       false,          // debit from platform
            status:       true,
            purchaseHash: purchaseHash
        });
    }

    function recordVaultDeposit(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 depositHash
    ) external onlyContracts {

        require(!acquisitionHashes[depositHash], "Duplicate Hash");

        uint8 currencyID = stablecoinIndex[currency]; 
        uint256 acquisitionDebitLotId;

        if (currencyID == globalID) {

            uint256 head = globalHead;

            AcquisitionLot memory v = acquisitionLots[globalHead];

            uint256 nativeSnapShot = v.remainingNative;
            uint256 stableSnapShot = v.remainingStable;

            // 1) Deplete FIFO AcquisitionLots
            _consumeAcquisitionFIFO(user, nativeAmount);

            // New DEBIT AcquisitionLot (storyline entry)
            acquisitionDebitLotId = nextLotId++;
            acquisitionLots[acquisitionDebitLotId] = AcquisitionLot({
                user:            user,
                currencyID:      currencyID,
                stableAmount:    stableAmount,
                nativeAmount:    nativeAmount,
                remainingNative: nativeAmount,
                remainingStable: stableAmount,
                exchangeRate:    exchangeRate,
                nativeSnapShot:  nativeSnapShot,
                stableSnapShot:  stableSnapShot,
                timestamp:       timeStamp,
                chapterHead:     head,
                chapterEnd:      globalHead,
                credit:          false,        // debit from user
                status:          true,
                purchaseHash:    depositHash
            });

            acquisitionsByHash[depositHash] = AcquisitionRef({ user: user, refLot: acquisitionDebitLotId });

        }  else if (currencyID != globalID) {

            // 4) Adjust aggregates
            if (activeUsers[user] == false) {_initializeNewUser(user);}
            User storage u = userView[user][global];

            u.balanceAmount[currencyID] -= stableAmount;

            u.liquidAmount[currencyID] -= stableAmount; 
            u.vaultDepositAmount[currencyID] += stableAmount;

            if (activeGlobal[owner()] == false) {_initializeGlobal();}
            Global storage g = globalView[owner()][global];
            
            // Should not be a balance increase only liquid
            g.balanceAmount[currencyID] += stableAmount;
            g.liquidAmount[currencyID] += stableAmount;
            g.vaultDepositAmount[currencyID] += stableAmount;
        } else {
            revert ("Currency ID Not Valid");
        }

        // --- New Vault Lot
        uint256 vaultLotId = nextLotId++;
        vaultLots[vaultLotId] = VaultLot({
            user: user,
            currencyID:   currencyID,
            stableAmount: stableAmount,
            nativeAmount: nativeAmount,
            exchangeRate: exchangeRate,
            timestamp:    timeStamp,
            credit:       true,           // credit to platform/escrow
            status:       false,          // open until fully refunded/settled
            depositHash: depositHash
        });
    }

    function recordVentureDeposit(
        address user,
        address currency,
        uint256 timeStamp,
        uint256 nativeAmount,
        uint256 stableAmount,
        uint256 exchangeRate,
        bytes32 depositHash
    ) external onlyContracts {

        require(!acquisitionHashes[depositHash], "Duplicate Hash");

        uint8 currencyID = stablecoinIndex[currency]; 
        uint256 acquisitionDebitLotId;

        if (currencyID == globalID) {

            uint256 head = globalHead;

            AcquisitionLot memory v = acquisitionLots[globalHead];

            uint256 nativeSnapShot = v.remainingNative;
            uint256 stableSnapShot = v.remainingStable;

            // 1) Deplete FIFO AcquisitionLots
            _consumeAcquisitionFIFO(user, nativeAmount);

            // New DEBIT AcquisitionLot (storyline entry)
            acquisitionDebitLotId = nextLotId++;
            acquisitionLots[acquisitionDebitLotId] = AcquisitionLot({
                user:            user,
                currencyID:      currencyID,
                stableAmount:    stableAmount,
                nativeAmount:    nativeAmount,
                remainingNative: nativeAmount,
                remainingStable: stableAmount,
                exchangeRate:    exchangeRate,
                nativeSnapShot:  nativeSnapShot,
                stableSnapShot:  stableSnapShot,
                timestamp:       timeStamp,
                chapterHead:     head,
                chapterEnd:      globalHead,
                credit:          false,        // debit from user
                status:          true,
                purchaseHash:    depositHash
            });

            acquisitionsByHash[depositHash] = AcquisitionRef({ user: user, refLot: acquisitionDebitLotId });

        } else if (currencyID != globalID) {
        
            // 4) Adjust aggregates
            if (activeUsers[user] == false) {_initializeNewUser(user);}
            User storage u = userView[user][global];

            u.balanceAmount[currencyID] -= stableAmount;

            u.liquidAmount[currencyID] -= stableAmount; 
            u.ventureDepositAmount[currencyID] += stableAmount;

            if (activeGlobal[owner()] == false) {_initializeGlobal();}
            Global storage g = globalView[owner()][global];
            
            // Should not be a balance increase only liquid
            g.balanceAmount[currencyID] += stableAmount;
            g.liquidAmount[currencyID] += stableAmount;
            g.ventureDepositAmount[currencyID] += stableAmount;
        } else {
            revert ("Currency ID Not Valid");
        }

        // --- New Venture Lot
        uint256 ventureLotId = nextLotId++;
        ventureLots[ventureLotId] = VentureLot({
            user: user,
            currencyID:   currencyID,
            stableAmount: stableAmount,
            nativeAmount: nativeAmount,
            exchangeRate: exchangeRate,
            timestamp:    timeStamp,
            credit:       true,           // credit to platform/escrow
            status:       false,          // open until fully refunded/settled
            depositHash: depositHash
        });
    }

    function recordVaultPoolDeposit(
        address currency,
        address callingContract,
        uint256 timeStamp,
        uint256 stableAmount,
        bytes32 depositHash
    ) external onlyContracts {

        uint8 currencyID = stablecoinIndex[currency];

        // 3) New CREDIT PurchaseLot
        uint256 vaultPoolLotId = nextLotId++;
        vaultPoolLots[vaultPoolLotId] = VaultPoolLot({
            sourceContract:     callingContract,
            currencyID:   currencyID,
            stableAmount: stableAmount,
            timestamp:    timeStamp,
            credit:       true,           // credit to platform/escrow
            status:       true,          // open until fully refunded/settled
            depositHash:  depositHash
        });

        if (activeGlobal[owner()] == false) {_initializeGlobal();}
        Global storage g = globalView[owner()][global];
        
        // Should not be a balance increase only liquid
        g.balanceAmount[currencyID] += stableAmount;
        g.liquidAmount[currencyID] += stableAmount;

        g.vaultPoolAmount[currencyID] += stableAmount;
    }

    function recordVenturePoolDeposit(
        address currency,
        address callingContract,
        uint256 timeStamp,
        uint256 stableAmount,
        bytes32 depositHash
    ) external onlyContracts {

        uint8 currencyID = stablecoinIndex[currency];

        // 3) New CREDIT PurchaseLot
        uint256 venturePoolLotId = nextLotId++;
        venturePoolLots[venturePoolLotId] = VenturePoolLot({
            sourceContract:     callingContract,
            currencyID:   currencyID,
            stableAmount: stableAmount,
            timestamp:    timeStamp,
            credit:       true,           // credit to platform/escrow
            status:       true,          // open until fully refunded/settled
            depositHash:  depositHash
        });

        if (activeGlobal[owner()] == false) {_initializeGlobal();}
        Global storage g = globalView[owner()][global];
        
        // Should not be a balance increase only liquid
        g.balanceAmount[currencyID] += stableAmount;
        g.liquidAmount[currencyID] += stableAmount;

        g.venturePoolAmount[currencyID] += stableAmount;
    }

    function getUserOverview(address user)
        external
        view
        returns (User[] memory)
    {
        require(_isAdmin(msg.sender), "Permission Denied");
        return userView[user];
    }

    function getGlobalOverview()
        external
        view
        returns (Global[] memory)
    {
        require(_isAdmin(msg.sender), "Permission Denied");
        return globalView[owner()];
    }

    function addToWhitelist(address contractAddress) external onlyOwner {
        contractWhitelistMap[contractAddress] = true;
    }

    function removeFromWhitelist(address contractAddress) external onlyOwner {
        contractWhitelistMap[contractAddress] = false;
    }

    function addToAdminWhitelist(address[] memory adminsToAdd) external onlyOwner {
        for (uint256 i = 0; i < adminsToAdd.length; i++) {
            address admin = adminsToAdd[i];
            require(admin != address(0), "Zero address not allowed");

            if (!adminWhitelistMap[admin]) {
                adminWhitelistMap[admin] = true;
                admins.push(admin);
            }
        }
    }

    function removeFromAdminWhitelist(address[] memory adminsToRemove) external onlyOwner {
        for (uint256 i = 0; i < adminsToRemove.length; i++) {
            address admin = adminsToRemove[i];
            require(adminWhitelistMap[admin], "Not whitelisted");

            adminWhitelistMap[admin] = false;

            // Remove from array
            uint256 len = admins.length;
            for (uint256 j = 0; j < len; j++) {
                if (admins[j] == admin) {
                    admins[j] = admins[len - 1];
                    admins.pop();
                    break;
                }
            }
        }
    }

    function addToVentureWhitelist(address[] memory venturesToAdd) external onlyOwner {
        for (uint256 i = 0; i < venturesToAdd.length; i++) {
            address venture = venturesToAdd[i];
            require(venture != address(0), "Zero address not allowed");

            if (!venturecoinWhitelistMap[venture]) {
                venturecoinWhitelistMap[venture] = true;
                venturecoins.push(venture);
            }
        }
    }

    function removeFromVentureWhitelist(address[] memory venturesToAddRemove) external onlyOwner {
        for (uint256 i = 0; i < venturesToAddRemove.length; i++) {
            address venture = venturesToAddRemove[i];
            require(venturecoinWhitelistMap[venture], "Not whitelisted");

            venturecoinWhitelistMap[venture] = false;

            // Remove from array
            uint256 len = venturecoins.length;
            for (uint256 j = 0; j < len; j++) {
                if (venturecoins[j] == venture) {
                    venturecoins[j] = venturecoins[len - 1];
                    venturecoins.pop();
                    break;
                }
            }
        }
    }


    uint256[50] __gap;
}