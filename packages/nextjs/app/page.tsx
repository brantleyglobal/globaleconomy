import HomeClientWrapper from "~~/components/pages/HomeClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "Home | BG Company",
  description: "A New Image For Energy.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function HomePage() {
  return <HomeClientWrapper />;
}
