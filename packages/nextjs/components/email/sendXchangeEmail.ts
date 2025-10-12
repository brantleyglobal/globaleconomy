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

interface SendSwapParams {
  templateType: string;
  userEmail: string;
  userFirstName: string;
  userLastName: string;
  userEmail2: string;
  userFirstName2?: string;
  userLastName2?: string;
  asset?: Token;
  asset2?: Token;
  serviceToken?: Token;
  xchangeId?: string;
  amount?: string;
  amount2?: string;
  recipient: string;
  recipient2?: string;
  refund: boolean;
  newContract: boolean;
  receipt: string;
}

export async function sendXchangeConfirmation({
  templateType,
  userEmail,
  userFirstName,
  userLastName,
  userEmail2,
  userFirstName2,
  userLastName2,
  asset,
  asset2,
  serviceToken,
  xchangeId,
  amount,
  amount2,
  recipient,
  recipient2,
  refund,
  newContract,
  receipt,
}: SendSwapParams): Promise<any> {
  const payload = {
    jsonrpc: "2.0",
    method: "sendEmail",
    id: 1,
    params: {
      templateType,
      email: userEmail || "",
      firstname: userFirstName || "",
      lastname: userLastName || "",
      email2: userEmail2 || "",
      firstname2: userFirstName2 || "",
      lastname2: userLastName2 || "",
      recipient: recipient || "",
      receipt2: recipient2 || "",
      tokenSymbol: asset?.symbol || "",
      tokenSymbol2: asset2?.symbol || "",
      serviceToken: serviceToken?.symbol || "",
      xchangeId: xchangeId || "",
      totalTokenAmount: amount ? parseFloat(amount).toFixed(2) : "0.00",
      totalTokenAmount2: amount2 ? parseFloat(amount2).toFixed(2) : "0.00",
      recipientAddress: recipient || "",
      recipientAddress2: recipient2 || "",
      refund: refund || false,
      newContract: newContract || false,
      receipt,
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
      throw new Error(result?.error?.message || "Failed to send email");
    }

    return result;
  } catch (error) {
    console.error("Email dispatch error:", error);
    throw error;
  }
}
