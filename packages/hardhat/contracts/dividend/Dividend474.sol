// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../libraries/dateTimeLibrary.sol";

contract Dividend474 is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    using DateTimeLibrary for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address payable private _admin;
    address private _vault;

    /// @notice If locked is true, users are not allowed to withdraw funds
    bool public locked;

    uint256 public startQuarter;
    uint256 public unlockQuarter;
    uint256 public comingQuarter;
    uint256 public monthKey;
    uint256 internal absoluteMonth;
    uint256 public contractTime;
    uint256 public committedQuarters;
    uint256 public redeemPeriod;
    uint256 public previousComingQuarter;
    uint256 public credit;
    uint256 private _supply;

    error NotAuthorized();

    modifier isUnlocked() {
        require(!locked, "contract is currently locked");
        _;
    }

    function initialize(
        address admin,
         address vault
    ) public initializer {
        __ERC20_init("GlobalDomnionX", "GBD474"); 
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(MINTER_ROLE, vault);
        _vault = vault;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }
    function toggleLock() external onlyRole(MINTER_ROLE) {
        locked = !locked;
    }

    function burnFrom(address account, uint256 amount) public {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "Burn amount exceeds allowance");
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
    }

    function viewSupply() external view returns (uint256) {
        return _supply;
    }

    function supply(uint256 amount) public {
        if (msg.sender != _vault) revert NotAuthorized();
        _supply = amount;
    }

    function update(uint256 currentQuarter, uint256 month, uint256 ts) public {
        if (msg.sender != _vault) revert NotAuthorized();
        // Cache storage variables to memory upfront to save SLOAD gas
        uint256 localUnlock = unlockQuarter;

        // First-time initialization: start from current quarter
        
        if (localUnlock == 0) {
            committedQuarters = 7;
            redeemPeriod = 8;
            monthKey = 4;
            absoluteMonth = 4;
            uint256 adjustedTs;

            if(absoluteMonth > 5) {
                adjustedTs = ts.addMonths(2); 
            } else {
                adjustedTs = ts.subMonths(2);
            }

            contractTime = adjustedTs;

            startQuarter = 2026 * 4 + 1;
            uint256 callQuarter = startQuarter + 7;
            uint256 newComing   = callQuarter + 8;

            unlockQuarter = callQuarter;
            comingQuarter = newComing;
            locked = true;
            return;
        }

        // Cache remaining variables if initialization is skipped
        bool isLocked = locked;
        uint256 localComing = comingQuarter;
        uint256 localMonthKey = monthKey;

        // Before unlock quarter --> lock
        if (currentQuarter < localUnlock && !isLocked && month < localMonthKey) {
            locked = true;
        }
        // Between unlock and coming quarter → unlock
        else if (currentQuarter >= localUnlock && currentQuarter <= localComing && isLocked) {
            if (month >= localMonthKey) {
                locked = false;
            }
        }
        // Past coming quarter --> advance cycle
        else if (currentQuarter >= localComing && !isLocked) {
            if (month >= localMonthKey) {
                locked = true;
                previousComingQuarter = localComing;

                // Math Optimization: Pre-calculated to save gas.
                uint256 advance = 45; 
                uint256 newAbsoluteMonth = absoluteMonth + advance;
                absoluteMonth = newAbsoluteMonth;
                
                monthKey = ((localMonthKey + advance - 1) % 12) + 1;

                uint256 callQuarter = currentQuarter + 7;

                startQuarter = localComing;
                unlockQuarter = callQuarter;
                comingQuarter = callQuarter + 8; // RedeemptionPeriod
                contractTime = ts;
            }
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
