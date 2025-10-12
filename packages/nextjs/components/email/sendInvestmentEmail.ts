import { Token } from "~~/components/constants/tokens";

interface Attachment {
  filename: string;
  content: string; // base64 encoded data
  content_type?: string; // e.g., "application/pdf"
}

interface Summary {
  unlockLabel: string;
  eligibilityLabel: string;
  multiplier: number;
}

interface SendInvestmentParams {
  templateType: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  connectedWallet: string;
  tokenSymbol: string;
  amount: string;
  committedQuarters: number;
  unlockLabel: string;
  eligibilityLabel: string;
  multiplier: number;
  receipt: string;
}

export async function sendInvestmentConfirmation({
  templateType,
  userEmail,
  userFirstName,
  userLastName,
  connectedWallet,
  tokenSymbol,
  amount,
  committedQuarters,
  unlockLabel,
  eligibilityLabel,
  multiplier,
  receipt,
}: SendInvestmentParams): Promise<any> {
  const payload = {
    jsonrpc: "2.0",
    method: "sendEmail",
    id: 1,
    params: {
      templateType,
      email: userEmail,
      firstname: userFirstName || "",
      lastname: userLastName || "",
      userAddress: connectedWallet,
      receipt: receipt || "",
      tokenSymbol,
      totalTokenAmount: parseFloat(amount).toFixed(2),
      committedQuarters,
      unlockLabel,
      eligibilityLabel,
      multiplier,
    },
  };

    try {
    const response = await fetch("https://email.brantley-global.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Email API returned error:", result);
      throw new Error(result?.error?.message || "Failed to send email");
    }

    return result;
  } catch (error) {
    console.error("Email dispatch error:", error);
    throw error;
  }

}