"use client";

import dynamicImport from "next/dynamic";


const VerificationPageLayout = dynamicImport(() => import("~~/components/pages/VerificationPageLayout"), {
  ssr: false,
});

export default function VerificationClientWrapper() {
  return <VerificationPageLayout />;
}
