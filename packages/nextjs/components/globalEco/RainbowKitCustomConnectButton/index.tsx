"use client";

import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { GlobalWalletModal } from "./globalWalletConnect";
import { useNetworkColor } from "~~/hooks/globalEco";
import { getBlockExplorerAddressLink } from "~~/utils/globalEco";
import { Address } from "viem";
import { supportedChains } from "~~/components/constants/chains";

type SwitchError = { code?: number; message: string };

const TARGET_CHAIN_ID = 3503995874081207;

export const RainbowKitCustomConnectButton = () => {
  const networkColor = useNetworkColor();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  const [modalOpen, setModalOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchFailed, setSwitchFailed] = useState(false);
  const [switchError, setSwitchError] = useState<SwitchError | null>(null);

  const isOnCorrectChain = chain?.id === TARGET_CHAIN_ID;
  const targetNetwork = supportedChains.find(c => c.id === TARGET_CHAIN_ID);
  const chainIdHex = `0x${TARGET_CHAIN_ID.toString(16)}`;

  const switchToTargetChain = async () => {
    if (!targetNetwork || !window.ethereum) return;

    try {
      setSwitching(true);
      setSwitchError(null);
      setSwitchFailed(false);

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });

      setSwitching(false);
    } catch (err: any) {
      const code = err?.code;
      let message = "Network switch failed.";

      if (code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: chainIdHex,
              chainName: targetNetwork.name,
              nativeCurrency: targetNetwork.nativeCurrency,
              rpcUrls: [targetNetwork.rpcUrls],
              blockExplorerUrls: [targetNetwork.blockExplorers],
            }],
          });
          setSwitching(false);
          return;
        } catch {
          message = "Wallet rejected adding the network.";
        }
      } else if (code === 4001) {
        message = "User rejected the network switch.";
      } else if (err?.message) {
        message = err.message;
      }

      setSwitchError({ code, message });
      setSwitchFailed(true);
      setSwitching(false);
      disconnect();
    }
  };

  useEffect(() => {
    if (isConnected && !isOnCorrectChain) {
      switchToTargetChain();
    }
  }, [isConnected, isOnCorrectChain]);

  const formattedError = switchError
    ? switchError.code
      ? `[${switchError.code}] ${switchError.message}`
      : switchError.message
    : undefined;

  if (switching) {
    return (
      <button className="btn btn-warning btn-sm font-light" disabled>
        SWITCHING NETWORK...
      </button>
    );
  }

  if (!isConnected || switchFailed) {
    return (
      <>
        <button
          className="btn btn-white rounded-md btn-sm font-normal"
          onClick={() => {
            setModalOpen(true);
            setSwitchFailed(false);
            setSwitchError(null);
          }}
        >
          CONNECT WALLET
        </button>
        <GlobalWalletModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          errorMessage={formattedError}
        />
      </>
    );
  }

  if (isOnCorrectChain && address && targetNetwork) {
    const blockExplorerAddressLink = getBlockExplorerAddressLink(
      targetNetwork,
      address
    );

    return (
      <>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center mr-1">
            <Balance address={address as Address} className="min-h-0 h-auto" />
            <span className="text-[10px]" style={{ color: networkColor }}>
              {targetNetwork.name}
            </span>
          </div>
          <AddressInfoDropdown
            address={address as Address}
            displayName={address.toString().slice(0, 8) + "..."}
            ensAvatar={undefined}
            blockExplorerAddressLink={blockExplorerAddressLink}
          />
        </div>
        <AddressQRCodeModal address={address as Address} modalId="qrcode-modal" />
      </>
    );
  }

  return null;
};
