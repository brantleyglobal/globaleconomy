"use client";

import dynamicImport from "next/dynamic";

const EnergyOrderLayout = dynamicImport(() => import("~~/components/pages/EnergyOrderLayout"), {
  ssr: false,
});

export default function EnergyOrderClientWrapper() {
  return <EnergyOrderLayout />;
}
