// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Dividend656 is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address payable public _admin;

    /// @notice If locked is true, users are not allowed to withdraw funds
    bool public locked;

    uint16 public unlockQuarter;
    uint16 public comingQuarter;
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
        __ERC20_init("Dividend656", "GBD656"); 
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

    function update(uint16 injectedTime) public {
        if (unlockQuarter == 0){
            uint16 day = 1;
            uint16 quarter = 2;
            uint16 year = injectedTime / 1000;

            unlockQuarter = ((year + 1) * 1000) + (quarter * 100) + day;

        } else if ((injectedTime < unlockQuarter) && (locked == false)) {
            locked = !locked;
        } else if ((injectedTime >= unlockQuarter) && (injectedTime <= comingQuarter) && (locked == true)) {
            locked = !locked;
        } else if ((injectedTime >= comingQuarter) && (locked == false)){
            locked = !locked;
            previousComingQuarter = comingQuarter;
            uint16 day = injectedTime % 100;
            uint16 quarter = (injectedTime / 100) % 10;
            uint16 year = injectedTime / 1000;

            if (day > 16) {
                day = 1;
                if ((quarter + 1) > 4) {
                    quarter = 1;
                    year += 1;
                } else {
                    quarter += 1;
                }
            } else {
                day = 1;
            }

            uint16 committedQuarters = 5;
            uint16 redeemPeriod = 2;

            uint16 callQuarter = quarter + committedQuarters;
            uint16 newComing = callQuarter + redeemPeriod;

            if (callQuarter < 4 ) {
                unlockQuarter = ((year) * 1000) + (callQuarter * 100) + day;
            } else if (callQuarter > 4 && callQuarter <= 8) {
                unlockQuarter = ((year + 1) * 1000) + ((callQuarter - 4) * 100) + day;
            } else if (callQuarter > 8 && callQuarter <= 12) {
                unlockQuarter = ((year + 2) * 1000) + ((callQuarter - 8) * 100) + day;
            } else if (callQuarter > 12) {
                unlockQuarter = ((year + 3) * 1000) + (callQuarter * 100) + day;
            }

            if (newComing < 4 ) {
                comingQuarter = ((year) * 1000) + (newComing * 100) + day;
            } else if (newComing > 4 && newComing <= 8) {
                comingQuarter = ((year + 1) * 1000) + ((newComing - 4) * 100) + day;
            } else if (newComing > 8 && newComing <= 12) {
                comingQuarter = ((year + 2) * 1000) + ((newComing - 8) * 100) + day;
            } else if (newComing > 12) {
                comingQuarter = ((year + 3) * 1000) + ((newComing - 12) * 100) + day;
            }
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
