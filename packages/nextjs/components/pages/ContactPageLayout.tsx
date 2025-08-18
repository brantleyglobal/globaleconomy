"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import loadDynamic from "next/dynamic"; // Renamed to avoid conflict

// Dynamically import EmailModal to avoid SSR issues with Wagmi
const EmailModal = loadDynamic(() => import("~~/components/email/emailModal"), {
  ssr: false,
});


declare global {
  interface Window {
    chatwootSettings?: {
      hideMessageBubble?: boolean;
      locale?: string;
      position?: string;
      type?: string;
    };
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: {
      toggle: (state?: "open" | "close") => void;
    };
  }
}

export default function ContactLayout() {
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (document.getElementById("chatwoot-script")) return;

    window.chatwootSettings = {
      hideMessageBubble: true,
      locale: "en",
      position: "right",
      type: "standard",
    };

    const script = document.createElement("script");
    script.id = "chatwoot-script";
    script.src = "https://app.chatwoot.com/packs/js/sdk.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.chatwootSDK?.run({
        websiteToken: "rKRu9Zi6P5W8dn3juM9HZYNT",
        baseUrl: "https://app.chatwoot.com",
      });
    };

    return () => {
      const existingScript = document.getElementById("chatwoot-script");
      if (existingScript) existingScript.remove();
      window.$chatwoot?.toggle("close");
      delete window.chatwootSDK;
      delete window.$chatwoot;
      delete window.chatwootSettings;
    };
  }, []);

  return (
    <main className="bg-black text-white min-h-screen px-6 py-14 font-sans">
      {/* Title Section */}
      <section className="text-center mb-14">
        <h1 className="text-5xl font-light tracking-wide mb-4">YOUR SUPPORT</h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          For answers, support, or to collaborate—choose chat or email.
        </p>
      </section>

      {/* Contact Cards */}
      <section className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* 🔹 Live Chat */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => window.$chatwoot?.toggle()}
          className="bg-white/20 rounded-xl h-72 px-8 py-6 shadow-md hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] transition cursor-pointer flex flex-col justify-between"
        >
          <div>
            <h2 className="text-3xl font-light text-white mb-10">LIVE CHAT</h2>
            <p className="text-lg text-white">
              Connect instantly with support or an AI assistant.
            </p>
          </div>
          <p className="text-xs text-gray-500 text-right">Tap to open chat</p>
        </div>

        {/* Email Form */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowEmailModal(true)}
          className="bg-white/20 rounded-xl h-72 px-8 py-6 shadow-md hover:shadow-xl hover:bg-secondary/30 hover:scale-[1.02] transition cursor-pointer flex flex-col justify-between"
        >
          <div>
            <h2 className="text-3xl font-light text-white mb-10">EMAIL</h2>
            <p className="text-lg text-gray-300">
              Fill out a short form—responses usually arrive within 24 hours.
            </p>
          </div>
          <p className="text-xs text-gray-500 text-right">Tap to open form</p>
        </div>
      </section>

      {/* Modal: Email Form */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </main>
  );
}
