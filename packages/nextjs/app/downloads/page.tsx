//"use client";
import DownloadsClientWrapper from "~~/components/pages/DownloadsClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "Downloads | BG Company",
  description: "Resources & Tools to streamline your strategy.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function DownloadsPage() {
  return <DownloadsClientWrapper />;
}
