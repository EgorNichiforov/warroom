"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Workspace } from "@/components/workspace/Workspace";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  if (!id) return null;
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center text-sm text-text-2">Loading session…</div>}>
      <Workspace key={id} sessionId={id} />
    </Suspense>
  );
}
