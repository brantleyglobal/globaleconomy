// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StableSwapGateway is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable GBD;
    uint256 public feeBasisPoints = 125; // 1.25%
    uint256 public constant MAX_BPS = 10000;

    mapping(address => bool) public stablecoinWhitelist;
    mapping(address => bool) public redemptionLocked;
    mapping(address => bool) public authorizedLockers;

    

    event StableSwapped(address indexed user, address indexed stable, uint256 stableIn, uint256 gbdOut, uint256 fee);
    event StableRefunded(address indexed user, address indexed stable, uint256 gbdIn, uint256 stableOut, uint256 fee);
    event FeeUpdated(uint256 newFeeBps);
    event StablecoinToggled(address stable, bool enabled);

    constructor(address initialOwner, address _gbd, address[] memory initialStables) Ownable(initialOwner) {
        require(_gbd != address(0), "Invalid GBD address");
        GBD = IERC20(_gbd);

        for (uint256 i = 0; i < initialStables.length; i++) {
            address token = initialStables[i];
            require(token != address(0), "Zero address not allowed");
            stablecoinWhitelist[token] = true;
            emit StablecoinToggled(token, true);
        }
    }

    function toggleStablecoin(address stable, bool isEnabled) external onlyOwner {
        require(stable != address(0), "Invalid stablecoin address");
        stablecoinWhitelist[stable] = isEnabled;
        emit StablecoinToggled(stable, isEnabled);
    }

    function setFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "Fee too high");
        feeBasisPoints = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    function setAuthorizedLocker(address locker, bool status) external onlyOwner {
        require(locker != address(0), "Invalid locker");
        authorizedLockers[locker] = status;
    }

    /*function lockRedemption(address user) external {
        require(authorizedLockers[msg.sender], "Not authorized");
        require(user != address(0), "Invalid user");
        require(!redemptionLocked[msg.sender], "Redemption is locked for user");
        redemptionLocked[user] = true;
    }*/

    function swapStableForGBD(address stable, uint256 amount) external {
        require(stablecoinWhitelist[stable], "Stablecoin not supported");
        require(amount > 0, "Amount must be > 0");

        IERC20 stableToken = IERC20(stable);
        stableToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * feeBasisPoints) / MAX_BPS;
        uint256 gbdOut = amount - fee;

        require(GBD.balanceOf(address(this)) >= gbdOut, "Insufficient GBD liquidity");
        GBD.safeTransfer(msg.sender, gbdOut);

        emit StableSwapped(msg.sender, stable, amount, gbdOut, fee);
    }

    function swapGBDForStable(address stable, uint256 gbdAmount) external {
        require(stablecoinWhitelist[stable], "Stablecoin not supported");
        require(gbdAmount > 0, "Amount must be > 0");

        uint256 fee = (gbdAmount * feeBasisPoints) / MAX_BPS;
        uint256 stableOut = gbdAmount - fee;

        IERC20 stableToken = IERC20(stable);

        require(stableToken.balanceOf(address(this)) >= stableOut, "Insufficient stablecoin liquidity");

        GBD.safeTransferFrom(msg.sender, address(this), gbdAmount);
        stableToken.safeTransfer(msg.sender, stableOut);

        emit StableRefunded(msg.sender, stable, gbdAmount, stableOut, fee);
    }

    function unlockRedemption(address user) external {
        require(authorizedLockers[msg.sender], "Not authorized");
        require(user != address(0), "Invalid user");
        redemptionLocked[user] = false;
        // Optionally, emit an event here
    }

    function returnGBDForStable(address user, address stable, uint256 gbdAmount) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(stablecoinWhitelist[stable], "Stablecoin not supported");
        require(gbdAmount > 0, "Zero GBD");

        IERC20 stableToken = IERC20(stable);
        uint256 stableOut = gbdAmount;

        require(stableToken.balanceOf(address(this)) >= stableOut, "Not enough stablecoin liquidity");

        GBD.safeTransferFrom(user, address(this), gbdAmount);
        stableToken.safeTransfer(user, stableOut);

        emit StableRefunded(user, stable, gbdAmount, stableOut, 0);
    }
}
