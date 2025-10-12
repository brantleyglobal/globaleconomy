"use client";

import dynamicImport from "next/dynamic";
import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";
import type { CheckoutModalRef } from '~~/components/purchase/checkoutModal'; // adjust path as needed


const GlobalTraderLayout = dynamicImport(() => import("~~/components/pages/GlobalTraderLayout"), {
  ssr: false,
});

export default function GlobalTraderClientWrapper() {
  return <GlobalTraderLayout />;
}
