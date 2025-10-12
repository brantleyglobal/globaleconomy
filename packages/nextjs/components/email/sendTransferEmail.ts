import { Token } from "~~/components/constants/tokens";

interface Attachment {
  filename: string;
  content: string; // base64 encoded data
  content_type?: string; // e.g., "application/pdf"
}

interface SendInvestmentParams {
  templateType: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  connectedWallet: string;
  recipient: string;
  tokenSymbol: string;
  amount: string;
  receipt: string;
}

export async function sendTransferConfirmation({
  templateType,
  userEmail,
  userFirstName,
  userLastName,
  connectedWallet,
  recipient,
  tokenSymbol,
  amount,
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
      recipient: recipient || "",
      tokenSymbol,
      totalTokenAmount: parseFloat(amount).toFixed(2),
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