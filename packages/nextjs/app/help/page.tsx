//"use client";
import ContactClientWrapper from "~~/components/pages/ContactClientWrapper";

//export const dynamic: "force-dynamic" = "force-dynamic";

export const metadata = {
  title: "Support | BG Company",
  description: "Get Answers, Insight, & Extended Customization Feedback.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function ContactPage() {
  return <ContactClientWrapper />;
}
