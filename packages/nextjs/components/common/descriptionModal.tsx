"use client";

import React, { useEffect } from "react";

type ModalProps = {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export const Modal = ({ title, onClose, children }: ModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-transparent bg-opacity-10 backdrop-blur-sm">
      <div className="bg-base-100 w-full max-w-md max-h-[90vh] rounded-lg shadow-xl border border-base-300 p-4 overflow-hidden relative animate-fadeIn">
        <div className="flex justify-between items-center mb-2">
          {title && <h3 className="text-lg font-semibold text-info">{title}</h3>}
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost text-lg text-info hover:bg-base-300"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto max-h-[70vh] pr-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
