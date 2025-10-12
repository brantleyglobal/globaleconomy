//"use client";
import EnergyOrderClientWrapper from "~~/components/pages/EnergyOrderClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "Energy | BG Company",
  description: "The Flagship That Realigns The Way Energy Provides For The Greater Good.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function OrderPage() {
  return <EnergyOrderClientWrapper />;
}
