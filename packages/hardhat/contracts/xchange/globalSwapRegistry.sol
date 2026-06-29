// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {GlobalSwap as GlobalSwapInstance} from "./globalSwap.sol";

interface IGlobalSwapFactory {
    function deployClone(
        address partyA,
        address partyB,
        address tokenA,
        uint256 amountA,
        bytes32 partyADepositHash,
        address tokenB,
        uint256 amountB,
        bytes32 partyBDepositHash,
        address feeRecipient
    ) external returns (address);
}

interface IGlobalShield {
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
    ) external;
}

contract GlobalSwapRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    address public activeFactory;
    address public feeRecipient;
    address public globalShield;

    enum SwapStatus { 
        PendingDeposits, 
        PartyADeposited, 
        PartyBDeposited, 
        Completed,          // Both parties have deposited
        PartyAPayoutDone,   // Party A's tokens have been sent out
        PartyBPayoutDone,   // Party B's tokens have been sent out
        FullySettled,       // Both payouts are 100% finished
        PartyARefunded,    
        PartyBRefunded,    
        FullyRefunded      
    }

    struct SwapDetails {
        address swapAddress;
        address partyA;
        address partyB;
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        SwapStatus status;
    }

    error NotAuthorized();
    error InvalidFactoryAddress();
    error InvalidShieldAddress();
    error InvalidSwapAddress();
    error InvalidRecipient();
    error HashDuplicated();

    address[] public allSwaps;
    address[] private admins;

    mapping(address => address[]) private userSwaps;
    mapping(address => SwapDetails) public swapRegistry;
    mapping(address => bool) private adminWhitelistMap;
    mapping(address => uint256) private adminIndex;
    mapping(bytes32 => bool) public processedDeposits;

    event SwapCreated(
        address swapAddress, 
        address partyA, 
        address partyB, 
        address tokenA, 
        uint256 amountA, 
        bytes32 partyADepositHash, 
        address tokenB, 
        uint256 amountB,
        bytes32 partyBDepositHash
    );
    event RegistrySynced(address indexed swapAddress, SwapStatus indexed newStatus);
    event FactoryUpgraded(address indexed oldFactory, address indexed newFactory);

    function initialize(address _owner) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _transferOwnership(_owner);

        feeRecipient = _owner;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _isAdmin(address admin) public view returns (bool) {
        return adminWhitelistMap[admin];
    }

    function setFactory(address _newFactory) external onlyOwner {
        if (_newFactory == address(0)) revert InvalidFactoryAddress();
        emit FactoryUpgraded(activeFactory, _newFactory);
        activeFactory = _newFactory;
    }

    function setShield(address _shield) external onlyOwner {
        if (_shield == address(0)) revert InvalidFactoryAddress();
        emit FactoryUpgraded(globalShield, _shield);
        globalShield = _shield;
    }

    /// @notice Admin Entry Point: Deploys the escrow contract shell and auto-deposits if hashes are provided
    function createSwap(
        address partyA,
        address partyB,
        address tokenA,
        uint256 amountA,
        bytes32 partyADepositHash,
        address tokenB,
        uint256 amountB,
        bytes32 partyBDepositHash,
        uint256 ts
    ) external onlyOwner returns (address) {
        if (activeFactory == address(0)) revert InvalidFactoryAddress();

        // 1. Deploy the independent swap escrow shell clone
        address swapAddress = IGlobalSwapFactory(activeFactory).deployClone(
            partyA, partyB, tokenA, amountA, partyADepositHash, 
            tokenB, amountB, partyBDepositHash, feeRecipient
        );

        if (swapAddress == address(0)) revert InvalidSwapAddress();

        IGlobalShield(globalShield).createSwap(
            swapAddress,
            partyA,
            partyB,
            tokenA,
            amountA,
            partyADepositHash,
            tokenB,
            amountB,
            partyBDepositHash,
            ts
        );

        // 2. Map the baseline details in the master ledger index (default to Pending)
        SwapDetails memory details = SwapDetails({
            swapAddress: swapAddress,
            partyA: partyA,
            partyB: partyB,
            tokenA: tokenA,
            tokenB: tokenB,
            amountA: amountA,
            amountB: amountB,
            status: SwapStatus.PendingDeposits
        });

        allSwaps.push(swapAddress);
        swapRegistry[swapAddress] = details;
        userSwaps[partyA].push(swapAddress);
        userSwaps[partyB].push(swapAddress);

        emit SwapCreated(swapAddress, partyA, partyB, tokenA, amountA, partyADepositHash, tokenB, amountB, partyBDepositHash);

        // 3. AUTO-DEPOSIT HOOKS: Identify non-empty hashes and execute sequentially
        GlobalSwapInstance instance = GlobalSwapInstance(swapAddress);
        bool triggeredAutoDeposit = false;

        if (partyADepositHash != bytes32(0)) {
            if(processedDeposits[partyADepositHash]) revert HashDuplicated();
            processedDeposits[partyADepositHash] = true;
            instance.deposit(partyA, partyADepositHash);
            triggeredAutoDeposit = true;
        }

        if (partyBDepositHash != bytes32(0)) {
            if(processedDeposits[partyBDepositHash]) revert HashDuplicated();
            processedDeposits[partyBDepositHash] = true;
            instance.deposit(partyB, partyBDepositHash);
            triggeredAutoDeposit = true;
        }

        // 4. If any deposit occurred, run the matrix immediately to override "PendingDeposits"
        if (triggeredAutoDeposit) {
            _resolveAndSyncStatus(swapAddress, instance);
        } else {
            // Log the baseline state if no auto-deposits happened
            emit RegistrySynced(swapAddress, SwapStatus.PendingDeposits);
        }

        return swapAddress;
    }

    // --- MIDDLEMAN EXECUTION & MATRIX ROUTERS ---

    function deposit(address swapAddress, address party, bytes32 depositHash) external nonReentrant {
        if (msg.sender != party && !adminWhitelistMap[msg.sender] && msg.sender != owner()) revert NotAuthorized();

        if(processedDeposits[depositHash]) revert HashDuplicated();
        processedDeposits[depositHash] = true;
        GlobalSwapInstance instance = GlobalSwapInstance(swapAddress);
        instance.deposit(party, depositHash);

        _resolveAndSyncStatus(swapAddress, instance);
    }

    function refund(address swapAddress, address party, bytes32 refundHash) external nonReentrant {
        if (msg.sender != party && !adminWhitelistMap[msg.sender] && msg.sender != owner()) revert NotAuthorized();

        if(processedDeposits[refundHash]) revert HashDuplicated();
        processedDeposits[refundHash] = true;

        GlobalSwapInstance instance = GlobalSwapInstance(swapAddress);
        instance.refund(party, refundHash);

        _resolveAndSyncStatus(swapAddress, instance);
    }

    function markPartyAPayoutCompleted(address swapAddress) external nonReentrant {
        if (msg.sender != owner() && !adminWhitelistMap[msg.sender]) revert NotAuthorized();

        GlobalSwapInstance instance = GlobalSwapInstance(swapAddress);
        instance.markPartyAPayoutCompleted();

        _resolveAndSyncStatus(swapAddress, instance);
    }

    function markPartyBPayoutCompleted(address swapAddress) external nonReentrant {
        if (msg.sender != owner() && !adminWhitelistMap[msg.sender]) revert NotAuthorized();

        GlobalSwapInstance instance = GlobalSwapInstance(swapAddress);
        instance.markPartyBPayoutCompleted();

        _resolveAndSyncStatus(swapAddress, instance);
    }

    // --- CENTRAL LIFECYCLE RESOLVER MATRIX ---

    function _resolveAndSyncStatus(address swapAddress, GlobalSwapInstance instance) internal {
        bool liveCompleted = instance.completed();
        bool livePayoutA = instance.payoutACompleted();
        bool livePayoutB = instance.payoutBCompleted();
        bool liveARef = instance.partyARefund() || instance.refundACompleted();
        bool liveBRef = instance.partyBRefund() || instance.refundBCompleted();
        bool liveA = instance.partyADeposited();
        bool liveB = instance.partyBDeposited();

        SwapStatus resolvedStatus;

        if (liveARef && liveBRef) {
            resolvedStatus = SwapStatus.FullyRefunded;
        } else if (liveARef) {
            resolvedStatus = SwapStatus.PartyARefunded;
        } else if (liveBRef) {
            resolvedStatus = SwapStatus.PartyBRefunded;
        } else if (livePayoutA && livePayoutB) {
            resolvedStatus = SwapStatus.FullySettled;
        } else if (livePayoutA) {
            resolvedStatus = SwapStatus.PartyAPayoutDone;
        } else if (livePayoutB) {
            resolvedStatus = SwapStatus.PartyBPayoutDone;
        } else if (liveCompleted) {
            resolvedStatus = SwapStatus.Completed;
        } else if (liveA) {
            resolvedStatus = SwapStatus.PartyADeposited;
        } else if (liveB) {
            resolvedStatus = SwapStatus.PartyBDeposited;
        } else {
            resolvedStatus = SwapStatus.PendingDeposits;
        }

        swapRegistry[swapAddress].status = resolvedStatus;
        emit RegistrySynced(swapAddress, resolvedStatus);
    }

    // --- VIEW / INDEX PORTS ---

    function getSwapsForUser(address user) external view returns (address[] memory) {
        return userSwaps[user];
    }

    function adminsIndex() external view onlyOwner returns(address[] memory) {
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