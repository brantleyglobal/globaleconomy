"use client";

import { useEffect, useState, ReactNode } from "react";
import { useTheme } from "next-themes";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { Header } from "~~/components/Header";
import { Footer } from "~~/components/Footer";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { WalletAutoAdd } from "~~/components/walletAutoAdd";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <WalletAutoAdd />
            <Footer />
          </div>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
