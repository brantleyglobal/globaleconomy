import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type Props = {
  onClose: () => void;
  xchangeId?: string;
};

export const DoneStep: React.FC<Props> = ({ onClose, xchangeId }) => {
  // Copy to clipboard handler
  const copyToClipboard = () => {
    if (xchangeId) {
      navigator.clipboard.writeText(xchangeId);
      //alert("Xchange ID copied to clipboard!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 bg-white/5 rounded-lg shadow-md text-center overflow-y-auto">
      <h3 className="text-xl font-light text-primary mb-4">ASSETEXCHANGE COMPLETE</h3>
      {xchangeId && (
        <div className="mb-4">
          <label className="block mb-1 text-white font-light">Your Xchange ID:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={xchangeId}
              className="w-full px-2 py-1 rounded bg-white/10 text-white font-mono select-all"
            />
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-2 py-1 bg-white/10 hover:bg-secondary/10 text-white text-xs rounded-md transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-none"
              aria-label="Copy Xchange ID"
            >
              <ContentCopyIcon className="h-2 w-2" />
            </button>
          </div>
        </div>
      )}
      <p className="text-gray-700 mb-2">
        View Transaction Details The Dashboard.
      </p>
      <a
        href="/dashboard"
        className="inline-block mt-4 px-5 py-2 bg-white/15 text-white font-medium rounded hover:bg-secondary/30 transition"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
