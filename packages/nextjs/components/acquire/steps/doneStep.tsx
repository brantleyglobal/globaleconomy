import React from "react";

type Props = {
  onClose: () => void;
};

export const DoneStep: React.FC<Props> = ({ onClose }) => (
  <div className="flex flex-col items-center justify-center h-full max-h-screen p-6 bg-white/5 rounded-lg shadow-md text-center">
    <h3 className="text-2xl font-light text-white mb-4">Investment Accepted</h3>
    <p className="text-gray-700 mb-2">View Transaction Details The Dashboard.</p>
    <a
      href="/dashboard"
      className="inline-block mt-4 px-5 py-2 bg-white/15 text-white font-medium rounded hover:bg-secondary/30 transition"
    >
      Go to Dashboard
    </a>
  </div>
);
