// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TGMxRenewable is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    error NotAuthorized();

    address payable public _admin;
    address private _vault;

    /// @notice If locked is true, users are not allowed to withdraw funds
    bool public locked;

    uint256 public startQuarter;
    uint256 public unlockQuarter;
    uint256 public comingQuarter;
    uint256 public gracePeriod;
    uint256 public committedQuarters;
    uint256 public redeemPeriod;
    uint256 public previousComingQuarter;
    uint256 public credit;
    uint256 private _supply;

    uint256 public constant annualRate = 500; // 5%

    modifier isUnlocked() {
        require(!locked, "contract is currently locked");
        _;
    }

    function initialize(
        address admin,
        address vault
    ) public initializer {
        __ERC20_init("TGMxRenewable", "TGMx"); 
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

    function update(uint256 currentQuarter) public {
        if(msg.sender != _vault) revert NotAuthorized();
        // First-time initialization: start from current quarter
        if (unlockQuarter == 0) {
            committedQuarters = 12;
            redeemPeriod = 60;
            gracePeriod = 4;

            uint256 callQuarter = currentQuarter + committedQuarters;
            uint256 newComing   = callQuarter + redeemPeriod;

            startQuarter = currentQuarter;
            unlockQuarter = callQuarter;
            comingQuarter = newComing;
            locked = true;
            return;
        }

        // Case 1: Before unlock quarter → lock
        if (currentQuarter < unlockQuarter && locked == false) {
            locked = true;
            return;
        }

        // Case 2: Between unlock and coming quarter → unlock
        if (currentQuarter >= unlockQuarter &&
            currentQuarter <= comingQuarter &&
            locked == true)
        {
            locked = false;
            return;
        }

        // Case 3: Past coming quarter → advance cycle
        if (currentQuarter >= comingQuarter && locked == false) {
            locked = true;

            previousComingQuarter = comingQuarter;

            uint256 callQuarter = currentQuarter + committedQuarters;
            uint256 newComing   = callQuarter + redeemPeriod;

            startQuarter = currentQuarter;
            unlockQuarter = callQuarter;
            comingQuarter = newComing;
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
