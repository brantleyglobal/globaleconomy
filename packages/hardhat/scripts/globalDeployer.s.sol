// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {Upgrades, Options} from "openzeppelin-foundry-upgrades/Upgrades.sol";

// Import your contracts
import "../contracts/vaults/smartVault.sol";
import "../contracts/vaults/vaultLink.sol";
import "../contracts/vaults/regionInfrastructure.sol";
import "../contracts/purchase/acquisitionGateway.sol";
import "../contracts/purchase/assetPurchase.sol";
// Explicitly import only what the script needs:
import {GlobalSwap} from "../contracts/xchange/globalSwap.sol";
import {GlobalSwapFactory} from "../contracts/xchange/globalSwapFactory.sol";
import "../contracts/currency/globalDollar.sol";
import "../contracts/currency/globalDollarT.sol";
import "../contracts/currency/globalDollarX.sol";
import "../contracts/currency/copian.sol";
import "../contracts/ledger/globalLedger.sol";
import "../contracts/dividend/Dividend121.sol";
import "../contracts/dividend/Dividend222.sol";
import "../contracts/dividend/Dividend323.sol";
import "../contracts/dividend/Dividend424.sol";
import "../contracts/dividend/Dividend525.sol";
import "../contracts/dividend/Dividend626.sol";
import "../contracts/dividend/Dividend727.sol";
import "../contracts/dividend/Dividend828.sol";
import "../contracts/dividend/Dividend929.sol";
import "../contracts/dividend/Dividend10210.sol";
import "../contracts/dividend/Dividend11211.sol";
import "../contracts/dividend/Dividend12212.sol";
import "../contracts/dividend/Dividend13213.sol";
import "../contracts/dividend/Dividend14214.sol";
import "../contracts/dividend/Dividend15215.sol";
import "../contracts/dividend/Dividend16216.sol";
import "../contracts/dividend/Dividend17217.sol";
import "../contracts/dividend/Dividend18218.sol";
import "../contracts/dividend/Dividend19219.sol";
import "../contracts/dividend/Dividend20220.sol";
import "../contracts/dividend/Dividend21221.sol";
import "../contracts/dividend/Dividend22222.sol";
import "../contracts/dividend/Dividend23223.sol";
import "../contracts/dividend/Dividend24224.sol";
import "../contracts/dividend/Dividend25225.sol";
import "../contracts/dividend/Dividend26226.sol";
import "../contracts/dividend/Dividend131.sol";
import "../contracts/dividend/Dividend232.sol";
import "../contracts/dividend/Dividend333.sol";
import "../contracts/dividend/Dividend434.sol";
import "../contracts/dividend/Dividend535.sol";
import "../contracts/dividend/Dividend636.sol";
import "../contracts/dividend/Dividend737.sol";
import "../contracts/dividend/Dividend838.sol";
import "../contracts/dividend/Dividend939.sol";
import "../contracts/dividend/Dividend10310.sol";
import "../contracts/dividend/Dividend11311.sol";
import "../contracts/dividend/Dividend12312.sol";
import "../contracts/dividend/Dividend13313.sol";
import "../contracts/dividend/Dividend14314.sol";
import "../contracts/dividend/Dividend15315.sol";
import "../contracts/dividend/Dividend16316.sol";
import "../contracts/dividend/Dividend17317.sol";
import "../contracts/dividend/Dividend18318.sol";
import "../contracts/dividend/Dividend19319.sol";
import "../contracts/dividend/Dividend20320.sol";
import "../contracts/dividend/Dividend21321.sol";
import "../contracts/dividend/Dividend22322.sol";
import "../contracts/dividend/Dividend23323.sol";
import "../contracts/dividend/Dividend24324.sol";
import "../contracts/dividend/Dividend25325.sol";
import "../contracts/dividend/Dividend26326.sol";
import "../contracts/dividend/Dividend27327.sol";
import "../contracts/dividend/Dividend141.sol";
import "../contracts/dividend/Dividend242.sol";
import "../contracts/dividend/Dividend343.sol";
import "../contracts/dividend/Dividend444.sol";
import "../contracts/dividend/Dividend545.sol";
import "../contracts/dividend/Dividend646.sol";
import "../contracts/dividend/Dividend747.sol";
import "../contracts/dividend/Dividend848.sol";
import "../contracts/dividend/Dividend949.sol";
import "../contracts/dividend/Dividend10410.sol";
import "../contracts/dividend/Dividend11411.sol";
import "../contracts/dividend/Dividend12412.sol";
import "../contracts/dividend/Dividend13413.sol";
import "../contracts/dividend/Dividend14414.sol";
import "../contracts/dividend/Dividend15415.sol";
import "../contracts/dividend/Dividend16416.sol";
import "../contracts/dividend/Dividend17417.sol";
import "../contracts/dividend/Dividend18418.sol";
import "../contracts/dividend/Dividend19419.sol";
import "../contracts/dividend/Dividend20420.sol";
import "../contracts/dividend/Dividend21421.sol";
import "../contracts/dividend/Dividend22422.sol";
import "../contracts/dividend/Dividend23423.sol";
import "../contracts/dividend/Dividend24424.sol";
import "../contracts/dividend/Dividend25425.sol";
import "../contracts/dividend/Dividend26426.sol";
import "../contracts/dividend/Dividend27427.sol";
import "../contracts/dividend/Dividend28428.sol";
import "../contracts/dividend/Dividend151.sol";
import "../contracts/dividend/Dividend252.sol";
import "../contracts/dividend/Dividend353.sol";
import "../contracts/dividend/Dividend454.sol";
import "../contracts/dividend/Dividend555.sol";
import "../contracts/dividend/Dividend656.sol";
import "../contracts/dividend/Dividend757.sol";
import "../contracts/dividend/Dividend858.sol";
import "../contracts/dividend/Dividend959.sol";
import "../contracts/dividend/Dividend10510.sol";
import "../contracts/dividend/Dividend11511.sol";
import "../contracts/dividend/Dividend12512.sol";
import "../contracts/dividend/Dividend13513.sol";
import "../contracts/dividend/Dividend14514.sol";
import "../contracts/dividend/Dividend15515.sol";
import "../contracts/dividend/Dividend16516.sol";
import "../contracts/dividend/Dividend17517.sol";
import "../contracts/dividend/Dividend18518.sol";
import "../contracts/dividend/Dividend19519.sol";
import "../contracts/dividend/Dividend20520.sol";
import "../contracts/dividend/Dividend21521.sol";
import "../contracts/dividend/Dividend22522.sol";
import "../contracts/dividend/Dividend23523.sol";
import "../contracts/dividend/Dividend24524.sol";
import "../contracts/dividend/Dividend25525.sol";
import "../contracts/dividend/Dividend26526.sol";
import "../contracts/dividend/Dividend27527.sol";
import "../contracts/dividend/Dividend28528.sol";
import "../contracts/dividend/Dividend29529.sol";
import "../contracts/dividend/Dividend161.sol";
import "../contracts/dividend/Dividend262.sol";
import "../contracts/dividend/Dividend363.sol";
import "../contracts/dividend/Dividend464.sol";
import "../contracts/dividend/Dividend565.sol";
import "../contracts/dividend/Dividend666.sol";
import "../contracts/dividend/Dividend767.sol";
import "../contracts/dividend/Dividend868.sol";
import "../contracts/dividend/Dividend969.sol";
import "../contracts/dividend/Dividend10610.sol";
import "../contracts/dividend/Dividend11611.sol";
import "../contracts/dividend/Dividend12612.sol";
import "../contracts/dividend/Dividend13613.sol";
import "../contracts/dividend/Dividend14614.sol";
import "../contracts/dividend/Dividend15615.sol";
import "../contracts/dividend/Dividend16616.sol";
import "../contracts/dividend/Dividend17617.sol";
import "../contracts/dividend/Dividend18618.sol";
import "../contracts/dividend/Dividend19619.sol";
import "../contracts/dividend/Dividend20620.sol";
import "../contracts/dividend/Dividend21621.sol";
import "../contracts/dividend/Dividend22622.sol";
import "../contracts/dividend/Dividend23623.sol";
import "../contracts/dividend/Dividend24624.sol";
import "../contracts/dividend/Dividend25625.sol";
import "../contracts/dividend/Dividend26626.sol";
import "../contracts/dividend/Dividend27627.sol";
import "../contracts/dividend/Dividend28628.sol";
import "../contracts/dividend/Dividend29629.sol";
import "../contracts/dividend/Dividend30630.sol";
import "../contracts/dividend/Dividend171.sol";
import "../contracts/dividend/Dividend272.sol";
import "../contracts/dividend/Dividend373.sol";
import "../contracts/dividend/Dividend474.sol";
import "../contracts/dividend/Dividend575.sol";
import "../contracts/dividend/Dividend676.sol";
import "../contracts/dividend/Dividend777.sol";
import "../contracts/dividend/Dividend878.sol";
import "../contracts/dividend/Dividend979.sol";
import "../contracts/dividend/Dividend10710.sol";
import "../contracts/dividend/Dividend11711.sol";
import "../contracts/dividend/Dividend12712.sol";
import "../contracts/dividend/Dividend13713.sol";
import "../contracts/dividend/Dividend14714.sol";
import "../contracts/dividend/Dividend15715.sol";
import "../contracts/dividend/Dividend16716.sol";
import "../contracts/dividend/Dividend17717.sol";
import "../contracts/dividend/Dividend18718.sol";
import "../contracts/dividend/Dividend19719.sol";
import "../contracts/dividend/Dividend20720.sol";
import "../contracts/dividend/Dividend21721.sol";
import "../contracts/dividend/Dividend22722.sol";
import "../contracts/dividend/Dividend23723.sol";
import "../contracts/dividend/Dividend24724.sol";
import "../contracts/dividend/Dividend25725.sol";
import "../contracts/dividend/Dividend26726.sol";
import "../contracts/dividend/Dividend27727.sol";
import "../contracts/dividend/Dividend28728.sol";
import "../contracts/dividend/Dividend29729.sol";
import "../contracts/dividend/Dividend30730.sol";
import "../contracts/dividend/Dividend31731.sol";
import "../contracts/dividend/Dividend181.sol";
import "../contracts/dividend/Dividend282.sol";
import "../contracts/dividend/Dividend383.sol";
import "../contracts/dividend/Dividend484.sol";
import "../contracts/dividend/Dividend585.sol";
import "../contracts/dividend/Dividend686.sol";
import "../contracts/dividend/Dividend787.sol";
import "../contracts/dividend/Dividend888.sol";
import "../contracts/dividend/Dividend989.sol";
import "../contracts/dividend/Dividend10810.sol";
import "../contracts/dividend/Dividend11811.sol";
import "../contracts/dividend/Dividend12812.sol";
import "../contracts/dividend/Dividend13813.sol";
import "../contracts/dividend/Dividend14814.sol";
import "../contracts/dividend/Dividend15815.sol";
import "../contracts/dividend/Dividend16816.sol";
import "../contracts/dividend/Dividend17817.sol";
import "../contracts/dividend/Dividend18818.sol";
import "../contracts/dividend/Dividend19819.sol";
import "../contracts/dividend/Dividend20820.sol";
import "../contracts/dividend/Dividend21821.sol";
import "../contracts/dividend/Dividend22822.sol";
import "../contracts/dividend/Dividend23823.sol";
import "../contracts/dividend/Dividend24824.sol";
import "../contracts/dividend/Dividend25825.sol";
import "../contracts/dividend/Dividend26826.sol";
import "../contracts/dividend/Dividend27827.sol";
import "../contracts/dividend/Dividend28828.sol";
import "../contracts/dividend/Dividend29829.sol";
import "../contracts/dividend/Dividend30830.sol";
import "../contracts/dividend/Dividend31831.sol";
import "../contracts/dividend/Dividend32832.sol";
import "../contracts/regional/globe.sol";
import "../contracts/regional/BGGrid.sol";
import "../contracts/regional/TGMxRenewable.sol";
import "../contracts/regional/TGUsRenewable.sol";
import "../contracts/RE/BGSellRE.sol";
import "../contracts/RE/BGHoldRE.sol";
// Generic Dividend contract for many implementation files
import "../contracts/dividend/Dividend.sol"; 

