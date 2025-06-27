"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, Bars2Icon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { RainbowKitCustomConnectButton } from "~~/components/globalDEX";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/globalDEX";
import { Modal } from "~~/components/common/modal";
import InlineSwapWidget from "~~/components/swap/inlineSwapWidget";
import { Faucet } from "~~/components/globalDEX/Faucet";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

const menuLinks: HeaderMenuLink[] = [];

const HeaderMenuLinks = () => {
  const pathname = usePathname();
  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              className={`${
                isActive ? "bg-secondary shadow-md" : ""
              } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard") || pathname === "/";

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [faucetModalOpen, setFaucetModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <div className="sticky lg:static top-0 navbar bg-black min-h-0 shrink-0 justify-between z-20 shadow-md shadow-black px-0 sm:px-2">
        <div className="navbar-start w-auto lg:w-1/2">
          <details className="dropdown" ref={burgerMenuRef}>
            <summary className="ml-1 btn btn-ghost py-4 lg:hidden hover:bg-secondary">
              <Bars3Icon className="h-1/2" />
            </summary>
            <ul
              className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-black rounded-box w-52"
              onClick={() => {
                burgerMenuRef?.current?.removeAttribute("open");
              }}
            >
              <li>
                <Link href={isDashboard ? "/storefront" : "/dashboard"}>
                  <button className="btn btn-sm btn-base-100 border-none font-light focus-none outline-none w-full hover:bg-base-300">
                    {isDashboard ? "Go to STOREFRONT" : "Go to DASHBOARD"}
                  </button>
                </Link>
              </li>
              <HeaderMenuLinks />
            </ul>
          </details>

          <ul className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
            <div className="flex relative w-10 h-10">
              <Link href={isDashboard ? "/dashboard" : "/storefront"}>
                <Image alt="SE2 logo" fill src="/logo.svg" className="cursor-pointer" />
              </Link>
            </div>
          </ul>

          <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
            <li>
              <Link href={isDashboard ? "/storefront" : "/dashboard"}>
                <button className="btn btn-sm btn-base-100 border-none font-light focus-none outline-none hover:bg-base-300">
                  {isDashboard ? "Go to STOREFRONT" : "Go to DASHBOARD"}
                </button>
              </Link>
            </li>
            <HeaderMenuLinks />
          </ul>
        </div>

        <div className="navbar-end grow mr-4 flex items-center gap-4">
          <RainbowKitCustomConnectButton />
          <button
            className="btn btn-secondary btn-sm text-white font-light"
            onClick={() => setSwapModalOpen(true)}
          >
            SWAP
          </button>
          <button
            className="btn btn-secondary btn-sm text-white font-light"
            onClick={() => setFaucetModalOpen(true)}
          >
            TRANSFER
          </button>
          <button
            className="btn btn-ghost p-2 border-none hover:border-none hover:bg-base-300"
            onClick={() => setIsMenuOpen(true)}
          >
            <Bars2Icon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start mt-0 justify-center bg-black bg-opacity-80 pt-4"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="bg-black rounded-lg shadow-xl mt-0 p-0 w-11/12 max-w-5xl text-white relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-0 right-4 text-white text-xl"
              onClick={() => setIsMenuOpen(false)}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <ul className="space-y-4 font-light text-sm text-left pt-16">
              <li><a href="https://legion-gen.com/collections/legion-e-series" target="_blank" rel="noopener noreferrer">Legion E Series</a></li>
              <li><a href="https://legion-gen.com/collections/legion-x-series" target="_blank" rel="noopener noreferrer">Legion X Series</a></li>
              <li><a href="https://legion-gen.com/collections/remote-monitoring" target="_blank" rel="noopener noreferrer">Legion Monitoring</a></li>
              <li><a href="https://legion-gen.com/accounts" target="_blank" rel="noopener noreferrer">Accounts</a></li>
              <li><a href="https://legion-gen.com/about" target="_blank" rel="noopener noreferrer">About</a></li>
              <li><a href="https://legion-gen.com/contact" target="_blank" rel="noopener noreferrer">Contact</a></li>
              <li><a href="https://legion-gen.com/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><a href="https://legion-gen.com/terms-conditions" target="_blank" rel="noopener noreferrer">Terms & Conditions</a></li>
              <li><a href="https://legion-gen.com/partners" target="_blank" rel="noopener noreferrer">Partners</a></li>
            </ul>
          </div>
        </div>
      )}

      //{isLocalNetwork && (
        <Modal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          title="Swap Tokens"
        >
          <InlineSwapWidget />
        </Modal>
      )}

      {isLocalNetwork && (
        <Modal
          isOpen={faucetModalOpen}
          onClose={() => setFaucetModalOpen(false)}
          title="Token Transfer"
        >
          <Faucet />
        </Modal>
      )}
    </>
  );
};
