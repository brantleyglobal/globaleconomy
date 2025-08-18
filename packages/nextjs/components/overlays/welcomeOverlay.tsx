"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export const WelcomeOverlay = () => {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (dismissed) return null;

  return (
    <div
      className="fixed inset-0 z-10 bg-black/60 flex flex-col items-center justify-start text-white text-center pt-10 px-4 cursor-pointer"
      onClick={() => setDismissed(true)}
    >
      <h1 className="text-4xl font-light mb-4">The Energy Marketplace</h1>
      <p className="text-sm text-gray-300 max-w-lg mb-6">
        Explore sustainable assets, blockchain-powered returns, and composable products built for the future.
      </p>

      {/* Tap to explore */}
      <p
        onClick={() => router.push("/storefront")}
        className="text-sm text-secondary underline hover:text-white transition mb-6"
      >
        Tap to explore storefront →
      </p>

      {/* Dashboard cue with arrow */}
      <div className="absolute top-[35px] left-[225px] flex flex-col items-center text-gray-400 text-[10px] font-light pointer-events-none">
        <svg
          className="w-5 h-5 text-secondary animate-bounce rotate-[135deg] mb-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
        <span>Dashboard toggle</span>
      </div>
    </div>
  );
};
