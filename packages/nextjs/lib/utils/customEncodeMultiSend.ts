import { Interface } from '@ethersproject/abi';
import { solidityPack } from 'ethers/lib/utils';

type EncodableTx = {
  to: string;
  value: string;
  data: string;
};

function encodeSingleTx(tx: EncodableTx): string {
  return solidityPack(
    ["uint8", "address", "uint256", "uint256", "bytes"],
    [0, tx.to, tx.value, 0, tx.data]
  );
}

export function customEncodeMultiSend(txs: EncodableTx[]): string {
  const concatenated = txs.map(encodeSingleTx).join("");
  const multiSendIface = new Interface(["function multiSend(bytes)"]);
  return multiSendIface.encodeFunctionData("multiSend", [concatenated]);
}
