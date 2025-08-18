// lib/getUserQueryHub.ts
import { getContract, PublicClient } from 'viem';
import { abi as userQueryHubAbi } from "./abi/UserQueryHub.json";
import deployments from '../../../hardhat/deployments.json';

export function getUserQueryHub(client: PublicClient) {
  const address = deployments.UserQueryHub;
  if (!address) {
    throw new Error('UserQueryHub address missing in deployments.json');
  }

  return getContract({
    address: address as `0x${string}`,
    abi: userQueryHubAbi,
    client,
  });
}
