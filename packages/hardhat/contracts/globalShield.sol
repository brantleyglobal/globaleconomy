// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {GlobalSwap as GlobalSwapInstance} from "./xchange/globalSwap.sol";

contract GlobalShield is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    struct VentureDeposit {
        uint256 timestamp;
        uint256 amountin;
        uint256 amountout;
        uint256 rate; 
        address user;
        address token;
        address venture;
        bytes32 depositTxHash;
        bytes32 refundHash;
        bool refund;
    }

    struct VentureDepositRef {
        address user;
        uint256 depositIndex;
    }

    struct VaultDeposit {
        uint256 timestamp;
        uint256 amountin;
        uint256 amountout; 
        uint256 rate;
        address user;
        address token;
        address dividend;
        uint256 quartersCommitted;
        uint256 startQuarter;
        uint256 key;
        bytes32 depositTxHash;
        bytes32 refundHash;
        bool refund;
    }

    struct VaultDepositRef {
        address user;
        uint256 depositIndex;
    }

    struct Purchase {
        address user;
        address affiliate;
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

    struct PurchaseRef {
        address user;
        uint256 purchaseIndex;
    }

    struct Acquisition {
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

    struct AcquisitionRef {
        address user;
        uint256 purchaseIndex;
    }

     struct Swap {
        address swapAddress;
        address partyA;
        address partyB;
        address tokenA;
        uint256 amountA;
        bytes32 partyADepositHash;
        address tokenB;
        uint256 amountB;
        bytes32 partyBDepositHash;
        bool refundPartyA;
        bool refundPartyB;
    }

    struct SwapRef {
        address swapAddress;
    }

    error NotAuthorized();
    error InvalidPartyAddress();
    error SwapDoesNotExist();

    address[]  public stables;
    address[]  public stakeables;
    address[]  private admins;
    
    uint256[] public purchaseTimestamps;
    uint256[] public acquisitionTimestamps;
    uint256[] public ventureDepositTimestamps;
    uint256[] public vaultDepositTimestamps;
    uint256[] public swapTimestamps;
    uint256 public processVentureDepositTimestamp;
    uint256 public processVaultDepositTimestamp;
    uint256 public processPurchaseTimestamp;
    uint256 public processAcquisitionTimestamp;
    uint256 public processSwapTimestamp;

    // Mapping for quick stablecoin whitelist check
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    mapping(uint256 => VentureDepositRef) public ventureDepositsByTimestamp;
    mapping(address => VentureDeposit[]) public ventureDepositsByUser;
    mapping(uint256 => VaultDepositRef) public vaultDepositsByTimestamp;
    mapping(address => VaultDeposit[]) public vaultDepositsByUser;
    mapping(uint256 => PurchaseRef) public purchasesByTimestamp;
    mapping(address => Purchase[]) public purchasesByUser;
    mapping(uint256 => AcquisitionRef) public acquisitionsByTimestamp;
    mapping(address => Acquisition[]) public acquisitionsByUser;
    mapping(uint256 => SwapRef) public swapsByTimestamp;
    mapping(address => Swap) public swaps;
    //mapping(address => mapping(uint256 => Affiliate)) public affiliateByUserIndex;
    mapping(address => uint256) stablecoinIndex;
    mapping(address => uint256) stakeablecoinIndex;
    mapping(address => uint256) adminIndex;
    
    event VentureDepositInRange(
        uint256 timestamp,
        address indexed user,
        address token,
        address venture,
        uint256 amountin,
        uint256 amountout,
        uint256 rate,
        bytes32 depositHash
    );

    event VaultDepositInRange(
        uint256 timestamp,
        address indexed user,
        address token,
        address dividend,
        uint256 quartersCommitted,
        uint256 amountin,
        uint256 amountout,
        uint256 rate,
        bytes32 depositHash
    );

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
        bytes32 depositHash,
        bool refund,
        bytes32 refundHash
    );

    event AcquisitionTimestamp(
        uint256 timestamp,
        address indexed user,
        address token,
        uint256 termIndex,
        uint256[] stableOut,
        uint256 amountOut,
        uint256 amountIn,
        bytes32 depositHash,
        bytes32 payoutHash,
        bool refund,
        bytes32 refundHash
    );

    event SwapTimestamp(
        address indexed swapAddress,
        address partyA,
        address partyB,
        address tokenA,
        uint256 amountA,
        bytes32 partyADepositHash,
        address tokenB,
        uint256 amountB,
        bytes32 partyBDepositHash,
        bool refundPartyA,
        bool refundPartyB
    );

    // Events omitted for brevity...

    function initialize(
        address _owner
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _isAdmin(address admin) internal view returns (bool) {
        return adminWhitelistMap[admin];
    }

    // -----------------------------
    // DEPOSIT INITIATION
    // -----------------------------

    function ventureDeposit(
        uint256 timeStamp,
        address user,
        address token,
        address venture,
        uint256 amount,
        uint256 incomingRate,
        bytes32 depositHash 
    ) external payable nonReentrant {

        // Optimal Storage Allocation Push Pattern
        VentureDeposit storage d = ventureDepositsByUser[user].push();
        uint256 termIndex;
        unchecked { termIndex = ventureDepositsByUser[user].length - 1; }

        d.timestamp = timeStamp;
        d.amountin = amount;
        d.rate = incomingRate;
        d.user = user;
        d.token = token;
        d.venture = venture;
        d.depositTxHash = depositHash;

        ventureDepositTimestamps.push(timeStamp);

        VentureDepositRef memory ref = VentureDepositRef({ user: user, depositIndex: termIndex });
        ventureDepositsByTimestamp[timeStamp] = ref;
    }

    function ventureDepositsInRange(uint256 startTs, uint256 endTs, bool process) public {

        if (process) {

            if(msg.sender !=  owner()) revert NotAuthorized();

            _emitVentureDeposit(processVentureDepositTimestamp, endTs);

            processVentureDepositTimestamp = endTs;

        } else {

            if(!_isAdmin(msg.sender)) revert NotAuthorized();

            _emitVentureDeposit(startTs, endTs);
        }
    }

    function _emitVentureDeposit(uint256 startTs, uint256 endTs) internal {
        // Cache array length to memory to prevent continuous storage reads (SLOAD)
        uint256 len = ventureDepositTimestamps.length;

        for (uint256 i = 0; i < len;) {
            uint256 ts = ventureDepositTimestamps[i];
            
            if (ts >= startTs && ts <= endTs) {
                // Read pointers to storage instead of copying the whole struct to memory
                VentureDepositRef storage r = ventureDepositsByTimestamp[ts];
                VentureDeposit storage w = ventureDepositsByUser[r.user][r.depositIndex];
                
                emit VentureDepositInRange(
                    w.timestamp, 
                    w.user, 
                    w.token, 
                    w.venture, 
                    w.amountin, 
                    w.amountout,
                    w.rate,
                    w.depositTxHash
                );
            }

            // Use unchecked increments for the loop counter to bypass safety checks
            unchecked { i++; }
        }
    }

    function vaultDeposit(
        uint256 timeStamp,
        address investor,
        address token,
        uint256 amount,
        uint256 committedQuarters,
        uint256 incomingRate,
        bytes32 depositHash 
    ) external payable nonReentrant {

        if(!_isAdmin(msg.sender)) revert NotAuthorized();

        // Single operation structural push return assignment
        VaultDeposit storage d = vaultDepositsByUser[investor].push();
        uint256 termIndex;
        unchecked { termIndex = vaultDepositsByUser[investor].length - 1; }

        d.timestamp = timeStamp;
        d.amountin = amount;
        d.amountout = 0;
        d.rate = incomingRate;
        d.user = investor;
        d.token = token;
        d.quartersCommitted = committedQuarters;
        d.depositTxHash = depositHash;

        vaultDepositTimestamps.push(timeStamp);
        
        // Combined storage structural references assignments
        VaultDepositRef memory ref = VaultDepositRef({ user: d.user, depositIndex: termIndex });
        vaultDepositsByTimestamp[d.timestamp] = ref;
    } 

    function vaultDepositsInRange(uint256 startTs, uint256 endTs, bool process) public {

        if (process) {
            if(msg.sender != owner()) revert NotAuthorized();

            _emitVaultDeposit(processVaultDepositTimestamp, endTs);

            processVaultDepositTimestamp = endTs;

        } else {

            if(!_isAdmin(msg.sender)) revert NotAuthorized();

            _emitVaultDeposit(startTs, endTs);
        }
    }

    function _emitVaultDeposit(uint256 startTs, uint256 endTs) internal {
        // Cache array length to memory to prevent continuous storage reads (SLOAD)
        uint256 len = vaultDepositTimestamps.length;

        for (uint256 i = 0; i < len;) {
            uint256 ts = vaultDepositTimestamps[i];
            
            if (ts >= startTs && ts <= endTs) {
                // Read pointers to storage instead of copying the whole struct to memory
                VaultDepositRef storage r = vaultDepositsByTimestamp[ts];
                VaultDeposit storage w = vaultDepositsByUser[r.user][r.depositIndex];
                
                emit VaultDepositInRange(
                    w.timestamp, 
                    w.user, 
                    w.token, 
                    w.dividend,
                    w.quartersCommitted,
                    w.amountin, 
                    w.amountout,
                    w.rate,
                    w.depositTxHash
                );
            }

            // Use unchecked increments for the loop counter to bypass safety checks
            unchecked { i++; }
        }
    }

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
        uint256 region,
        bytes32 depositHash,
        uint256 ts
    ) external payable nonReentrant {

        // Direct push allocation storage assignment pattern win
        Purchase storage p = purchasesByUser[buyer].push();
        uint256 index;
        unchecked { index = purchasesByUser[buyer].length - 1; }
        uint256 total = amount;

        p.user = buyer;
        p.affiliate = affiliate;
        p.token = stable;
        p.id = productId;
        p.purchaseIndex = index;
        p.quantity = quantity;
        p.amount = total;
        p.region = region;
        p.shipping = shipping;
        p.customizations = customizations;
        p.rate = rate;
        p.purchaseTxHash = depositHash;
        p.purchaseSetter = msg.sender;
        p.configs = configs;
        
        purchaseTimestamps.push(ts);

        purchasesByTimestamp[ts] = PurchaseRef({ user: buyer, purchaseIndex: index });
    }

    function getPurchasesInRange(uint256 startTs, uint256 endTs, bool process) public {

        if (process) {

            if(msg.sender != owner()) revert NotAuthorized();
            _emitPurchase(processPurchaseTimestamp, endTs);

            processPurchaseTimestamp = endTs;

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
                //Affiliate storage a = affiliateByUserIndex[w.user][w.purchaseIndex];

                uint256[] memory d = new uint256[](0);
                
                emit PurchaseTimestamp(
                    w.user,
                    w.token,
                    w.id,
                    w.quantity,
                    w.purchaseIndex,
                    w.amount,
                    d,
                    w.shipping,
                    w.region,
                    w.customizations,
                    w.rate,
                    w.affiliate,
                    0,
                    w.purchaseSetter,
                    w.purchaseTxHash,
                    w.refund,
                    w.refundHash
                );
            }

            // Use unchecked increments for the loop counter to bypass safety checks
            unchecked { i++; }
        }
    }

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
        
        // Allocate new purchase slot cleanly
        Acquisition storage p = acquisitionsByUser[user].push();
        uint256 index;
        unchecked { index = acquisitionsByUser[user].length - 1; }

        p.timestamp = currentTxTime;
        p.user = user;
        p.token = token;
        p.amountin = amountin;
        p.amountout = amountout;
        p.exchangeRate = rate;
        p.termIndex = index;
        p.purchaseTxHash = depositHash;
        p.payoutSetter = msg.sender;
        p.credit = true;

        acquisitionTimestamps.push(currentTxTime);
        acquisitionsByTimestamp[currentTxTime] = AcquisitionRef({ user: user, purchaseIndex: index });
    }

    function getAcquisitionsInRange(uint256 startTs, uint256 endTs, bool process) public {

        if (process == true){

            if(msg.sender != owner()) revert NotAuthorized();

            _emitAcquisition(processAcquisitionTimestamp, endTs);
            processAcquisitionTimestamp = endTs;

        } else {
            
            if(!_isAdmin(msg.sender)) revert NotAuthorized();

            _emitAcquisition(startTs, endTs);
        }
    }

    function _emitAcquisition(uint256 startTs, uint256 endTs) internal {

        // Cache array length to memory to prevent continuous storage reads (SLOAD)
        uint256 len = acquisitionTimestamps.length;

        for (uint256 i = 0; i < len;) {
            uint256 ts = acquisitionTimestamps[i];
            
            if (ts >= startTs && ts <= endTs) {
                // Read pointers to storage instead of copying the whole struct to memory
                AcquisitionRef storage r = acquisitionsByTimestamp[ts];
                Acquisition storage w = acquisitionsByUser[r.user][r.purchaseIndex];

                uint256[] memory d = new uint256[](0);
                
                emit AcquisitionTimestamp(
                    w.timestamp,
                    w.user,
                    w.token,
                    w.termIndex,
                    d,
                    w.amountout,
                    w.amountin,
                    w.purchaseTxHash,
                    w.payoutTxHash,
                    w.refund,
                    w.refundHash
                );
            }

            // Use unchecked increments for the loop counter to bypass safety checks
            unchecked { i++; }
        }
    }

    function createSwap(
        address swapAddress,
        address partyA,
        address partyB,
        address tokenA,
        uint256 amountA,
        bytes32 partyADepositHash,
        address tokenB,
        uint256 amountB,
        bytes32 partyBDepositHash,
        uint256 ts
    ) external {

        // 2. Map the baseline details in the master ledger index (default to Pending)
        Swap memory details = Swap({
            swapAddress: swapAddress,
            partyA: partyA,
            partyB: partyB,
            tokenA: tokenA,
            amountA: amountA,
            partyADepositHash: partyADepositHash,
            tokenB: tokenB,
            amountB: amountB,
            partyBDepositHash: partyBDepositHash,
            refundPartyA: false,
            refundPartyB: false
        });

        swaps[swapAddress] = details;
        swapTimestamps.push(ts);
        swapsByTimestamp[ts] = SwapRef({ swapAddress: swapAddress });
    }

    function deposit(address swapAddress, address party, bytes32 depositHash, uint256 ts) external nonReentrant {
        // 1. Guard rail: Ensure caller is an authorized platform operator
        if (!_isAdmin(msg.sender)) revert NotAuthorized();

        // 2. Fetch the mutable STORAGE reference of the struct from our database
        Swap storage details = swaps[swapAddress];
        if (details.swapAddress == address(0)) revert SwapDoesNotExist();

        // 3. Address Confirmation & Struct Update Layer
        if (party == details.partyA) {
            // Confirming Party A matches -> Update Party A's deposit hash in the database
            details.partyADepositHash = depositHash;
        } else if (party == details.partyB) {
            // Confirming Party B matches -> Update Party B's deposit hash in the database
            details.partyBDepositHash = depositHash;
        } else {
            // Fraud prevention: The target address doesn't match either party stored in this swap record
            revert InvalidPartyAddress();
        }

        swapTimestamps.push(ts);
        swapsByTimestamp[ts] = SwapRef({ swapAddress: swapAddress });
    }

    function refund(address swapAddress, address party, uint256 ts) external nonReentrant {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();

        Swap storage details = swaps[swapAddress];
        if (details.swapAddress == address(0)) revert SwapDoesNotExist();

        // 3. Address Confirmation & Struct Update Layer
        if (party == details.partyA) {
            // Confirming Party A matches -> Update Party A's deposit hash in the database
            details.refundPartyA = true;
        } else if (party == details.partyB) {
            // Confirming Party B matches -> Update Party B's deposit hash in the database
            details.refundPartyB = true;
        } else {
            // Fraud prevention: The target address doesn't match either party stored in this swap record
            revert InvalidPartyAddress();
        }

        uint256 updateTimestamp = ts;
        swapTimestamps.push(updateTimestamp);
        swapsByTimestamp[updateTimestamp] = SwapRef({ swapAddress: swapAddress });
    }

    function getSwapsInRange(uint256 startTs, uint256 endTs, bool process) public {
        if (process) {
            if (msg.sender != owner()) revert NotAuthorized();
            // Mimic the 120-day lookup window layout
            _emitSwap(processSwapTimestamp, endTs);

            processSwapTimestamp = endTs;
            // Update master tracking clock state if necessary
        } else {
            if (!_isAdmin(msg.sender)) revert NotAuthorized();
            _emitSwap(startTs, endTs);
        }
    }

    function _emitSwap(uint256 startTs, uint256 endTs) internal {
        // Cache array length to memory to prevent continuous storage reads (SLOAD)
        uint256 len = swapTimestamps.length;

        for (uint256 i = 0; i < len;) {
            uint256 currentTs = swapTimestamps[i];
            
            if (currentTs >= startTs && currentTs <= endTs) {
                // Read pointer lookup to storage reference maps
                SwapRef storage ref = swapsByTimestamp[currentTs];
                Swap storage details = swaps[ref.swapAddress];
                
                // Emit indexed database log packet for backend consumer ingestion
                emit SwapTimestamp(
                    details.swapAddress,
                    details.partyA,
                    details.partyB,
                    details.tokenA,
                    details.amountA,
                    details.partyADepositHash,
                    details.tokenB,
                    details.amountB,
                    details.partyBDepositHash,
                    details.refundPartyA,
                    details.refundPartyB
                );
            }

            // Unchecked loop counter increment to optimize gas efficiency
            unchecked { i++; }
        }
    }

    function adminsIndex() external view returns(address[] memory) {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();
        return admins;
    }

    // --- ADMINISTRATIVE UTILITIES ---

    function _additionHelper(address[] memory addresses) internal {
        uint256 len = addresses.length;
        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];
            if (!adminWhitelistMap[sc]) {
                adminIndex[sc] = admins.length;
                admins.push(sc);
                adminWhitelistMap[sc] = true;
            }
            unchecked { i++; }
        }
    } 

    function _removalHelper(address[] memory addresses) internal {
        uint256 len = addresses.length;
        for (uint256 i = 0; i < len;) {
            address sc = addresses[i];
            if (adminWhitelistMap[sc]) {
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

    function addToAdminWhitelist(address[] memory adminToAdd) external onlyOwner {
        _additionHelper(adminToAdd);
    }

    function removeFromAdminWhitelist(address[] memory adminToRemove) external onlyOwner {
        _removalHelper(adminToRemove);
    }

    uint256[50] __gap;
}