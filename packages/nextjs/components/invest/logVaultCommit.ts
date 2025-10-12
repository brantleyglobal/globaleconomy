interface VaultPayload {
  txhash: string;
  contractaddress: string;
  useraddress: string;
  depositamount: string;
  committedquarters: number;
  paymentmethod: string;
  depositstarttime: string;
  ispending: number;
  isclosed: number;
  status: string;
  chainstatus: boolean;
  queuedat: string;
  processedat: string | null;
  priority: number;
  retrycount: number;
  receipthash: string;
  notes: string;
  timestamp: string;
}

export async function logVaultCommit(payload: VaultPayload): Promise<boolean> {
  try {
    const res = await fetch("https://gateway.brantley-global.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "vault",
        method: "vaultCommit",
        params: payload,
      }),
    });

    const contentType = res.headers.get("Content-Type") ?? "";
    if (res.ok && contentType.includes("application/json")) {
      await res.json();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Logging vault commit failed:", error);
    return false;
  }
}
