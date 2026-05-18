// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Dividend11611 is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address payable public _admin;

    /// @notice If locked is true, users are not allowed to withdraw funds
    bool public locked;

    uint16 public unlockQuarter;
    uint16 public comingQuarter;
    uint8 public gracePeriod;
    uint8 public committedQuarters;
    uint8 public redeemPeriod;
    uint16 public previousComingQuarter;
    uint256 public credit;
    uint256 private _supply;

    modifier isUnlocked() {
        require(!locked, "contract is currently locked");
        _;
    }

    function initialize(
        address admin
    ) public initializer {
        __ERC20_init("Dividend11611", "GBD11611"); 
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
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
        _supply = amount;
    }

    function update(uint16 currentQuarter) public {
        // First-time initialization: start from current quarter
        if (unlockQuarter == 0) {
            committedQuarters = 6;
            redeemPeriod = 2;
            gracePeriod = 0;

            uint16 callQuarter = currentQuarter + committedQuarters + 11;
            uint16 newComing   = callQuarter + redeemPeriod;

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
        if (currentQuarter > comingQuarter && locked == false) {
            locked = true;

            previousComingQuarter = comingQuarter;

            uint16 callQuarter = currentQuarter + committedQuarters;
            uint16 newComing   = callQuarter + redeemPeriod;

            unlockQuarter = callQuarter;
            comingQuarter = newComing;
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
