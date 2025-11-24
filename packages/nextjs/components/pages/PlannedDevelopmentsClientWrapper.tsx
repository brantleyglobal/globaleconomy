"use client";

import dynamicImport from "next/dynamic";

const PlannedDevelopmentsLayout = dynamicImport(() => import("~~/components/pages/PlannedDevelopmentsLayout"), {
  ssr: false,
});

export default function PlannedDevelopmentsClientWrapper() {
  return <PlannedDevelopmentsLayout />;
}
