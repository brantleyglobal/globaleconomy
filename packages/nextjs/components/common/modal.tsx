"use client";
//components/common/modal.tsx
import React from "react";

export interface ModalProps {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  children,
  onClose,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 sm:px-0"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-base-100 rounded-xl shadow-lg w-full max-w-md sm:max-w-lg p-6 relative overflow-y-auto max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-3 btn btn-sm btn-ghost border-none outline-none text-lg text-info hover:bg-base-300"
          aria-label="Close Modal"
        >
          &times;
        </button>

        {/* Title */}
        {title && (
          <h3 className="text-lg font-light mb-4 text-primary text-center sm:text-left">
            {title}
          </h3>
        )}

        {/* Content */}
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
};
