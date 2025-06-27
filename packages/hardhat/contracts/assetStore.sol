// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract AssetStore {
    address public admin;

    struct Asset {
        string name;
        uint256 priceInUSD;
        string metadataCID;
        bool active;
        uint256 baseDays;
        uint256 perUnitDelay;
    }

    mapping(uint256 => Asset) public assets;
    uint256 public assetCount;

    constructor() {
        admin = msg.sender;
    }

    function addAsset(
        string memory _name,
        uint256 _priceInUSD,
        string memory _metadataCID,
        uint256 _baseDays,
        uint256 _perUnitDelay
    ) external {
        require(msg.sender == admin, "Only admin can add");

        assets[assetCount] = Asset(
            _name,
            _priceInUSD,
            _metadataCID,
            true,
            _baseDays,
            _perUnitDelay
        );
        assetCount++;
    }

    function getAsset(uint256 _id) public view returns (Asset memory) {
        return assets[_id];
    }
}
