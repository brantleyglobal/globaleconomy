//"use client";
import AboutClientWrapper from "~~/components/pages/AboutClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "About | BG Company",
  description: "Clean power meets decentralized ownership.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function AboutPage() {
  return <AboutClientWrapper />;
}
