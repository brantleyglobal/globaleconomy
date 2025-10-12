import GlobalTraderClientWrapper from "~~/components/pages/GlobalTraderClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "Global Trader | BG Company",
  description: "Created For Risk Takers.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function GlobalTrader() {
  return <GlobalTraderClientWrapper />;
}
