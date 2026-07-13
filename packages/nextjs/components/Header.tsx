"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { WalletConnectButton } from "~~/utils/globalEco/walletConnectButton";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/globalEco";
import { Modal } from "~~/components/common/modal";
import { DividendRedeemModal } from "~~/components/dividend/redemptionWidget";
import { GlobalXchangeModal } from "~~/components/xchange/xchangeWidget";
import { Faucet } from "~~/components/transfer/Faucet";
import { RefundRepairModal } from "~~/components/refunds/RefundRepairModal";
import { InvestmentModal } from "~~/components/invest/investmentModal";
import { AcquireModal } from "~~/components/acquire/acquireModal";
import MirrorModeToggle from "~~/components/common/mirrorToggle";
import { useAccount } from "wagmi";
import { useAutoAddTokens } from "~~/lib/symbolHelper";

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
  { label: "PLANNED DEVELOPMENTS", href: "/developments" },
  { label: "WHITEPAPER", href: "/whitepaper" },
  { label: "VERIFCATIONS", href: "/verification" },
  { label: "DOWNLOADS", href: "/downloads" },
  { label: "HELP", href: "/help" },
];

export const Header = () => {
  useAutoAddTokens();
  const pathname = usePathname();
  const { targetNetwork } = useTargetNetwork();
  const isDashboard = pathname?.startsWith("/dashboard") || pathname === "/";
  const isMobile = useIsMobile();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalState, setModalState] = useState({
    swap: false,
    faucet: false,
    refund: false,
    wallet: false,
    redeem: false,
    invest: false,
    acquire: false
  });

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(mobileMenuRef, () => setMobileMenuOpen(false));

  // Auto close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Mobile wallet connect simplified button
  const openMobileWalletModal = () => setModalState(s => ({ ...s, wallet: true }));

  const { isConnected, address } = useAccount();

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

          {/* Center: Wallet Button */}
          <div className="flex-1 flex justify-center">
            <WalletConnectButton />
          </div>

          {/* Right: Actions + Page Links */}
          <div className="relative flex items-center gap-4">
            <div className="hidden lg:flex gap-4 text-xs font-light items-center">
              <button
                onClick={() => setModalState(s => ({ ...s, acquire: true }))}
                className="text-white hover:text-primary transition"
              >
                ACQUIRE GBDo
              </button>
              <button
                onClick={() => setModalState(s => ({ ...s, swap: true }))}
                className="text-white hover:text-primary transition"
              >
                ASSET XCHANGE
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
              <ResourcesDropdown pathname={pathname} />
              <Link
                href="/help"
                className={`hover:text-primary transition ${
                  pathname === "/help" ? "text-primary font-medium" : "text-white"
                }`}
              >
                HELP
              </Link>
              <button
                onClick={() => setModalState(s => ({ ...s, refund: true }))}
                className="text-white hover:text-primary transition"
              >
                REFUNDS | RETURNS
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
              <li className="flex justify-center">
                <MirrorModeToggle />
              </li>

              <li>
                <button
                  onClick={() => {
                    setModalState(s => ({ ...s, acquire: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 px-6 hover:text-primary transition"
                >
                  ACQUIRE GBDo
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setModalState(s => ({ ...s, swap: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 px-6 hover:text-primary transition"
                >
                  ASSET XCHANGE
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
                    setModalState(s => ({ ...s, refund: true }));
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-1 px-6 hover:text-primary transition"
                >
                  REFUNDS | RETURNS
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

      <Modal
        isOpen={modalState.refund}
        onClose={() => setModalState(s => ({ ...s, refund: false }))}
      >
        <RefundRepairModal 
          isOpen={modalState.refund}
          onClose={() => setModalState(s => ({ ...s, refund: false }))}
          openWalletModal={() => setModalState({ ...modalState, wallet: true })} 
        />
      </Modal>

      <Modal
        isOpen={modalState.redeem}
        onClose={() => setModalState(s => ({ ...s, redeem: false }))}
      >
        <DividendRedeemModal
          isOpen={modalState.redeem}         // boolean: whether modal is open
          onClose={() => setModalState(s => ({ ...s, redeem: false }))}  // fn to close modal
          openWalletModal={() => setModalState(s => ({ ...s, wallet: true }))}  // fn to open wallet modal
        />
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

      <AcquireModal
        isOpen={modalState.acquire}
        onClose={() => setModalState(s => ({ ...s, acquire: false }))}
      />

    </>
  );
};

function ResourcesDropdown({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const delayedClose = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    // Close on route change
    setOpen(false);
    clearCloseTimer();
  }, [pathname]);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        className="text-white hover:text-primary transition text-xs font-light"
        onMouseEnter={() => {
          clearCloseTimer();
          setOpen(true);
        }}
        onMouseLeave={delayedClose}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        RESOURCES
      </button>

      {/* Dropdown panel directly below */}
      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-56 rounded-md border border-white/10 bg-black/95 shadow-lg z-50"
          role="menu"
          onMouseEnter={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onMouseLeave={delayedClose}
        >
          <ul className="py-2 text-xs">
            <li>
              <Link
                href="/about"
                className="block px-4 py-2 text-white hover:text-primary hover:bg-white/5 transition"
                role="menuitem"
              >
                ABOUT
              </Link>
            </li>
            <li>
              <Link
                href="/verification"
                className="block px-4 py-2 text-white hover:text-primary hover:bg-white/5 transition"
                role="menuitem"
              >
                VERIFICATIONS
              </Link>
            </li>
            <li>
              <Link
                href="/whitepaper"
                className="block px-4 py-2 text-white hover:text-primary hover:bg-white/5 transition"
                role="menuitem"
              >
                WHITEPAPER
              </Link>
            </li>
            <li>
              <Link
                href="/energy-order"
                className="block px-4 py-2 text-white hover:text-primary hover:bg-white/5 transition"
                role="menuitem"
              >
                ENERGY ORDER
              </Link>
            </li>
            <li>
              <Link
                href="/developments"
                className="block px-4 py-2 text-white hover:text-primary hover:bg-white/5 transition"
                role="menuitem"
              >
                PLANNED DEVELOPMENTS
              </Link>
            </li>
            <li>
              <Link
                href="/downloads"
                className="block px-4 py-2 text-white hover:text-primary hover:bg-white/5 transition"
                role="menuitem"
              >
                DOWNLOADS
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}