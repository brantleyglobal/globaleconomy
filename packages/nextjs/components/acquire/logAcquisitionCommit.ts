interface AcquisitionPayload {
  txhash: string;
  contractaddress: string;
  useraddress: string;
  exchangerate: string;
  amountin: string;
  amountout: string;
  paymentmethod: string;
  status: string;
  chainstatus: boolean;
  processedat: string | null;
  receipthash: string;
  notes: string;
  timestamp: string;
}

export async function logAcquisitionCommit(payload: AcquisitionPayload): Promise<boolean> {
  try {
    const res = await fetch("https://gateway.brantley-global.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "acquisition",
        method: "acquisitionCommit",
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
    console.error("Logging acquisition commit failed:", error);
    return false;
  }
}
