"use client";

import React, { Suspense } from "react";
import ConfirmPage from "@/components/auth/ConfirmUser"; // see note below

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading confirmation...</div>}>
      <ConfirmPage />
    </Suspense>
  );
}
