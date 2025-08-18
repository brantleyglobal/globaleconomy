"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/globalEco";
import { Modal } from "~~/components/common/modal";
import InlineSwapWidget from "~~/components/swap/inlineSwapWidget";
import { Faucet } from "~~/components/transfer/Faucet";
import { GlobalWalletModal } from "~~/components/globalEco/RainbowKitCustomConnectButton/globalWalletConnect";
import MirrorModeToggle from "~~/components/common/mirrorToggle";

const menuLinks = [
  { label: "ABOUT", href: "/about" },
  { label: "WHITEPAPER", href: "/whitepaper" },
  { label: "HELP", href: "/help" },
];

export const Header = () => {
  const pathname = usePathname();
  const { targetNetwork } = useTargetNetwork();
  const isDashboard = pathname?.startsWith("/dashboard") || pathname === "/";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalState, setModalState] = useState({
    swap: false,
    faucet: false,
    wallet: false,
  });

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(mobileMenuRef, () => setMobileMenuOpen(false));

  return (
    <>
      <header className="sticky top-0 z-50 bg-black shadow-md shadow-white/10">
        <nav className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href={isDashboard ? "/dashboard" : "/"}>
              <div className="relative w-10 h-10">
                <Image alt="SE2 logo" fill src="/logo.png" className="cursor-pointer" />
              </div>
            </Link>

            {/* Desktop Nav (left side) */}
            <ul className="hidden lg:flex items-center gap-4 text-xs font-light">
              <MirrorModeToggle />
            </ul>
          </div>

          {/* Right: Actions + Page Links */}
          <div className="flex items-center gap-4">
            <RainbowKitCustomConnectButton />

            {/* Desktop Action Buttons + Page Links */}
            <div className="hidden lg:flex gap-4 text-xs font-light items-center">
              <button
                onClick={() => setModalState(s => ({ ...s, swap: true }))}
                className="text-white hover:text-primary transition"
              >
                EXCHANGE
              </button>
              <button
                onClick={() => setModalState(s => ({ ...s, faucet: true }))}
                className="text-white hover:text-primary transition"
              >
                TRANSFER
              </button>
              {menuLinks.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={`hover:text-primary transition ${
                    pathname === href ? "text-primary font-medium" : "text-white"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(prev => !prev)}
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div ref={mobileMenuRef} className="lg:hidden px-4 pb-4">
            <ul className="flex flex-col gap-3 text-sm font-light text-white">
              <MirrorModeToggle />
              <li>
                <button
                  onClick={() => {
                    setModalState(s => ({ ...s, swap: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 hover:text-primary transition"
                >
                  EXCHANGE
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setModalState(s => ({ ...s, faucet: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 hover:text-primary transition"
                >
                  TRANSFER
                </button>
              </li>
              {menuLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block py-1 hover:text-primary transition ${
                      pathname === href ? "text-primary font-medium" : ""
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* Modals */}
      <Modal
        isOpen={modalState.swap}
        onClose={() => setModalState(s => ({ ...s, swap: false }))}
      >
        <InlineSwapWidget openWalletModal={() => setModalState({ ...modalState, wallet: true })} />
      </Modal>

      <Modal
        isOpen={modalState.faucet}
        onClose={() => setModalState(s => ({ ...s, faucet: false }))}
      >
        <Faucet openWalletModal={() => setModalState({ ...modalState, wallet: true })} />
      </Modal>

      <GlobalWalletModal
        isOpen={modalState.wallet}
        onClose={() => setModalState(s => ({ ...s, wallet: false }))}
      />
    </>
  );
};
