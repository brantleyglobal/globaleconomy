"use client";

import dynamicImport from "next/dynamic";


const HomePageLayout = dynamicImport(() => import("~~/components/pages/HomePageLayout"), {
  ssr: false,
});

export default function HomeClientWrapper() {
  return <HomePageLayout />;
}
