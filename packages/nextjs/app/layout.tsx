import "@rainbow-me/rainbowkit/styles.css";
import { GlobalDEXAppWithProviders } from "~~/components/GlobalDEXAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/globalDEX/getMetadata";

export const metadata = getMetadata({
  title: "GlobalDEX",
  description: "",
});

const GlobalDEXApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={false}
        >
          <GlobalDEXAppWithProviders>{children}</GlobalDEXAppWithProviders>
        </ThemeProvider>

      </body>
    </html>
  );
};

export default GlobalDEXApp;
