interface SendReconciliationParams {
  apiKey: string;
  to: string;
  amount: string;         // amount as string (BigNumber string)
  tokenAddress: string;
  chain: string;
}

export async function sendReconciliation({
  apiKey,
  to,
  amount,
  tokenAddress,
  chain,
}: SendReconciliationParams): Promise<{ txHash: string; blockNumber: number; status: string }> {
  const apiUrl = "https://reconciliations.brantley-global.com";

  if (!to || !amount || !tokenAddress || !chain) {
    throw new Error("Missing required parameters");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendReconciliation",
      params: {
        to,
        amount,
        tokenAddress,
        chain,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(`API error: ${result.error.message}`);
  }

  return result.result; // typed as { txHash, blockNumber, status }
}
