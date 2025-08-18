"use client";

import dynamicImport from "next/dynamic";

const WhitepaperLayout = dynamicImport(() => import("~~/components/pages/WhitepaperLayout"), {
  ssr: false,
});

export default function WhitepaperClientWrapper() {
  return <WhitepaperLayout />;
}
