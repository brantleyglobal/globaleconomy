// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../interfaces/IGlobalLedger.sol";

contract GlobalLedger is IGlobalLedger, Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable { 

    // -------------------------
    // DATA STRUCTURES
    // -------------------------
    struct Global {
        uint256[150] balanceAmount;
        uint256[150] liquidAmount;
        uint256[150] purchases;
        uint256[150] vaultDepositAmount;
        uint256[150] ventureDepositAmount;
        uint256[150] venturePoolAmount;
        uint256[150] vaultPoolAmount;
        uint256 timestamp;
    }

    struct User {
        address user;
        uint256[150] balanceAmount;
        uint256[150] liquidAmount;
        uint256[150] purchases;
        uint256[150] vaultDepositAmount;
        uint256[150] ventureDepositAmount;
        uint256[150] vaultWithdrawAmount;
        uint256[150] ventureWithdrawAmount;
        uint256 timestamp;
    }

    struct PurchaseLot {
      address user;
      uint256 currencyID;
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
      uint256 currencyID;
      uint256 stableAmount;
      uint256 nativeAmount;
      uint256 remainingNative;
      uint256 remainingStable;
      uint256 exchangeRate;
      uint256 timestamp;
      uint256 chapterHead;
      uint256 chapterEnd;
      bool credit;
      bool status;
      bytes32 purchaseHash;
    }

    struct VaultLot {
      address user;
      uint256 currencyID;
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
      uint256 currencyID;
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
      uint256 currencyID;
      uint256 vaultID;
      uint256 stableAmount;
      uint256 timestamp;
      bool credit;
    }

    struct VentureWithdrawLot {
      address user;
      uint256 currencyID;
      uint256 vaultID;
      uint256 stableAmount;
      uint256 timestamp;
      bool credit;
    }

    struct VaultPoolLot {
      address sourceContract;
      uint256 currencyID;
      uint256 stableAmount;
      uint256 timestamp;
      bool credit;
      bool status;
      bytes32 depositHash;
    }

    struct VenturePoolLot {
      address sourceContract;
      uint256 currencyID;
      uint256 stableAmount;
      uint256 timestamp;
      bool credit;
      bool status;
      bytes32 depositHash;
    }

    struct FIFOConsumeParams {
        address user;
        uint256 currencyID;
        uint256 vaultID;
        uint256 remaining;
        uint256 investmentAmount;
        uint256 timeStamp;
        bool initiationStatus;
        bool vaultDraw;
        bool ventureDraw;
        bool purchase;
    }

    struct FIFOBalanceParams {
        address user;
        uint256 nativeAmount;
        uint256 timeStamp;
        bytes32 purchaseHash;
    }

    error NotAuthorized();
    error InvalidUserAddress();
    error InvalidPoolCurrency();
    error InvalidHash();
    error HashDuplicated();
    error MintingFailed();
    error InsufficientFIFOLots();

    uint256 public nextLotId;
    uint256 private globalHead;
    uint256 private globalID;

    address[] public users;
    address[] public stables;
    address[] public stakeables;
    address[] public ventures;
    address[] public admins;
    address[] public contractAddresses;
    AcquisitionLot[] private globalQueue;

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
    mapping(address => uint256[]) public acquisitionChapter;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(address => bool) private venturecoinWhitelistMap;
    mapping(address => uint256) stablecoinIndex;
    mapping(address => uint256) stakeablecoinIndex;
    mapping(address => uint256) venturecoinIndex;
    mapping(address => uint256) adminIndex;
    mapping(address => uint256) contractIndex;
 
    // -------------------------
    // EVENTS
    // -------------------------
    event Deposit(uint256 lotId, address indexed user, uint256 currency, uint256 amount);
    event Spend(uint256 lotId, address indexed user, uint256 currency, uint256 amount, address indexed caller);
    event Refund(uint256 lotId, address indexed user, uint256 currency, uint256 amount,  address indexed caller);
    event Withdrawal(uint256 lotId, address indexed user, uint256 currency, uint256 amount);

    // -------------------------
    // INITIALIZER
    // -------------------------
    function initialize(
        address _owner
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

    }

    modifier onlyContracts() {
        if(!_isContract(msg.sender)) revert NotAuthorized();
        _;
    }

    // Check token whitelist using map
    function _isWhitelisted(address token) internal view returns (bool) {
        return stablecoinWhitelistMap[token];
    }

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function _isContract(address incomingContract) internal view returns (bool) {
        return contractWhitelistMap[incomingContract];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _initializeGlobal() internal {
        globalID = 0;
        
        globalView[owner()].push();

        uint256 gL = globalView[owner()].length - 1;
        Global storage g = globalView[owner()][gL];

        g.balanceAmount[globalID] = 100000000000000000000000000000000000;
        g.liquidAmount[globalID] = 100000000000000000000000000000000000;
        activeGlobal[owner()] = true;
    }

    function _initializeNewUser(address user) internal {

        userView[user].push();

        uint256 uL = userView[user].length - 1;
        User storage u = userView[user][uL];

        u.user = user;
        activeUsers[user] = true;
    }

    function recordAcquisition(
        LedgerAcquisitionHandle calldata d
    ) external override onlyContracts {

        address user = d.user;
        address token = d.token;
        uint256 stableAmount = d.stableAmount;
        uint256 nativeAmount = d.nativeAmount;
        uint256 exchangeRate = d.exchangeRate;
        uint256 timeStamp = d.timeStamp;
        bytes32 purchaseHash = d.purchaseHash;

        if(user == address(0)) revert InvalidUserAddress();

        uint256 lotId;
        unchecked { lotId = nextLotId++; }
        uint256 currencyID = stablecoinIndex[token]; 

        {

            acquisitionLots[lotId] = (AcquisitionLot({
                user:            user,
                currencyID:      currencyID,
                stableAmount:    stableAmount,
                nativeAmount:    nativeAmount,
                remainingNative: nativeAmount,
                remainingStable: stableAmount,
                exchangeRate:    exchangeRate,
                timestamp:       timeStamp,
                chapterHead:     0,
                chapterEnd:      0,
                credit:          true,          // credit to user
                status:          false,         // not fully consumed
                purchaseHash:    purchaseHash
            }));

            globalQueue.push(acquisitionLots[lotId]);
        }

        {
            // Update User aggregates
            if (activeUsers[user] == false) {_initializeNewUser(user);}
            uint256 uL = userView[user].length - 1;
            User storage u = userView[user][uL];

            unchecked {
                u.balanceAmount[globalID] += nativeAmount;
                u.balanceAmount[currencyID] += stableAmount;

                u.liquidAmount[globalID] += nativeAmount;
                u.liquidAmount[currencyID] += stableAmount;
            }
        }

        {
            // Update Global aggregates (opposite side)
            if (activeGlobal[owner()] == false) {_initializeGlobal();}
            uint256 gL = globalView[owner()].length - 1;
            Global storage g = globalView[owner()][gL];

            // Stable amount is liquid but not realized until the user spends Native
            unchecked {
                g.balanceAmount[currencyID] += stableAmount;
                //g.liquidAmount[currencyID] += stableAmount;

                g.balanceAmount[globalID] -= nativeAmount;
                g.liquidAmount[globalID] -= nativeAmount;
            }
        }
    }

    function liquidateNative(
        address user,
        uint256 returningNative,
        uint256 timeStamp
    ) external onlyContracts returns (uint256[] memory stableOutByCurrency) {

        // If native is acquired via multiple stablecoins, use a *global* native queue:

        (stableOutByCurrency) = _balanceLiquidationFIFO(
            user,
            returningNative,
            timeStamp
        );

        return (stableOutByCurrency);
    }

    function recordPurchase(
        LedgerPurchaseHandle calldata d
    ) external override onlyContracts {
        uint256[] memory stableOutByCurrency = new uint256[](150);

        address user = d.user;
        address token = d.token;
        uint256 stableAmount = d.stableAmount;
        uint256 nativeAmount = d.nativeAmount;
        uint256 exchangeRate = d.exchangeRate;
        uint256 timeStamp = d.timeStamp;
        bytes32 purchaseHash = d.purchaseHash;

        if(user == address(0)) revert InvalidUserAddress();
        if(acquisitionHashes[purchaseHash]) revert HashDuplicated();
        acquisitionHashes[purchaseHash] = true;

        uint256 currencyID = stablecoinIndex[token];

        if (currencyID == globalID) {

            uint256 head = globalHead;
            {

                // 1) Deplete FIFO AcquisitionLots
                _consumeAcquisitionFIFO(
                    FIFOConsumeParams({
                        user:             user,
                        currencyID:       currencyID,
                        vaultID:          0,
                        remaining:        nativeAmount,
                        investmentAmount: 0,
                        timeStamp:        timeStamp,
                        initiationStatus: false,
                        vaultDraw:        false,
                        ventureDraw:      false,
                        purchase:         true
                    }),
                    stableOutByCurrency
                );
            }

            {

                uint256 lotId;
                unchecked { lotId = nextLotId++; }

                acquisitionLots[lotId] = AcquisitionLot({
                    user:            user,
                    currencyID:      currencyID,
                    stableAmount:    stableAmount,
                    nativeAmount:    nativeAmount,
                    remainingNative: nativeAmount,
                    remainingStable: stableAmount,
                    exchangeRate:    exchangeRate,
                    timestamp:       timeStamp,
                    chapterHead:     head,
                    chapterEnd:      globalHead,
                    credit:          false,          // credit to user
                    status:          true,         // not fully consumed
                    purchaseHash:    purchaseHash
                });

                acquisitionsByHash[purchaseHash] = AcquisitionRef({ user: user, refLot: lotId });
            }

        } else if (currencyID != globalID) {

            {
                if (activeGlobal[owner()] == false) {_initializeGlobal();}
                uint256 gL = globalView[owner()].length - 1;
                Global storage g = globalView[owner()][gL];

                unchecked {
                    g.balanceAmount[currencyID] += stableAmount;
                    g.purchases[currencyID]     += stableAmount;
                    g.liquidAmount[currencyID]  += stableAmount;
                }
            }

            {
                if (activeUsers[d.user] == false) {_initializeNewUser(d.user);}
                uint256 uL = userView[d.user].length - 1;
                User storage u = userView[d.user][uL];

                unchecked {
                    u.purchases[globalID] += nativeAmount;
                    u.purchases[currencyID] += stableAmount;
                }
            }

        } else {
            revert ("Currency ID Not Valid");
        }

        // --- New Purchase Lot
        uint256 purchaseLotId;
        unchecked { purchaseLotId = nextLotId++; }
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
        purchasesByHash[purchaseHash] = PurchaseRef({ user: d.user, refLot: purchaseLotId });

    }

    function refundPurchase(
        LedgerPurchaseHandle calldata d
    ) external override onlyContracts returns (uint256[] memory stableOutByCurrency) {

        address user = d.user;
        address token = d.token;
        uint256 stableAmount = d.stableAmount;
        uint256 nativeAmount = d.nativeAmount;
        uint256 exchangeRate = d.exchangeRate;
        uint256 timeStamp = d.timeStamp;
        bytes32 purchaseHash = d.purchaseHash;

        if(user == address(0)) revert InvalidUserAddress();

        uint256 currencyID = stablecoinIndex[token];        

        if (currencyID == globalID) {

            if(!acquisitionHashes[purchaseHash]) revert InvalidHash();
            
            (stableOutByCurrency) = _balanceRefundFIFO(
                FIFOBalanceParams({
                    user: user,
                    nativeAmount: nativeAmount,
                    timeStamp: timeStamp,
                    purchaseHash: purchaseHash
                })
            );

        } else if (currencyID != globalID) {

            {
                uint256 uL = userView[d.user].length - 1;
                User storage u = userView[d.user][uL];

                // --- User accounting ---
                unchecked {
                    u.purchases[currencyID] -= stableAmount;
                    u.purchases[globalID] -= nativeAmount;
                }
            }

            {
                // --- Global accounting ---
                uint256 gL = globalView[owner()].length - 1;
                Global storage g = globalView[owner()][gL];

                // Stable never realized at Native Purchase && should not be realized here
                unchecked {
                    g.balanceAmount[currencyID] -= stableAmount;
                    g.liquidAmount[currencyID] -= stableAmount;
                    g.purchases[currencyID] -= stableAmount;

                    stableOutByCurrency[currencyID] += stableAmount;
                }
            }

        } else {
            revert ("Currency ID Not Valid");
        }

        // Debit PurchaseLot (refund out)
        uint256 purchaseRefundLotId;
        unchecked { purchaseRefundLotId = nextLotId++; }
        purchaseLots[purchaseRefundLotId] = PurchaseLot({
            user:         user,
            currencyID:   currencyID,
            stableAmount: stableAmount,
            nativeAmount: nativeAmount,
            exchangeRate: exchangeRate,   // or original if you store it
            timestamp:    timeStamp,
            credit:       false,          // debit from platform
            status:       true,
            purchaseHash: purchaseHash
        });
    }

    function recordVaultDeposit(
        LedgerDepositHandle calldata d
    ) external override onlyContracts { 

        address user = d.user;
        address token = d.token;
        address asset = d.asset;
        uint256 stableAmount = d.stableAmount;
        uint256 nativeAmount = d.nativeAmount;
        uint256 exchangeRate = d.exchangeRate;
        uint256 timeStamp = d.timeStamp;
        bytes32 depositHash = d.depositHash;

        if(user == address(0)) revert InvalidUserAddress();
        if(asset == address(0)) revert MintingFailed();
        if(depositHash != bytes32(0)) { if(acquisitionHashes[depositHash]) revert HashDuplicated(); }

        uint256 currencyID = stablecoinIndex[token];
        uint256 vaultID = stakeablecoinIndex[asset];
        uint256 lotId;
        unchecked { lotId = nextLotId++; }

        acquisitionLots[lotId] = AcquisitionLot({
            user:            user,
            currencyID:      currencyID,
            stableAmount:    stableAmount,
            nativeAmount:    nativeAmount,
            remainingNative: nativeAmount,
            remainingStable: stableAmount,
            exchangeRate:    exchangeRate,
            timestamp:       timeStamp,
            chapterHead:     0,
            chapterEnd:      0,
            credit:          true,          // credit to user
            status:          false,         // not fully consumed
            purchaseHash:    depositHash
        });

        globalQueue.push(acquisitionLots[lotId]);

        // Update User aggregates
        if (activeUsers[user] == false) { _initializeNewUser(d.user); }
        uint256 uL = userView[user].length - 1;
        User storage u = userView[user][uL];

        unchecked { u.vaultDepositAmount[vaultID] += nativeAmount; }

        // Update Global aggregates (opposite side)
        if (activeGlobal[owner()] == false) { _initializeGlobal(); }
        uint256 gL = globalView[owner()].length - 1;
        Global storage g = globalView[owner()][gL];

        // Stable amount is liquid but not realized until the user spends Native
        unchecked {
            g.balanceAmount[currencyID] += d.stableAmount;
            g.liquidAmount[currencyID] += d.stableAmount;

            g.vaultDepositAmount[vaultID] += d.nativeAmount;
        }

        // --- New Vault Lot
        uint256 vaultLotId = nextLotId++;
        vaultLots[vaultLotId] = VaultLot({
            user:         d.user,
            currencyID:   currencyID,
            stableAmount: d.stableAmount,
            nativeAmount: d.nativeAmount,
            exchangeRate: d.exchangeRate,
            timestamp:    d.timeStamp,
            credit:       true,           // credit to platform/escrow
            status:       false,          // open until fully refunded/settled
            depositHash: d.depositHash
        });
    }

    function recordVentureDeposit(
        LedgerDepositHandle calldata d
    ) external override onlyContracts {

        address user = d.user;
        address token = d.token;
        address asset = d.asset;
        uint256 stableAmount = d.stableAmount;
        uint256 nativeAmount = d.nativeAmount;
        uint256 exchangeRate = d.exchangeRate;
        uint256 timeStamp = d.timeStamp;
        bytes32 depositHash = d.depositHash;
        
        if(user == address(0)) revert InvalidUserAddress();
        if(acquisitionHashes[depositHash]) revert HashDuplicated();

        uint256 currencyID = stablecoinIndex[token];
        uint256 vaultID = venturecoinIndex[asset];

        uint256 lotId;
        unchecked { lotId = nextLotId++; }
        acquisitionLots[lotId] = AcquisitionLot({
            user:            user,
            currencyID:      currencyID,
            stableAmount:    stableAmount,
            nativeAmount:    nativeAmount,
            remainingNative: nativeAmount,
            remainingStable: stableAmount,
            exchangeRate:    exchangeRate,
            timestamp:       timeStamp,
            chapterHead:     0,
            chapterEnd:      0,
            credit:          true,          // credit to user
            status:          false,         // not fully consumed
            purchaseHash:    depositHash
        });

        globalQueue.push(acquisitionLots[lotId]);

        // Update User aggregates
        if (activeUsers[user] == false) {_initializeNewUser(user);}
        uint256 uL = userView[user].length - 1;
        User storage u = userView[user][uL];

        unchecked { u.ventureDepositAmount[vaultID] += nativeAmount; }

        // Update Global aggregates (opposite side)
        if (activeGlobal[owner()] == false) {_initializeGlobal();}
        uint256 gL = globalView[owner()].length - 1;
        Global storage g = globalView[owner()][gL];

        // Stable amount is liquid but not realized until the user spends Native
        unchecked {
            g.balanceAmount[currencyID] += stableAmount;
            g.liquidAmount[currencyID] += stableAmount;

            g.ventureDepositAmount[vaultID] += nativeAmount;
        }

        // --- New Venture Lot
        uint256 ventureLotId;
        unchecked { ventureLotId = nextLotId++; }
        ventureLots[ventureLotId] = VentureLot({
            user:         user,
            currencyID:   currencyID,
            stableAmount: stableAmount,
            nativeAmount: nativeAmount,
            exchangeRate: exchangeRate,
            timestamp:    timeStamp,
            credit:       true,           // credit to platform/escrow
            status:       false,          // open until fully refunded/settled
            depositHash:  depositHash
        });
    }

    // -------------------------
    // WITHDRAW
    // -------------------------
    function vaultWithdraw(
        LedgerWithdrawHandle calldata d
    ) external override onlyContracts returns (uint256[] memory stableOutByCurrency) {
        if(d.user == address(0)) revert InvalidUserAddress();
        stableOutByCurrency = new uint256[](150);

        address user = d.user;
        address token = d.token;
        address asset = d.asset;
        uint256 payoutAmount = d.payoutAmount;
        uint256 investmentAmount = d.investmentAmount;
        uint256 timeStamp = d.timeStamp;
        uint256 remaining = 0;
        bool initiationStatus = d.initiationStatus;
        bool status = d.status;
        if (status) {remaining = d.investmentAmount;}

        uint256 currencyID = stablecoinIndex[token];
        uint256 vaultID = stakeablecoinIndex[asset];

        if (currencyID == globalID && status) {

            _consumeAcquisitionFIFO(
                FIFOConsumeParams({
                    user: d.user,
                    currencyID: currencyID,
                    vaultID: vaultID,
                    remaining: remaining,
                    investmentAmount: investmentAmount,
                    timeStamp: timeStamp,
                    initiationStatus: initiationStatus,
                    vaultDraw: true,       // Hardcoded true from your original call
                    ventureDraw: false,    // Hardcoded false from your original call
                    purchase: false        // Hardcoded false from your original call
                }),
                stableOutByCurrency
            );

        }

        // New DEBIT WithdrawalLot
        uint256 vaultWithdrawLotId;
        unchecked { vaultWithdrawLotId = nextLotId++; }
        vaultWithdrawLots[vaultWithdrawLotId] = VaultWithdrawLot({
            user:         user,
            currencyID:   currencyID,
            vaultID:      vaultID,
            stableAmount: payoutAmount,
            timestamp:    timeStamp,
            credit:       false           // debit to platform/escrow
        });

        uint256 dividendPortion = 0;
        unchecked {
            if(status) {dividendPortion = payoutAmount - investmentAmount;} else {dividendPortion = payoutAmount;}
        }
        uint256 converted = (dividendPortion * 105e16) / 1e18;

        unchecked{ stableOutByCurrency[1] += converted; }
    }

    function ventureWithdraw(
        LedgerWithdrawHandle calldata d
    ) external override onlyContracts returns (uint256[] memory stableOutByCurrency) {
        if(d.user == address(0)) revert InvalidUserAddress();
        stableOutByCurrency = new uint256[](150);

        address user = d.user;
        address token = d.token;
        address asset = d.asset;
        uint256 payoutAmount = d.payoutAmount;
        uint256 remaining = d.principalSlice;
        uint256 investmentAmount = d.investmentAmount;
        uint256 timeStamp = d.timeStamp;
        bool initiationStatus = d.initiationStatus;

        uint256 currencyID = stablecoinIndex[token];
        uint256 vaultID = stakeablecoinIndex[asset];

        if (currencyID == globalID) {

            _consumeAcquisitionFIFO(
                FIFOConsumeParams({
                    user:       user,
                    currencyID: currencyID,
                    vaultID:    vaultID,
                    remaining:  remaining,
                    investmentAmount: investmentAmount,
                    timeStamp:  timeStamp,
                    initiationStatus: initiationStatus,
                    vaultDraw:  false,       // Hardcoded true from your original call
                    ventureDraw: true,    // Hardcoded false from your original call
                    purchase:   false        // Hardcoded false from your original call
                }),
                stableOutByCurrency
            );

        }

        {

            // New DEBIT WithdrawalLot
            uint256 vaultWithdrawLotId;
            unchecked { vaultWithdrawLotId = nextLotId++; }
            vaultWithdrawLots[vaultWithdrawLotId] = VaultWithdrawLot({
                user:         user,
                currencyID:   currencyID,
                vaultID:      vaultID,
                stableAmount: payoutAmount,
                timestamp:    timeStamp,
                credit:       false           // debit to platform/escrow
            });
        }

        uint256 interest;
        unchecked { interest = payoutAmount - d.principalSlice; }
        uint256 converted = (interest * 105e16) / 1e18; 

        unchecked { stableOutByCurrency[1] += converted; }
    }

    function recordVaultPoolDeposit(
        LedgerPoolHandle calldata d
    ) external override onlyContracts {
        address callingContract = d.callingContract;
        address currency = d.currency;
        uint256 nativeAmount = d.nativeAmount;
        uint256 timeStamp = d.timeStamp;
        bytes32 depositHash = d.depositHash;
        if(currency == address(0)) revert InvalidPoolCurrency();

        //if(depositHash == bytes32(0)) revert InvalidHash();
        uint256 currencyID = stablecoinIndex[currency];
        uint256 stableAmount = (nativeAmount * 105e16) / 1e18;

        {

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
        }

        {

            if (activeGlobal[owner()] == false) {_initializeGlobal();}
            uint256 gindex = globalView[owner()].length - 1;
            Global storage g = globalView[owner()][gindex];
            
            // Should not be a balance increase only liquid
            unchecked {
                g.balanceAmount[currencyID] += stableAmount;
                g.liquidAmount[currencyID] += stableAmount;

                g.vaultPoolAmount[currencyID] += stableAmount;
            }
        }
    }

    function recordVenturePoolDeposit(
        LedgerPoolHandle calldata d
    ) external override onlyContracts {
        address callingContract = d.callingContract;
        address currency = d.currency;
        uint256 nativeAmount = d.nativeAmount;
        uint256 timeStamp = d.timeStamp;
        bytes32 depositHash = d.depositHash;
        if(currency == address(0)) revert InvalidPoolCurrency();
        uint256 currencyID = stablecoinIndex[currency];
        uint256 stableAmount = (nativeAmount * 105e16) / 1e18;

        {

            // 3) New CREDIT PurchaseLot
            uint256 venturePoolLotId;
            unchecked { venturePoolLotId = nextLotId++; }
            venturePoolLots[venturePoolLotId] = VenturePoolLot({
                sourceContract:     callingContract,
                currencyID:   currencyID,
                stableAmount: stableAmount,
                timestamp:    timeStamp,
                credit:       true,           // credit to platform/escrow
                status:       true,          // open until fully refunded/settled
                depositHash:  depositHash
            });
        }

        {
            if (activeGlobal[owner()] == false) {_initializeGlobal();}
            uint256 gL = globalView[owner()].length - 1;
            Global storage g = globalView[owner()][gL];
            
            // Should not be a balance increase only liquid
            unchecked {
                g.balanceAmount[currencyID] += stableAmount;
                g.liquidAmount[currencyID] += stableAmount;

                g.venturePoolAmount[currencyID] += stableAmount;
            }
        }
    }

    function _balanceRefundFIFO(
        FIFOBalanceParams memory b
    ) internal returns (uint256[] memory stableOutByCurrency) {

        address user = b.user;
        uint256 timeStamp = b.timeStamp;
        uint256 nativeAmountx = b.nativeAmount;
        bytes32 purchaseHash = b.purchaseHash;

        AcquisitionRef memory ar = acquisitionsByHash[b.purchaseHash];
        AcquisitionLot memory a = acquisitionLots[ar.refLot];

        // --- For Loop --- //
        for (uint256 i = a.chapterHead; i < a.chapterEnd;) {

            uint256 lotId;
            unchecked { lotId = nextLotId++; }

            AcquisitionLot memory ax = acquisitionLots[i];

            uint256 nativeAmount = ax.nativeAmount;
            uint256 stableAmount = ax.stableAmount;
            uint256 exchangeRate = ax.exchangeRate;
            uint256 currencyID = ax.currencyID;


            acquisitionLots[lotId] = AcquisitionLot({
                user:            user,
                currencyID:      currencyID,
                stableAmount:    stableAmount,
                nativeAmount:    nativeAmount,
                remainingNative: nativeAmount,
                remainingStable: stableAmount,
                exchangeRate:    exchangeRate,
                timestamp:       timeStamp,
                chapterHead:     0,
                chapterEnd:      0,
                credit:          true,          // credit to user
                status:          false,         // not fully consumed
                purchaseHash:    purchaseHash
            });

            globalQueue.push(acquisitionLots[lotId]);
    
            if (activeUsers[b.user] == false) {_initializeNewUser(b.user);}
            uint256 uL = userView[b.user].length - 1;
            User storage u = userView[b.user][uL];

            // --- User accounting ---
            unchecked {
                u.purchases[globalID] -= nativeAmount;
                u.balanceAmount[globalID] += nativeAmount;
                u.liquidAmount[globalID] += nativeAmount;
            }
        
            if (activeGlobal[owner()] == false) {_initializeGlobal();}
            uint256 gL = globalView[owner()].length - 1;
            Global storage g = globalView[owner()][gL];

            // --- Global accounting ---
            unchecked {
                g.balanceAmount[ax.currencyID] -= stableAmount;
                g.liquidAmount[ax.currencyID] -= stableAmount;
                g.purchases[ax.currencyID] -= stableAmount;

                // --- Native
                g.balanceAmount[globalID] -= nativeAmount;
                g.liquidAmount[globalID] -= nativeAmount;
            }

            unchecked { i++; }

        }

        unchecked { stableOutByCurrency[globalID] += nativeAmountx; }

    }

    function _balanceLiquidationFIFO(
        address user,
        uint256 returningNative,
        uint256 timeStamp
    ) internal returns (uint256[] memory stableOutByCurrency) {
        stableOutByCurrency = new uint256[](150);

        uint256 head = globalHead;

        uint256 remaining = returningNative;
        
        for (uint256 i = head; i > 0;) {

            AcquisitionLot storage ax = acquisitionLots[i];
            uint256 nativeAmount = ax.nativeAmount;
            uint256 remainingNative = ax.remainingNative;
            uint256 stableAmount = ax.stableAmount;
            uint256 exchangeRate = ax.exchangeRate;
            uint256 chapterHead = ax.chapterHead;
            uint256 chapterEnd = ax.chapterEnd;
            uint256 currencyID = ax.currencyID;
            bool credit = ax.credit;
            bool status = ax.status;

            if (!status && credit && chapterHead == 0 && chapterEnd == 0) {

                uint256 take = remaining < nativeAmount ? remaining : nativeAmount;
                unchecked { remainingNative += take; }
                ax.timestamp = timeStamp;

                uint256 stableDelta = take * exchangeRate / 1e18;

                unchecked {
                    remaining -= take;

                    stableOutByCurrency[currencyID] += stableDelta;
                }
                
                if (activeUsers[user] == false) {_initializeNewUser(user);}
                uint256 uL = userView[user].length - 1;
                User storage u = userView[user][uL];

                // --- User accounting ---
                unchecked {
                    u.balanceAmount[globalID] -= nativeAmount;
                    u.liquidAmount[globalID] -= nativeAmount;
                }

                if (activeGlobal[owner()] == false) {_initializeGlobal();}
                uint256 gL = globalView[owner()].length - 1;
                Global storage g = globalView[owner()][gL];

                // --- Global accounting ---
                unchecked {
                    g.balanceAmount[ax.currencyID] -= stableAmount;
                    g.liquidAmount[ax.currencyID] -= stableAmount;

                    // --- Global Native ---
                    g.balanceAmount[globalID] -= nativeAmount;
                    g.liquidAmount[globalID] -= nativeAmount;

                    g.balanceAmount[globalID] += nativeAmount;
                    g.liquidAmount[globalID] += nativeAmount;
                }

                globalHead = i;
                unchecked { i--; }
            }
        }

    }

    function _consumeAcquisitionFIFO(
        FIFOConsumeParams memory params,
        uint256[] memory stableOutByCurrency
    ) internal {

        address user = params.user;
        uint256 currencyID = params.currencyID;
        uint256 investmentAmount = params.investmentAmount;
        uint256 timeStamp = params.timeStamp;
        uint256 remaining;
        uint256 head;
        

        // Run the loop helper, passing the struct along
        remaining = _runFIFOLoop(params, stableOutByCurrency);

        if(remaining != 0) revert InsufficientFIFOLots();

        uint256 acquisitionCreditLotId;
        unchecked { acquisitionCreditLotId = nextLotId++; }
        acquisitionLots[acquisitionCreditLotId] = AcquisitionLot({
            user:            user,
            currencyID:      currencyID,
            stableAmount:    0,
            nativeAmount:    investmentAmount,
            remainingNative: params.investmentAmount,
            remainingStable: 0,
            exchangeRate:    0,
            timestamp:       timeStamp,
            chapterHead:     head,
            chapterEnd:      globalHead,
            credit:          true,
            status:          true,
            purchaseHash:    0
        });
    }

    function _runFIFOLoop(
        FIFOConsumeParams memory params,
        uint256[] memory stableOutByCurrency
    ) internal returns (uint256) {
        
        address user = params.user;
        uint256 remaining = params.remaining;
        uint256 investmentAmount = params.investmentAmount;
        uint256 take;
        uint256 stableDelta;
        uint256 currentHead = globalHead;
        bool purchase = params.purchase;
        bool vaultDraw = params.vaultDraw;
        bool ventureDraw = params.ventureDraw;
        bool initiationStatus = params.initiationStatus;

        uint256 len = globalQueue.length;

        if (activeUsers[user] == false) { _initializeNewUser(user); }
        User storage u = userView[user][userView[user].length - 1];
        if (activeGlobal[owner()] == false) { _initializeGlobal(); }
        Global storage g = globalView[owner()][globalView[owner()].length - 1];

        unchecked {
            if (ventureDraw && initiationStatus) { u.ventureWithdrawAmount[params.vaultID] += investmentAmount; }
            if (vaultDraw && initiationStatus) { u.vaultWithdrawAmount[params.vaultID] += investmentAmount; }
        }

        for (uint256 i = currentHead; i < len && remaining > 0;) {
            AcquisitionLot storage lot = globalQueue[i];

            // This line will now compile flawlessly!
            take = remaining > lot.remainingNative ? lot.remainingNative : remaining;
            
            unchecked {
                lot.remainingNative -= take;
                remaining -= take;
            }

            stableDelta = take / lot.exchangeRate;

            unchecked {
                if (vaultDraw) { u.vaultWithdrawAmount[params.vaultID] -= take; }
                if (ventureDraw) { u.ventureWithdrawAmount[params.vaultID] -= take; }
                if (purchase) { u.purchases[globalID] += take; }
            }

            unchecked {
                g.balanceAmount[lot.currencyID] -= stableDelta;
                g.liquidAmount[lot.currencyID] -= stableDelta;
                if (purchase) { g.purchases[lot.currencyID] -= stableDelta; }
                if (vaultDraw) { g.vaultPoolAmount[params.vaultID] -= stableDelta; }
                if (ventureDraw) { g.venturePoolAmount[params.vaultID] -= stableDelta; }

                g.balanceAmount[globalID] -= take;
                g.liquidAmount[globalID] -= take;
                if (purchase) { g.purchases[globalID] += take; }
            }

            unchecked { 
                stableOutByCurrency[lot.currencyID] += stableDelta;
                if (lot.remainingNative == 0) { globalHead++; }
                i++;
            }
        }

        return remaining;
    }

    function getUserOverview(address user)
        external
        view
        returns (User[] memory)
    {
        if(!_isAdmin(msg.sender)) revert NotAuthorized();
        return userView[user];
    }

    function getGlobalOverview()
        external
        view
        returns (Global[] memory)
    {
        if(!_isAdmin(msg.sender)) revert NotAuthorized();
        return globalView[owner()];
    }

    function _additionHelper(address[] memory addresses, bool stc, bool stk, bool vtc, bool ctr, bool adn) internal {
        uint256 len = addresses.length;
        
        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];

            // Skip if ALREADY added to prevent array bloating
            if (stc && !stablecoinWhitelistMap[sc]) {
                stablecoinIndex[sc] = stables.length; // FIXED: Tracks actual state array position
                stables.push(sc);
                stablecoinWhitelistMap[sc] = true;
            }
            if (stk && !stakeableWhitelistMap[sc]) {
                stakeablecoinIndex[sc] = stakeables.length;
                stakeables.push(sc);
                stakeableWhitelistMap[sc] = true;
            }
            if (vtc && !venturecoinWhitelistMap[sc]) {
                venturecoinIndex[sc] = ventures.length;
                ventures.push(sc);
                venturecoinWhitelistMap[sc] = true;
            }
            if (ctr && !contractWhitelistMap[sc]) {
                contractIndex[sc] = contractAddresses.length;
                contractAddresses.push(sc);
                contractWhitelistMap[sc] = true;
            }
            if (adn && !adminWhitelistMap[sc]) {
                adminIndex[sc] = admins.length;
                admins.push(sc);
                adminWhitelistMap[sc] = true;
            }
            
            unchecked { i++; }
        }
    } 

    function _removalHelper(address[] memory addresses, bool stc, bool stk, bool vtc, bool ctr, bool adn) internal {
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

            if (stk && stakeableWhitelistMap[sc]) {
                uint256 index = stakeablecoinIndex[sc];
                uint256 lastIndex = stakeables.length - 1;

                if (index != lastIndex) {
                    address lastAddr = stakeables[lastIndex];
                    stakeables[index] = lastAddr;
                    stakeablecoinIndex[lastAddr] = index;
                }
                stakeables.pop();
                stakeableWhitelistMap[sc] = false;
                delete stakeablecoinIndex[sc];
            }

            if (vtc && venturecoinWhitelistMap[sc]) {
                uint256 index = venturecoinIndex[sc];
                uint256 lastIndex = ventures.length - 1;

                if (index != lastIndex) {
                    address lastAddr = admins[lastIndex];
                    ventures[index] = lastAddr;
                    venturecoinIndex[lastAddr] = index;
                }
                ventures.pop();
                venturecoinWhitelistMap[sc] = false;
                delete venturecoinIndex[sc];
            }

            if (ctr && contractWhitelistMap[sc]) {
                uint256 index = contractIndex[sc];
                uint256 lastIndex = contractAddresses.length - 1;

                if (index != lastIndex) {
                    address lastAddr = contractAddresses[lastIndex];
                    contractAddresses[index] = lastAddr;
                    contractIndex[lastAddr] = index;
                }
                contractAddresses.pop();
                contractWhitelistMap[sc] = false;
                delete contractIndex[sc];
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

        _additionHelper(stableAddress, true, false, false, false, false);
    }

    function stableIndex() external view onlyOwner returns(address[] memory stable) {
        
        return stables;
    }

    function removeFromStableWhitelist(address[] memory stableAddress) external onlyOwner {

        _removalHelper(stableAddress, true, false, false, false, false);
    }

    function addToStakeableWhitelist(address[] memory stakeableAddress) external onlyOwner {
        
        _additionHelper(stakeableAddress, false, true, false, false, false);
    }

    function stakeableIndex() external view onlyOwner returns(address[] memory stakes) {
        
        return stakeables;
    }

    function removeFromStakeableWhitelist(address[] memory stakeableAddress) external onlyOwner {

        _removalHelper(stakeableAddress, false, true, false, false, false);
    }

    function addToVentureWhitelist(address[] memory ventureAddress) external onlyOwner {

        _additionHelper(ventureAddress, false, false, true, false, false);
    }

    function ventureIndex() external view onlyOwner returns(address[] memory vents) {
        
        return ventures;
    }

    function removeFromVentureWhitelist(address[] memory ventureAddress) external onlyOwner {

        _removalHelper(ventureAddress, false, false, true, false, false);
    }

    function addToAdminWhitelist(address[] memory adminToAdd) external onlyOwner {
       
        _additionHelper(adminToAdd, false, false, false, false, true);
    }

    function adminsIndex() external view onlyOwner returns(address[] memory admin) {
        
        return admins;
    }

    function removeFromAdminWhitelist(address[] memory adminToRemove) external onlyOwner {

        _removalHelper(adminToRemove, false, false, false, false, true);
    }

    function addToContractWhitelist(address[] memory contractAddress) external onlyOwner {
        
        _additionHelper(contractAddress, false, false, false, true, false);
    }

    function contractsIndex() external view onlyOwner returns(address[] memory contracts) {
        
        return contractAddresses;
    }

    function removeFromContractWhitelist(address[] memory contractAddress) external onlyOwner {
        
        _removalHelper(contractAddress, false, false, false, true, false);
    }

    uint256[50] __gap;
}