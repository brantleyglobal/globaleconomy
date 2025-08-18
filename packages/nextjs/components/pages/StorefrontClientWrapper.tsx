"use client";

import dynamicImport from "next/dynamic";

const StorefrontLayout = dynamicImport(() => import("~~/components/pages/StorefrontLayout"), {
  ssr: false,
});

export default function StorefrontClientWrapper() {
  return <StorefrontLayout />;
}
