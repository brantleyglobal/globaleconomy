// components/email/sendPurchaseEmail.ts

import { BigNumber } from "ethers"; // or wherever your BigNumber comes from

export interface Attachment {
  filename: string;
  content: string; // base64 encoded data
  content_type?: string; // e.g., "application/pdf"
}

export async function sendPurchaseEmail({
  firstname,
  lastname,
  email,
  tx,
  checkoutAsset,
  quantity,
  totalTokenAmount,
  userAddress,
  tokenSymbol,
  configuration,
  address,
  phone,
  country,
  postalCode,
  receipt,
  purchaseMadeEvents,
}: {
  firstname: string;
  lastname: string;
  email: string;
  tx: any;
  checkoutAsset: any;
  quantity: number;
  totalTokenAmount: string;
  userAddress: string;
  tokenSymbol: string;
  configuration: string;
  address: string;
  phone: string;
  country: string;
  postalCode: string;
  receipt: any;
  purchaseMadeEvents: any[];
}) {
  function sanitizeBigInts(obj: any): any {
    if (typeof obj === "bigint") return obj.toString();
    if (Array.isArray(obj)) return obj.map(sanitizeBigInts);
    if (obj && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, sanitizeBigInts(value)])
      );
    }
    return obj;
  }

  const payload = {
    jsonrpc: "2.0",
    method: "sendEmail",
    params: {
      firstname,
      lastname,
      email,
      tx,
      checkoutAsset,
      quantity,
      totalTokenAmount,
      userAddress,
      tokenSymbol,
      configuration,
      address,
      phone,
      country,
      postalCode,
      receipt,
      purchaseMadeEvents,
    },
    id: Date.now(),
  };

  try {
    const res = await fetch("https://email.brantley-global.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEXT_PUBLIC_API_SECRET!,
      },
      body: JSON.stringify(sanitizeBigInts(payload)),
    });

    if (!res.ok) throw new Error("Email sending failed");
    console.log("Email notification sent.");
  } catch (emailError) {
    console.error("Failed to send email notification:", emailError);
  }
}