import React from "react";
import { Token } from "~~/components/constants/tokens";
import { Address } from "~~/components/globalDEX";

export const TransferSummary = ({
  from,
  to,
  token,
  amount,
}: {
  from?: `0x${string}`;
  to?: `0x${string}`;
  token: Token;
  amount: string;
}) => {
  if (!from || !to || !amount) return null;

  return (
    <div className="border border-base-300 p-3 rounded space-y-2 text-sm">
      <p>
        <span className="font-bold">From:</span> <Address address={from} />
      </p>
      <p>
        <span className="font-bold">To:</span> <Address address={to} />
      </p>
      <p>
        <span className="font-bold">Amount:</span>{" "}
        {Number(amount).toLocaleString()} {token.symbol}
      </p>
    </div>
  );
};
