"use client";

import dynamicImport from "next/dynamic";

const AboutLayout = dynamicImport(() => import("~~/components/pages/AboutPageLayout"), {
  ssr: false,
});

export default function AboutClientWrapper() {
  return <AboutLayout />;
}