error DeploymentFailed(string contractName);

contract DeploySystem is Script {
    address deployer;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    bool isUpgrade = vm.envOr("IS_UPGRADE", false);

    function run() external {

        deployer = msg.sender;

        /*Options memory opts;
        opts.unsafeSkipStorageCheck = true;*/

        //bool isUpgrade = vm.envOr("IS_UPGRADE", false);

        vm.startBroadcast(deployer);

        // --- 1. Deploy UUPS Proxies ---

        address gbdProxy;
        address copxProxy;
        address[] memory stablecoinAddresses;
        address[] memory adminAddresses;
        address ledgerProxy;
        address acquisitionGatewayProxy;
        address payable assetPurchaseProxy;
        address smartVaultProxy;
        address vaultLinkProxy;
        address regionInfrastructureProxy;
        address gbdtProxy;
        address globeProxy;
        address bGGRIDProxy;
        address tGMXProxy;
        address tGUSAProxy;
        address fFSProxy;
        address fRSProxy;


        if (!isUpgrade) {

            // GlobalDollar
            gbdProxy = Upgrades.deployUUPSProxy(
                "globalDollar.sol",
                abi.encodeCall(GlobalDollar.initialize, (deployer, _getPreAddr(), _getPreFnd()))
            );

            // Copian
            copxProxy = Upgrades.deployUUPSProxy(
                "copian.sol",
                abi.encodeCall(Copian.initialize, (deployer, _getPreAddr(), _getPreFnd()))
            );

            // --- 2. Setup Addresses & Arrays ---
            stablecoinAddresses = _getStablecoins(gbdProxy, copxProxy);
            adminAddresses = _getAdminAddresses();

            // --- 3. Deploy Standard Contracts ---

            // GlobalLedger
            ledgerProxy = Upgrades.deployUUPSProxy(
                "globalLedger.sol",
                abi.encodeCall(GlobalLedger.initialize, (deployer))
            );

            new GlobalSwap(); //GlobalSwap swapImpl = new GlobalSwap();
            GlobalSwapFactory factory = new GlobalSwapFactory();
            factory.initialize(deployer, stablecoinAddresses);

            // --- 4. Deploy Remaining Infrastructure ---

            acquisitionGatewayProxy = Upgrades.deployUUPSProxy(
                "acquisitionGateway.sol",
                abi.encodeCall(AcquisitionGateway.initialize, (deployer,  ledgerProxy))
            );

            assetPurchaseProxy = payable(Upgrades.deployUUPSProxy(
                "assetPurchase.sol",
                abi.encodeCall(AssetPurchase.initialize, (deployer, ledgerProxy))
            ));
        

            smartVaultProxy = payable(Upgrades.deployUUPSProxy(
                "smartVault.sol",
                abi.encodeCall(SmartVault.initialize, (deployer, USDC,ledgerProxy))
            ));

            vaultLinkProxy = Upgrades.deployUUPSProxy(
                "vaultLink.sol",
                abi.encodeCall(VaultLink.initialize, (deployer, smartVaultProxy))
            );

            regionInfrastructureProxy = payable(Upgrades.deployUUPSProxy(
                "regionInfrastructure.sol",
                abi.encodeCall(RegionInfrastructure.initialize, (deployer, USDC, ledgerProxy))
            ));

            // GlobalDollarT
            gbdtProxy = Upgrades.deployUUPSProxy(
                "globalDollarT.sol",
                abi.encodeCall(GlobalDollarT.initialize, (deployer, smartVaultProxy))
            );

            globeProxy = Upgrades.deployUUPSProxy(
                "globe.sol",
                abi.encodeCall(Globe.initialize, (deployer, regionInfrastructureProxy))
            );

            bGGRIDProxy = Upgrades.deployUUPSProxy(
                "BGGrid.sol",
                abi.encodeCall(BGGrid.initialize, (deployer, regionInfrastructureProxy))
            );

            tGMXProxy = Upgrades.deployUUPSProxy(
                "TGMxRenewable.sol",
                abi.encodeCall(TGMxRenewable.initialize, (deployer, regionInfrastructureProxy))
            );

            tGUSAProxy = Upgrades.deployUUPSProxy(
                "TGUsRenewable.sol",
                abi.encodeCall(TGUsRenewable.initialize, (deployer, regionInfrastructureProxy))
            );

            fFSProxy = Upgrades.deployUUPSProxy(
                "BGSellRE.sol",
                abi.encodeCall(BGSellRE.initialize, (deployer, regionInfrastructureProxy))
            );

            fRSProxy = Upgrades.deployUUPSProxy(
                "BGHoldRE.sol",
                abi.encodeCall(BGHoldRE.initialize, (deployer, regionInfrastructureProxy))
            );

        } else {

            address existingGbdProxy = vm.envAddress("gbdProxy");
            address existingCopxProxy = vm.envAddress("copxProxy");
            address existingledgerProxy = vm.envAddress("ledgerProxy");
            address existingacquisitionGatewayProxy = vm.envAddress("acquisitionGatewayProxy");
            address existingassetPurchaseProxyv = vm.envAddress("assetPurchaseProxyv");
            address existingsmartVaultProxy = vm.envAddress("smartVaultProxy");
            address existingvaultLinkProxy = vm.envAddress("vaultLinkProxy");
            address existingregionInfrastructureProxy = vm.envAddress("regionInfrastructureProxy");
            address existinggbdtProxy = vm.envAddress("gbdtProxy");
            address existingglobeProxy = vm.envAddress("globeProxy");
            address existingbGGRIDProxy = vm.envAddress("bGGRIDProxy");
            address existingtGMXProxy = vm.envAddress("tGMXProxy");
            address existingtGUSAProxy = vm.envAddress("tGUSAProxy");
            address existingfFSProxy = vm.envAddress("fFSProxy");
            address existingfRSProxy = vm.envAddress("fRSProxy");

            // Upgrades the implementation contracts seamlessly without wiping states
            Upgrades.upgradeProxy(existingGbdProxy, "globalDollar.sol", "");
            Upgrades.upgradeProxy(existingCopxProxy, "copian.sol", "");
            Upgrades.upgradeProxy(existingledgerProxy, "globalLedger.sol", "");
            Upgrades.upgradeProxy(existingacquisitionGatewayProxy, "acquisitionGateway.sol", "");
            Upgrades.upgradeProxy(existingassetPurchaseProxyv, "assetPurchase.sol", "");
            Upgrades.upgradeProxy(existingsmartVaultProxy, "smartVault.sol", "");
            Upgrades.upgradeProxy(existingvaultLinkProxy, "vaultLink.sol", "");
            Upgrades.upgradeProxy(existingregionInfrastructureProxy, "regionInfrastructure.sol", "");
            Upgrades.upgradeProxy(existinggbdtProxy, "globalDollarT.sol", "");
            Upgrades.upgradeProxy(existingglobeProxy, "globe.sol", "");
            Upgrades.upgradeProxy(existingbGGRIDProxy, "BGGrid.sol", "");
            Upgrades.upgradeProxy(existingtGMXProxy, "TGMxRenewable.sol", "");
            Upgrades.upgradeProxy(existingtGUSAProxy, "TGUsRenewable.sol", "");
            Upgrades.upgradeProxy(existingfFSProxy, "BGSellRE.sol", "");
            Upgrades.upgradeProxy(existingfRSProxy, "BGHoldRE.sol", "");

            console.log("Systems upgraded successfully.");

        }
        
        address[] memory contractAddress = new address[](4);
        contractAddress[0] = smartVaultProxy;
        contractAddress[1] = regionInfrastructureProxy;
        contractAddress[2] = assetPurchaseProxy;
        contractAddress[3] = acquisitionGatewayProxy;

        address[] memory venturecoinAddress = new address[](6);
        venturecoinAddress[0] = globeProxy;
        venturecoinAddress[1] = bGGRIDProxy;
        venturecoinAddress[2] = tGMXProxy;
        venturecoinAddress[3] = tGUSAProxy;
        venturecoinAddress[4] = fFSProxy;
        venturecoinAddress[5] = fRSProxy;

        address[] memory stakeableAddresses = _getStakeables(smartVaultProxy);

        // --- 6. Post-Deployment Config (Example) ---

        // -- Ledger Address Load --- //
        console.log("Attempting to Update Ledger Addresses");
        GlobalLedger ledger = GlobalLedger(ledgerProxy);
        ledger.addToStableWhitelist(stablecoinAddresses);
        ledger.addToVentureWhitelist(venturecoinAddress);
        ledger.addToStakeableWhitelist(stakeableAddresses);
        ledger.addToAdminWhitelist(adminAddresses);
        ledger.addToContractWhitelist(contractAddress);

        // -- Vault Address Load --- //
        console.log("Attempting to Update Vault Addresses");
        SmartVault vault = SmartVault(smartVaultProxy);
        //Does block.timestamp match Typescripts in time and format at contract deployment "const now = Math.floor(Date.now() / 1000);"
        vault.addToStableWhitelist(stablecoinAddresses);
        vault.addToStakeableWhitelist(stakeableAddresses);
        vault.addToAdminWhitelist(adminAddresses);
        vault.initCalldates(block.timestamp, 0, 50);
        vault.initCalldates(block.timestamp, 50, 100);
        vault.initCalldates(block.timestamp, 100, 150);
        vault.initCalldates(block.timestamp, 150, 203);

        // --- Populate Values --- //
        console.log("Attempting to Update Vault Globals");
        vault.populateGlobals();

        // -- Region Address Load --- //
        console.log("Attempting to Update Region Addresses");
        RegionInfrastructure region = RegionInfrastructure(regionInfrastructureProxy);
        region.addToStableWhitelist(stablecoinAddresses);
        region.addToStakeableWhitelist(venturecoinAddress);
        region.addToAdminWhitelist(adminAddresses);
        //region.calldates(block.timestamp, 0, 109);

        // -- Acquisition Address Load --- //
        console.log("Attempting to Update Acquisition Addresses");
        AcquisitionGateway acquisition = AcquisitionGateway(acquisitionGatewayProxy);
        acquisition.addToStableWhitelist(stablecoinAddresses);
        acquisition.addToAdminWhitelist(adminAddresses);
        acquisition._populateGlobals();

        // -- Purchase Address Load --- //
        console.log("Attempting to Update Purchase Addresses");
        AssetPurchase commerce = AssetPurchase(assetPurchaseProxy);
        commerce.addToStableWhitelist(stablecoinAddresses);
        commerce.addToAdminWhitelist(adminAddresses);
        commerce._populateGlobals();

        vm.stopBroadcast();
    }

    function _getStakeables(address smartVaultProxy) internal returns(address[] memory) {
        // Single, explicit memory array instantiation
        address[] memory dividendAddresses = new address[](203);
        uint256 i = 0;

        for (uint256 middle = 2; middle <= 8; middle++) {
            uint256 maxDigit = middle + 24;
            for (uint256 fl = 1; fl <= maxDigit; fl++) {
                
                // Construct the name string: "Dividend121.sol:Dividend121"
                string memory contractName = string.concat(
                    "Dividend", vm.toString(fl), vm.toString(middle), vm.toString(fl)
                );
                string memory artifactPath = string.concat(contractName, ".sol:", contractName);
                string memory contractFileName = string.concat(contractName, ".sol");

                // Fetch contract creation bytecode securely from Foundry's environment
                bytes memory bytecode = abi.encodePacked(vm.getCode(artifactPath));
                address deployedAddr;
                
                assembly {
                    deployedAddr := create(0, add(bytecode, 0x20), mload(bytecode))
                }

                // Cleaned up with a custom error to save script size
                if (deployedAddr == address(0)) revert DeploymentFailed(contractName);

                address targetProxyAddress;

                if (!isUpgrade) {
                    // Fix: Dynamic string initialization payload built via encodeWithSignature
                    bytes memory initData = abi.encodeWithSignature(
                        "initialize(address,address)", 
                        deployer, 
                        smartVaultProxy
                    );

                    targetProxyAddress = Upgrades.deployUUPSProxy(
                        contractFileName,
                        initData
                    );
                } else {
                    // Fixed the naming collision here
                    // Note: Ensure "contractProxy" env variable is distinct per iteration if needed
                    address existingProxy = vm.envAddress("contractProxy");
                    Upgrades.upgradeProxy(existingProxy, contractFileName, "");
                    targetProxyAddress = existingProxy;
                }
                
                // Populating the correctly allocated variable array slot
                // (Decide whether you want to store the implementation 'deployedAddr' or the 'targetProxyAddress')
                dividendAddresses[i] = targetProxyAddress;

                i++;
                
                console.log(contractName, "Proxy at:", targetProxyAddress);
            }
        }

        return dividendAddresses;
    }

    function _getStablecoins(address gbdProxy, address copxProxy) internal pure returns (address[] memory) {
        address[] memory stable = new address[](22);
        stable[0] = 0x0000000000000000000000000000000000000000; //GBDo      0
        stable[1] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // USDC     1  
        stable[2] = 0x4A16BAf414b8e637Ed12019faD5Dd705735DB2e0; // QCAD     2
        stable[3] = 0x6B175474E89094C44Da98b954EedeAC495271d0F; // DAI      3
        stable[4] = 0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4; // agEUR    4
        stable[5] = 0x7d60F21072b585351dFd5E8b17109458D97ec120; // FDUSD    5
        stable[6] = 0x853d955aCEf822Db058eb8505911ED77F175b99e; // FRAX     6
        stable[7] = 0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB; // JPYC     7
        stable[8] = 0x95C2E7cbc7Ae370E28160Bd04297C53F96d092B4; // MMXN     8
        stable[9] = 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8; // PYUSD    9
        stable[10] = 0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96; // XSGD     10
        stable[11] = 0x0000000000085d4780B73119b644AE5ecd22b376; // TUSD     11
        stable[12] = 0x8E870D67F660D95d5be530380D0eC0bd388289E1; // USDP     12
        stable[13] = 0xdAC17F958D2ee523a2206206994597C13D831ec7; // USDT     13
        stable[14] = 0x4cCe605eD955295432958d8951D0B176C10720d5; // AUDD     14
        stable[15] = 0xb755506531786C8aC63B756BaB1ac387bACB0C04; // ZARP     15
        stable[16] = 0x8c6Fa66c21aE3fC435790E451946a9Ea82E6e523; // BRZ      16
        stable[17] = 0x86B4dBE5D203e634a12364C0e428fa242A3FbA98; // GBPT     17
        stable[18] = 0x6FAff971d9248e7d398A98FdBE6a81F6d7489568; // TRYX     18
        stable[19] = 0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c; // EURc     19
        stable[20] = copxProxy;                                  // COPx     21
        stable[21] = gbdProxy;                                    // GBDO     22
        //stable[] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; // WBTC     23
        //stable[] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH     24
        //stable[] = 0xB8c77482e45F1F44dE1745F52C74426C631bDD52; // BNB      25
        //stable[] = 0x00000000000000000000000000000000000000b0; //BTC       26
        //stable[] = 0x00000000000000000000000000000000000000E0; //ETH       27
        //stable[] = 0x00006100F7090010005F1bd7aE6122c3C2CF0090; // AUDT
        //stable[] = 0x05BBeD16620B352A7F889E23E3Cf427D1D379FFE; // NGNT
        //stable[] = 0xc71daC923823D748a86D0A3618ABdA2d6dCd6bf4; // INRX
        // ... add the rest
        return stable;
    }

    function _getPreAddr() internal pure returns (address[] memory) {
        address[] memory addrs = new address[](6);
        addrs[0] = 0x4E59dA805D602f8d651A60aFB1184959dB3580d8;
        addrs[1] = 0x17AE805B0A4e4D8a6Ed39C1889062cDeCC8C5857;
        addrs[2] = 0xDFb86551fCEfF6AE1Eca2681417A42E2A0cE5b0E;
        addrs[3] = 0xC095D00A3314a98e7F77ED043d0446Ac69563F43;
        addrs[4] = 0x1166579617240592e8a7C87bC389549eAB8de047;
        addrs[5] = 0x83cdcceAfEF3011C2f8f3D8279e971387BC38474;
        return addrs;
    }

    function _getPreFnd() internal pure returns (uint256[] memory) {
        uint256[] memory fnd = new uint256[](6);
        fnd[0] = 100000000000000000000 ether;
        fnd[1] = 100000000000000000000 ether;
        fnd[2] = 50000000000000 ether;
        fnd[3] = 50000000000000 ether;
        fnd[4] = 50000000000000 ether;
        fnd[5] = 50000000000000 ether;
        return fnd;
    }

    function _getAdminAddresses() internal view returns(address[] memory) {
        address[] memory adminAddresses = new address[](2);
        adminAddresses[0] = deployer;
        adminAddresses[1] = 0xb84753Ff376d8347f27ea669ad36f7E79F0c364E;
        return adminAddresses;
    }
}
