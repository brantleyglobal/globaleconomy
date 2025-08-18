// app/layout.tsx (server)
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/globals.css";
import ClientProviders from "~~/components/clientProviders";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "BG Company",
  description: "The Global Ecosystem",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral text-white">
        <ClientProviders>
          {/* everything else now lives inside ClientProviders */}
          {children}
          {/*<Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontSize: "0.85rem",
                maxWidth: "400px",
                whiteSpace: "pre-line",
              },
            }}
          />*/}
        </ClientProviders>
      </body>
    </html>
  );
}
