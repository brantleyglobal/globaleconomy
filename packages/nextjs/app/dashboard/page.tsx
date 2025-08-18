//"use client";
import DashboardClientWrapper from "~~/components/pages/DashboardClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "Dashboard | BG Company",
  description: "Track your transactions and token balances in real time.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function DashboardPage() {
  return <DashboardClientWrapper />;
}
