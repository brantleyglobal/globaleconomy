"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { SimpleAccountAPI } from "@account-abstraction/sdk";
import { ethers } from "ethers";
import deployments from "~~/lib/contracts/deployments.json";

interface AccountContextValue {
  accountAPI: SimpleAccountAPI | null;
  loading: boolean;
  error: string | null;
}

const AccountContext = createContext<AccountContextValue>({
  accountAPI: null,
  loading: false,
  error: null,
});

export const AccountProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: walletClient } = useWalletClient();
  const [accountAPI, setAccountAPI] = useState<SimpleAccountAPI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletClient || typeof window === "undefined" || !window.ethereum) return;

    const initAccount = async () => {
      setLoading(true);
      try {
        const entryPointAddress = deployments.EntryPoint;
        const factoryAddress = deployments.SimpleAccountFactory;

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        const simpleAccountAPI = new SimpleAccountAPI({
          provider,
          entryPointAddress,
          owner: signer,
          factoryAddress,
        });

        setAccountAPI(simpleAccountAPI);
        setError(null);
        toast.success("SimpleAccountAPI initialized");
      } catch (err: any) {
        const message = err?.message || "Account initialization failed";
        setError(message);
        setAccountAPI(null);
        toast.error(`Error: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    initAccount();
  }, [walletClient]);

  return (
    <AccountContext.Provider value={{ accountAPI, loading, error }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useERC4337Account = () => useContext(AccountContext);
