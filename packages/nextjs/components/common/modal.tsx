// components/common/modal.tsx
"use client";
import React from "react";

export interface ModalProps {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  /** whether the modal is visible */
  isOpen: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  children,
  onClose,
  isOpen,
}) => {
  // Don’t render anything if closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-base-100 rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 text-xl"
          aria-label="Close Modal"
        >
          &times;
        </button>
        {title && (
          <h3 className="text-lg font-semibold mb-4 text-primary">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
};
