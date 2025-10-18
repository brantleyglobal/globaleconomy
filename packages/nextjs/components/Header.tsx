"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/globalEco";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/globalEco";
import { Modal } from "~~/components/common/modal";
import { DividendRedeemModal } from "~~/components/dividend/redemptionWidget";
import { GlobalXchangeModal } from "~~/components/xchange/xchangeWidget";
import { Faucet } from "~~/components/transfer/Faucet";
import { InvestmentModal } from "~~/components/invest/investmentModal";
import { GlobalWalletModal } from "~~/components/globalEco/RainbowKitCustomConnectButton/globalWalletConnect";
import MirrorModeToggle from "~~/components/common/mirrorToggle";
import dynamic from "next/dynamic";

// Hook to detect mobile viewport
function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

const menuLinks = [
  { label: "ABOUT", href: "/about" },
  { label: "ENERGY ORDER", href: "/energy-order" },
  { label: "WHITEPAPER", href: "/whitepaper" },
  { label: "HELP", href: "/help" },
];

export const Header = () => {
  const pathname = usePathname();
  const { targetNetwork } = useTargetNetwork();
  const isDashboard = pathname?.startsWith("/dashboard") || pathname === "/";
  const isMobile = useIsMobile();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalState, setModalState] = useState({
    swap: false,
    faucet: false,
    wallet: false,
    redeem: false,
    invest: false,
  });

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(mobileMenuRef, () => setMobileMenuOpen(false));

  // Auto close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Mobile wallet connect simplified button
  const openMobileWalletModal = () => setModalState(s => ({ ...s, wallet: true }));

  return (
    <>
      <header className="sticky top-0 z-50 bg-black shadow-md shadow-white/10">
        <nav className="relative flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <div className="flex items-center gap-4 list-none">
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
          <div className="relative flex items-center gap-4">
            {/* Conditionally render different wallet connect UI based on mobile or desktop */}
            {isMobile ? (
              // Mobile simple wallet connect button
              <button
                onClick={openMobileWalletModal}
                className="bg-transparent px-12 py-2 rounded text-white left-0 text-xs font-light hover:bg-secondary/20 transition"
              >
                CONNECT WALLET
              </button>
            ) : (
              // Desktop RainbowKit connect button
              <RainbowKitCustomConnectButton />
            )}

            {/* Desktop Action Buttons + Page Links */}
            <div className="hidden lg:flex gap-4 text-xs font-light items-center">
              <button
                onClick={() => setModalState(s => ({ ...s, swap: true }))}
                className="text-white hover:text-primary transition"
              >
                ASSETXCHANGE
              </button>
              <button
                onClick={() => setModalState(s => ({ ...s, redeem: true }))}
                className="text-white hover:text-primary transition"
              >
                REDEMPTIONS
              </button>
              <button
                onClick={() => setModalState(s => ({ ...s, faucet: true }))}
                className="text-white hover:text-primary transition"
              >
                TRANSFER
              </button>
              <button
                onClick={() => setModalState(s => ({ ...s, invest: true }))}
                className="text-white hover:text-primary transition"
              >
                INVEST
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
              <button
                onClick={() => setModalState(s => ({ ...s, invest: true }))}
                className="text-white hover:text-primary transition"
              >
                INVEST
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden text-white absolute right-0 top-1/2 -translate-y-1/2 z-50"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-9 w-9 p-2" />
              ) : (
                <Bars3Icon className="h-9 w-9 p-2" />
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
                  className="w-full text-left py-1 px-6 hover:text-primary transition"
                >
                  ASSETXCHANGE
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setModalState(s => ({ ...s, redeem: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 px-6 hover:text-primary transition"
                >
                  REDEMPTIONS
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setModalState(s => ({ ...s, faucet: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 px-6 hover:text-primary transition"
                >
                  TRANSFER
                </button>
              </li>
              {menuLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`block py-1 px-6 hover:text-primary transition ${
                      pathname === href ? "text-primary font-medium" : ""
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => {
                    setModalState(s => ({ ...s, invest: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 px-6 hover:text-primary transition"
                >
                  INVEST
                </button>
              </li>
            </ul>
          </div>
        )}
      </header>

      {/* Modals */}
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
      <Modal
        isOpen={modalState.redeem}
        onClose={() => setModalState(s => ({ ...s, redeem: false }))}
      >
        <DividendRedeemModal openWalletModal={() => setModalState({ ...modalState, wallet: true })} />
      </Modal>
      <Modal
        isOpen={modalState.swap}
        onClose={() => setModalState(s => ({ ...s, swap: false }))}
      >
        <GlobalXchangeModal
          isOpen={modalState.swap}         // boolean: whether modal is open
          onClose={() => setModalState(s => ({ ...s, swap: false }))}  // fn to close modal
          openWalletModal={() => setModalState(s => ({ ...s, wallet: true }))}  // fn to open wallet modal
        />
      </Modal>

      <InvestmentModal
        isOpen={modalState.invest}
        onClose={() => setModalState(s => ({ ...s, invest: false }))}
      />

    </>
  );
};
