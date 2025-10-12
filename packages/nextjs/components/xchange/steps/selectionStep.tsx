import React from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type Props = {
  userAction: "refund" | "deposit" | "newContract" | null;
  setUserAction: (value: "refund" | "deposit" | "newContract" | null) => void;
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

        {/* NEW CONTRACT */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "newContract"}
            onClick={() => setUserAction("newContract")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("newContract") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "newContract" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">NEW CONTRACT</h4>
            <p className="text-xs text-white text-justify">
              Create a new AssetXchange Contract. All party details are required. Address details must be correct or the contract will fail deposits. To deposit after contract creation the user's connected wallet must match the Initiant's address.
            </p>
        </div>

        {/* DEPOSIT */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "deposit"}
            onClick={() => setUserAction("deposit")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("deposit") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "deposit" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">DEPOSIT</h4>
            <p className="text-xs text-white text-justify">
              Deposit funds into an existing AssetXchange Contract. You "must" be connected to the address supplied at contract creation. Exact details must be supplied and can be found your contract creation email confirmation.
            </p>
        </div>

        {/* REFUND */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "refund"}
            onClick={() => setUserAction("refund")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("refund") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "refund" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">REFUND</h4>
            <p className="text-xs text-white text-justify">
              Refund of deposited funds into an existing AssetXchange Contract. You "must" be connected to the address supplied at contract creation. Exact details must be supplied and can be found your contract creation email confirmation.
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
