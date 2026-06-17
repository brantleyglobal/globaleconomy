"use client";

import dynamicImport from "next/dynamic";

const DownloadsLayout = dynamicImport(() => import("~~/components/pages/DownloadsPageLayout"), {
  ssr: false,
});

export default function DownloadsClientWrapper() {
  return <DownloadsLayout />;
}
