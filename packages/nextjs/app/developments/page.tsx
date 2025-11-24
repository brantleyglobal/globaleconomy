//"use client";
import PlannedDevelopmentsClientWrapper from "~~/components/pages/PlannedDevelopmentsClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "Developments | BG Company",
  description: "More than just products. Changing landscapes while changing the carbon footprint. All while inviting you to be a part",
  icons: {
    icon: "/favicon.png",
  },
};

export default function DevelopmentsPage() {
  return <PlannedDevelopmentsClientWrapper />;
}
