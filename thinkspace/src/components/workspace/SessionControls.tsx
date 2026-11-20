"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import type { HealthResponse } from "@/lib/contracts/api";
import { SPEECH_PROVIDER_INFO, isSpeechProviderName, usableProviders } from "@/lib/speech";
import type { SpeechProviderName } from "@/lib/speech/types";
import { Button, ConfirmDialog, Select } from "@/components/ui";
import { useSessionStore } from "@/store/session-store";
import { useController, useLocalFlag } from "./hooks";

const LANGS = [
  { value: "auto", label: "Auto (RO default)" },
  { value: "ro-RO", label: "Română (ro-RO)" },
  { value: "en-US", label: "English (en-US)" },
] as const;

export function SessionControls({ health, compact }: { health: HealthResponse | null; compact?: boolean }) {
  const controller = useController();
  const thinking = useSessionStore((s) => s.thinking);
  const provider = useSessionStore((s) => s.speechProvider);
  const language = useSessionStore((s) => s.speechLanguage);
  const setProvider = useSessionStore((s) => s.setSpeechProvider);
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [privacyNoted, setPrivacyNoted] = useLocalFlag("thinkspace.privacy-noted");
  const [showPrivacy, setShowPrivacy] = useState(false);

  const providers = useMemo(() => usableProviders(health?.providers.speech.available), [health]);

  // pick the server default provider once health arrives (only before the first start)
  useEffect(() => {
    if (!health || thinking !== "idle") return;
    const d = health.providers.speech.default;
    if (isSpeechProviderName(d) && providers.includes(d)) setProvider(d);
    else if (!providers.includes(provider)) setProvider(providers[0] ?? "mock");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health, providers]);

  const canConfigure = thinking === "idle" || thinking === "paused" || thinking === "ended";
  const info = SPEECH_PROVIDER_INFO[provider];

  const doStart = async () => {
    setBusy(true);
    try {
      await controller.start({ provider, language });
    } catch {
      /* surfaced through store errors */
    } finally {
      setBusy(false);
    }
  };

  const onStart = () => {
    if (privacyNoted === false) {
      setShowPrivacy(true);
      return;
    }
    void doStart();
  };

  const onResume = async () => {
    setBusy(true);
    try {
      if (thinking === "ended") await controller.start({ provider, language });
      else await controller.resume();
    } finally {
      setBusy(false);
    }
  };

  const onStop = async () => {
    setConfirmStop(false);
    setBusy(true);
    try {
      await controller.stop({ end: true });
      useSessionStore.getState().setView("actions");
    } finally {
      setBusy(false);
    }
  };

  const onProviderChange = (p: SpeechProviderName) => {
    void controller.switchProvider(p);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="session-controls">
      {canConfigure && (
        <>
          <Select
            size="sm"
            aria-label="Speech provider"
            value={provider}
            onValueChange={onProviderChange}
            options={providers.map((p) => ({
              value: p,
              label: SPEECH_PROVIDER_INFO[p].label,
            }))}
            title={info.description}
            data-testid="provider-select"
          />
          <Select
            size="sm"
            aria-label="Recognition language"
            value={language}
            onValueChange={(l) => controller.setLanguage(l)}
            options={LANGS.map((l) => ({ ...l }))}
            disabled={info.supportsCodeSwitching}
            title={info.supportsCodeSwitching ? "This provider detects Romanian and English automatically." : info.description}
            data-testid="language-select"
          />
        </>
      )}

      {thinking === "idle" && (
        <Button variant="primary" size={compact ? "md" : "lg"} onClick={onStart} loading={busy} icon={<Mic size={16} />} data-testid="start-button">
          Start thinking
        </Button>
      )}
      {thinking === "listening" && (
        <>
          <Button variant="secondary" onClick={() => controller.pause()} icon={<Pause size={14} />} data-testid="pause-button">
            Pause
          </Button>
          <Button variant="rec" onClick={() => setConfirmStop(true)} loading={busy} icon={<Square size={14} />} data-testid="stop-button">
            Stop
          </Button>
        </>
      )}
      {thinking === "paused" && (
        <>
          <Button variant="primary" onClick={onResume} loading={busy} icon={<Play size={14} />} data-testid="resume-button">
            Resume
          </Button>
          <Button variant="rec" onClick={() => setConfirmStop(true)} loading={busy} icon={<Square size={14} />} data-testid="stop-button">
            Stop
          </Button>
        </>
      )}
      {thinking === "processing" && (
        <Button variant="secondary" disabled loading>
          Finishing…
        </Button>
      )}
      {thinking === "ended" && (
        <Button variant="primary" onClick={onResume} loading={busy} icon={<RotateCcw size={14} />} data-testid="continue-button">
          Continue thinking
        </Button>
      )}

      <ConfirmDialog
        open={confirmStop}
        title="Stop this session?"
        message="The microphone stops, remaining speech is processed, and an end-of-session summary is generated. You can continue the session later."
        confirmLabel="Stop & summarize"
        onConfirm={onStop}
        onCancel={() => setConfirmStop(false)}
      />
      <ConfirmDialog
        open={showPrivacy}
        title="Before you start"
        message={
          <p>
            <strong className="text-text-0">Audio is not stored;</strong> only the transcript and derived notes are saved. The microphone is on only while
            the red RECORDING indicator is visible.
          </p>
        }
        confirmLabel="Got it — start"
        onConfirm={() => {
          setPrivacyNoted(true);
          setShowPrivacy(false);
          void doStart();
        }}
        onCancel={() => setShowPrivacy(false)}
      />
    </div>
  );
}
