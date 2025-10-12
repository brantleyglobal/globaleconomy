import { keccak256, defaultAbiCoder } from "ethers/lib/utils";
import { UserOperationStruct }from "@account-abstraction/contracts"

export function getUserOpHash(userOp: UserOperationStruct, entryPointAddress: string, chainId: number): string {
  const encoded = defaultAbiCoder.encode(
    [
      "address", "uint256", "bytes", "bytes", "uint256", "uint256", "uint256",
      "uint256", "uint256", "bytes", "bytes"
    ],
    [
      userOp.sender,
      userOp.nonce,
      userOp.initCode,
      userOp.callData,
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      userOp.paymasterAndData,
      "0x" // placeholder for signature
    ]
  );

  const userOpHash = keccak256(encoded);
  const finalHash = keccak256(
    defaultAbiCoder.encode(["bytes32", "address", "uint256"], [userOpHash, entryPointAddress, chainId])
  );

  return finalHash;
}
