// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./libraries/stableSwapGatewayLib.sol";



contract StableSwapGateway is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using StableSwapLib for StableSwapLib.Data;

    StableSwapLib.Data private data;
    event FeeUpdated(uint256 newFeeBps);


    function initialize(address _owner, address _gbd, address[] memory initialStables, uint256 initialFeeBps) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        data.initialize(_gbd, initialFeeBps);

        for (uint256 i = 0; i < initialStables.length; i++) {
            address token = initialStables[i];
            require(token != address(0), "Zero address not allowed");
            data.stablecoinWhitelist[token] = true;
            // You can emit an event for each toggle if needed
        }
    }

    function toggleStablecoin(address stable, bool isEnabled) external onlyOwner {
        data.toggleStablecoin(stable, isEnabled);
        // Optionally emit event
    }

    function setFee(uint256 newFeeBps) external onlyOwner {
        data.setFee(newFeeBps);
        emit FeeUpdated(newFeeBps);
    }
    

    function swapStableForGBD(address stable, uint128 amount) external {
        data.swapStableForGBD(msg.sender, stable, amount);
    }

    function swapGBDForStable(address stable, uint256 gbdAmount) external {
        data.swapGBDForStable(msg.sender, stable, gbdAmount);
    }

    // Additional functions like unlockRedemption, returnGBDForStable, etc., delegate similarly

    function getUserSwaps(address user) external view returns (StableSwapLib.SwapRecord[] memory) {
        return data.userSwaps[user];
    }

    function getUserSwapsByStatus(address user, uint8 status) external view returns (StableSwapLib.SwapRecord[] memory) {
        uint256 totalSwaps = data.userSwaps[user].length;
        uint256 count = 0;

        // First, count how many swaps match the status
        for (uint256 i = 0; i < totalSwaps; i++) {
            if (data.userSwaps[user][i].status == status) {
                count++;
            }
        }

        // Create array for filtered swaps
        StableSwapLib.SwapRecord[] memory filteredSwaps = new StableSwapLib.SwapRecord[](count);
        uint256 index = 0;

        // Populate array with matching swaps
        for (uint256 i = 0; i < totalSwaps; i++) {
            if (data.userSwaps[user][i].status == status) {
                filteredSwaps[index] = data.userSwaps[user][i];
                index++;
            }
        }

        return filteredSwaps;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}