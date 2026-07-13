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

    enum ReturnProcess { 
        None, 
        RefundPending, 
        RepairPending, 
        RefundComplete,
        RepairComplete
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
        ReturnProcess status;
        bytes32 purchaseTxHash;
        bytes32 refundHash;
        bytes32 configs;
    }

    struct ShippingDetails {
        string street;
        string city;
        string state;
        string zip;
        string country;
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
    error PurchaseDoesNotExist();
    error InvalidStatusTransition();

    // Changed public arrays to internal to drop redundant compiler index-getters
    address[]  internal stables;
    address[]  internal stakeables;
    address[]  private admins;
    
    uint256[] internal purchaseTimestamps;
    uint256[] internal activeReturnQueues;
    uint256[] internal acquisitionTimestamps;
    uint256[] internal ventureDepositTimestamps;
    uint256[] internal vaultDepositTimestamps;
    uint256[] internal swapTimestamps;

    // Kept public because simple scalars cost negligible bytecode and are vital for status reads
    uint256 public processVentureDepositTimestamp;
    uint256 public processVaultDepositTimestamp;
    uint256 public processPurchaseTimestamp;
    uint256 public processAcquisitionTimestamp;
    uint256 public processSwapTimestamp; 

    // Mappings dropped to internal/private to wipe out getter bloat
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => bool) private stablecoinWhitelistMap;
    mapping(address => bool) private stakeableWhitelistMap;
    
    mapping(uint256 => VentureDepositRef) internal ventureDepositsByTimestamp;
    mapping(address => VentureDeposit[]) internal ventureDepositsByUser;
    
    mapping(uint256 => VaultDepositRef) internal vaultDepositsByTimestamp;
    mapping(address => VaultDeposit[]) internal vaultDepositsByUser;
    
    mapping(uint256 => PurchaseRef) internal purchasesByTimestamp;
    mapping(bytes32 => ShippingDetails) internal purchaseShippingMetadata;
    mapping(address => Purchase[]) internal purchasesByUser;
    
    mapping(uint256 => uint256) private activeReturnIndex;
    mapping(uint256 => bool) internal isActiveReturn;
    
    mapping(uint256 => AcquisitionRef) internal acquisitionsByTimestamp;
    mapping(address => Acquisition[]) internal acquisitionsByUser;
    
    mapping(uint256 => SwapRef) internal swapsByTimestamp;
    mapping(address => Swap) internal swaps;
    
    mapping(address => uint256) private stablecoinIndex;
    mapping(address => uint256) private stakeablecoinIndex;
    mapping(address => uint256) private adminIndex;
    
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

    event PurchaseCore(
        address indexed user,
        address token,
        uint256 id,
        uint256 quantity,
        uint256 purchaseIndex,
        uint256 amount,
        uint256[] stableOut,
        uint256 rate,
        address affiliate,
        bytes32 indexed depositHash
    );

    event PurchaseLogistics(
        bytes32 indexed depositHash,
        uint256 shipping,
        uint256 region,
        uint256 customizations,
        address purchaseSetter,
        ReturnProcess status,
        bytes32 refundHash,
        ShippingDetails shippingInfo
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
        uint256 ts,
        ShippingDetails calldata shippingInfo
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

        purchaseShippingMetadata[depositHash] = shippingInfo;

        purchasesByTimestamp[ts] = PurchaseRef({ user: buyer, purchaseIndex: index });
    }

    /**
     * @notice Synchronizes any lifestyle change for a return or repair directly into the Shield master record.
     * @dev Accommodates all entry points (Electron, Web, or Backend automated processes)
     * @param buyer The wallet address of the original buyer.
     * @param originalTxHash The core purchase transaction hash acting as our unique cross-system key.
     * @param trackingActionHash The target transaction hash (the refund payment hash or the current checkpoint block receipt).
     * @param nextStatus The specific enum state we are advancing this record to.
     */
    function syncPurchaseReturnState(
        address buyer,
        bytes32 originalTxHash,
        bytes32 trackingActionHash,
        ReturnProcess nextStatus
    ) external nonReentrant {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();

        Purchase[] storage userPurchases = purchasesByUser[buyer];
        uint256 len = userPurchases.length;
        bool foundRecord = false;

        for (uint256 i = 0; i < len;) {
            if (userPurchases[i].purchaseTxHash == originalTxHash) {
                Purchase storage p = userPurchases[i];
                
                // Prevent rolling backwards to 'None' once a process has been officially initiated
                if (nextStatus == ReturnProcess.None) revert InvalidStatusTransition();
                
                p.status = nextStatus;
                p.refundHash = trackingActionHash;
                p.refundSetter = msg.sender; // Tracks the admin/worker key that signed off on this state shift

                foundRecord = true;
                break;
            }
            unchecked { i++; }
        }

        if (!foundRecord) revert PurchaseDoesNotExist();
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

                ShippingDetails storage s = purchaseShippingMetadata[w.purchaseTxHash];

                uint256[] memory d = new uint256[](0);
                
                emit PurchaseCore(
                    w.user,
                    w.token,
                    w.id,
                    w.quantity,
                    w.purchaseIndex,
                    w.amount,
                    d,
                    w.rate,
                    w.affiliate,
                    w.purchaseTxHash
                );

                emit PurchaseLogistics(
                    w.purchaseTxHash,
                    w.shipping,
                    w.region,
                    w.customizations,
                    w.purchaseSetter,
                    w.status,
                    w.refundHash,
                    s // The struct safely passes here because the stack is mostly empty now!
                );
            }

            // Use unchecked increments for the loop counter to bypass safety checks
            unchecked { i++; }
        }
    }

    /**
     * @notice Iterates through outstanding or altered return/repair events in the active return queue
     * @dev Reuses your standard unified event signature so the parsing engine needs zero modifications
     */
    function emitActiveReturnQueue() external {
        if (!_isAdmin(msg.sender)) revert NotAuthorized();

        uint256 len = activeReturnQueues.length;

        for (uint256 i = 0; i < len;) {
            uint256 ts = activeReturnQueues[i];
            
            // Check if the timestamp is registered as an active return record
            if (isActiveReturn[ts]) {
                PurchaseRef storage r = purchasesByTimestamp[ts];
                Purchase storage w = purchasesByUser[r.user][r.purchaseIndex];
                ShippingDetails storage s = purchaseShippingMetadata[w.purchaseTxHash];

                uint256[] memory emptyArr = new uint256[](0);
                
                emit PurchaseCore(
                    w.user,
                    w.token,
                    w.id,
                    w.quantity,
                    w.purchaseIndex,
                    w.amount,
                    emptyArr,
                    w.rate,
                    w.affiliate,
                    w.purchaseTxHash
                );

                // 2. Emit the logistics and heavy struct data on a fresh stack frame
                emit PurchaseLogistics(
                    w.purchaseTxHash,
                    w.shipping,
                    w.region,
                    w.customizations,
                    w.purchaseSetter,
                    w.status,
                    w.refundHash,
                    s // The struct safely passes here because the stack is mostly empty now!
                );
            }

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