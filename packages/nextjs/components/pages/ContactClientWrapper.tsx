"use client";

import dynamicImport from "next/dynamic";

const ContactLayout = dynamicImport(() => import("~~/components/pages/ContactPageLayout"), {
  ssr: false,
});

export default function ContactClientWrapper() {
  return <ContactLayout />;
}
