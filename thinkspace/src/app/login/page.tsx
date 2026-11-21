"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/sessions";
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.auth.login(passphrase);
      router.push(next.startsWith("/") ? next : "/sessions");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError("That passphrase is not right.");
      else setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-border bg-bg-1 p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
          <KeyRound size={18} />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">THINKSPACE</h1>
          <p className="text-xs text-text-2">Enter your passphrase to continue.</p>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-xs text-text-1">
        Passphrase
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="h-10 rounded-md border border-border bg-bg-0 px-3 text-base text-text-0 outline-none focus:border-accent"
          data-testid="passphrase-input"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!passphrase}>
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4 min-h-dvh">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
