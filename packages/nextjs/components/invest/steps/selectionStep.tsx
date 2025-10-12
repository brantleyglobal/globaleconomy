import React from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type Props = {
  userAction: "term" | "region" | "speculative" | null;
  setUserAction: (value: "term" | "region" | "speculative" | null) => void;
  onHelpToggle: () => void;
  onNext: () => void;
};

export default function SelectionStep({ userAction, setUserAction, onHelpToggle, onNext }: Props) {
  return (
    <>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-light text-primary">XCHANGE SELECTION</h3>
          <button
            onClick={onHelpToggle}
            aria-label="Toggle help"
            className="text-primary hover:text-secondary flex items-center gap-1"
          >
            <HelpOutlineIcon />
            
          </button>
        </div>

        {/* SPECULATIVE */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "speculative"}
            onClick={() => setUserAction("speculative")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("speculative") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "speculative" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">SPECULATIVE INVESTING</h4>
            <p className="text-xs text-white text-justify">
              Simple currency trading against popular trading pairs. Clean, intuitive, discrete. Connect your wallet and take risks at your pace.
            </p>
        </div>

        {/* TERM */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "term"}
            onClick={() => setUserAction("term")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("term") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "term" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">TERM INVESTING</h4>
            <p className="text-xs text-white text-justify">
              Deposit any amount. Selecte a term. Each token credits dividends quarterly until maturity. After maturity your deposited amount and earned dvidends are returned less transaction fees.
            </p>
        </div>

        {/* REGION */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "region"}
            onClick={() => setUserAction("region")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("region") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "region" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">REGIONAL INVESTING</h4>
            <p className="text-xs text-white text-justify">
              Regional Venture assets are tied to projects within a specific country. Investments are allocated for the region selected in exchange for tradeable & redeemable tokens.
            </p>
        </div>

        {/* Footer */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 py-4 border-t bg-transparent w-full">
            <button className="invisible btn btn-primary/15 btn-sm h-8 text-xs rounded-md px-6" aria-hidden="true">
                Previous
            </button>
            <button
                className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
                onClick={onNext}
                disabled={!userAction}
            >
                Next
            </button>
            </div>
        </div>
    </>
  );
}
