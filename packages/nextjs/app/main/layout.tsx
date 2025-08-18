"use client";

import { GlobalDEXAppWithProviders } from "~~/components/GlobalDEXAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { WalletAutoAdd } from "~~/components/walletAutoAdd";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
      <GlobalDEXAppWithProviders>
        {children}
        <WalletAutoAdd /> {/*Now safely wrapped inside WagmiProvider */}
      </GlobalDEXAppWithProviders>
    </ThemeProvider>
  );
}