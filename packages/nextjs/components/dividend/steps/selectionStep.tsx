import React from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type Props = {
  userAction: "addressChange" | "tokenChange" | "redemption" | null;
  setUserAction: (value: "addressChange" |  "tokenChange" | "redemption" | null) => void;
  onHelpToggle: () => void;
  onNext: () => void;
};

export default function SelectionStep({ userAction, setUserAction, onHelpToggle, onNext }: Props) {
  return (
    <>
      <div className="flex flex-col flex-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-light text-primary">REDEMPTION PROCESSING</h3>
          <button
            onClick={onHelpToggle}
            aria-label="Toggle help"
            className="text-primary hover:text-secondary flex items-center gap-1"
          >
            <HelpOutlineIcon />
            
          </button>
        </div>
        {/* REDEMPTION */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "redemption"}
            onClick={() => setUserAction("redemption")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("redemption") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 mb-4 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "redemption" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">PROCESS PREDEMPTION</h4>
            <p className="text-xs text-white text-justify">
              Process you dividend claim from your existing investment deposit.
            </p>
        </div>

        {/* ADDRESS CHANGE */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "addressChange"}
            onClick={() => setUserAction("addressChange")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("addressChange") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 mb-4 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "addressChange" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">CHANGE PAYOUT WALLET ADDRESS</h4>
            <p className="text-xs text-white text-justify">
              Change Your Payout Address.
            </p>
        </div>

        {/* PAYOUT TOKEN CHANGE */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "tokenChange"}
            onClick={() => setUserAction("tokenChange")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("tokenChange") }}
            className={`cursor-pointer max-h-[300px] justify-between overflow-y-auto shadow-md bg-primary/5 mb-4 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "tokenChange" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">CHANGE PAYOUT TOKEN</h4>
            <p className="text-xs text-white text-justify">
              Change Your Payout Token.
            </p>
        </div>

        {/* Footer */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row justify-center sm:justify-end items-center gap-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4 border-t bg-transparent w-full">
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
      </div>
    </>
  );
}
