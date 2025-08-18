"use client";

import { useEffect, useState, ReactNode } from "react";
import { useTheme } from "next-themes";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";

import { wagmiConfig, chains } from "~~/services/web3/wagmiConfig";
import { BlockieAvatar } from "~~/components/globalEco";
import { Header } from "~~/components/Header";
import { Footer } from "~~/components/Footer";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { WalletAutoAdd } from "~~/components/walletAutoAdd";
//import { AccountProvider } from "~~/lib/wallet/SmartWalletContext";
import { GLOBALCHAIN } from "~~/utils/globalEco/customChains";
import dynamic from "next/dynamic";

const AccountProvider = dynamic(
  () => import("~~/lib/wallet/SmartWalletContext").then(mod => mod.AccountProvider),
  { ssr: false }
);

export const customchains = [GLOBALCHAIN] as const;

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = mounted
    ? isDarkMode
      ? darkTheme()
      : lightTheme()
    : lightTheme();

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitProvider avatar={BlockieAvatar} theme={theme}>
            {/*<AccountProvider>*/}
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">{children}</main>
                <WalletAutoAdd />
                <Footer />
              </div>
            {/*</AccountProvider>*/}
          </RainbowKitProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
