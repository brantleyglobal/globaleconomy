"use client";

import dynamicImport from "next/dynamic";

const DashboardLayout = dynamicImport(() => import("~~/components/pages/DashboardLayout"), {
  ssr: false,
});

export default function DashboardClientWrapper() {
  return <DashboardLayout />;
}
