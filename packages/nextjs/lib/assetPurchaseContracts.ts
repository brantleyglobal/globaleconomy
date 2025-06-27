import { ethers } from "ethers";
import deployments from "../../hardhat/deployments.json";

import GATEWAY_ABI from "../../hardhat/artifacts/contracts/stableSwapGateway.sol/StableSwapGateway.json";
import WGBD_ABI from "../../hardhat/artifacts/contracts/WGBD.sol/WETH9.json";

export function getContracts(signer: ethers.Signer) {
  return {
    wgbd: new ethers.Contract(deployments.WGBD, WGBD_ABI.abi, signer),
    gateway: new ethers.Contract(deployments.StableSwapGateway, GATEWAY_ABI.abi, signer),
  };
}
