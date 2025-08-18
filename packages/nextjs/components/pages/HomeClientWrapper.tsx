"use client";

import dynamicImport from "next/dynamic";
import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";
import type { CheckoutModalRef } from '~~/components/checkoutModal'; // adjust path as needed


const HomePageLayout = dynamicImport(() => import("~~/components/pages/HomePageLayout"), {
  ssr: false,
});

export default function HomeClientWrapper() {
  return <HomePageLayout />;
}
