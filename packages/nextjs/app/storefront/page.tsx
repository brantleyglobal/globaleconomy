//"use client";
import StorefrontClientWrapper from "~~/components/pages/StorefrontClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "Storefront | BG Company",
  description: "Shop, Invest, & Save On A Single Platform",
  icons: {
    icon: "/favicon.png",
  },
};

export default function StorefrontPage() {
  return <StorefrontClientWrapper />;
}
