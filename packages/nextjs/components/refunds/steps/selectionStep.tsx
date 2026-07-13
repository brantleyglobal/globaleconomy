import React from "react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type Props = {
  userAction: "refund" | "repair" | null;
  setUserAction: (value: "refund" | "repair" | null) => void;
  onHelpToggle: () => void;
  onNext: () => void;
};

export default function SelectionStep({ userAction, setUserAction, onHelpToggle, onNext }: Props) {
  return (
    <>
      <div className="flex flex-col flex-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-light text-primary">INVESTMENT SELECTION</h3>
          <button
            onClick={onHelpToggle}
            aria-label="Toggle help"
            className="text-primary hover:text-secondary flex items-center gap-1"
          >
            <HelpOutlineIcon />
            
          </button>
        </div>

        {/* REFUND */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "refund"}
            onClick={() => setUserAction("refund")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("refund") }}
            className={`cursor-pointer max-h-[300px] justify-between shadow-md bg-primary/5 mb-4 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "refund" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">REFUND</h4>
            <p className="text-xs text-white text-justify">
              Request a refund for an existing unit or transaction. Subject to refunds & Conditions and Return Policy
            </p>
        </div>

        {/* REPAIRS */}
        <div
            role="tab"
            tabIndex={0}
            aria-selected={userAction === "repair"}
            onClick={() => setUserAction("repair")}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setUserAction("repair") }}
            className={`cursor-pointer max-h-[300px] justify-between shadow-md bg-primary/5 mb-4 hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] rounded-lg p-4 ${userAction === "repair" ? "bg-secondary/30" : "bg-black/40"}`}
        >
            <h4 className="text-md font-light mt-2 text-white">SYSTEM REPAIR</h4>
            <p className="text-xs text-white text-justify">
              Request a repair for your system. Your shipping is covered.
            </p>
        </div>

        {/* Footer */}
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
    </>
  );
}
