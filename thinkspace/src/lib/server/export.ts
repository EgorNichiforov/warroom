/**
 * Session export (D-14): Markdown rendering of a SessionSnapshot. JSON export is the snapshot itself.
 */
import "server-only";
import type { Session, SessionSnapshot, SessionSummary } from "@/lib/contracts/domain";

export function exportFilename(session: Session, format: "json" | "md"): string {
  const slug =
    session.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "session";
  const date = session.startedAt.slice(0, 10);
  return `thinkspace-${date}-${slug}.${format}`;
}

export function mmss(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const core = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${core}` : core;
}

function duration(session: Session, snapshot: SessionSnapshot): string {
  const fromSegments = snapshot.segments.reduce((m, s) => Math.max(m, s.endedMs), 0);
  const ms = Math.max(session.durationMs, fromSegments);
  if (ms === 0 && session.endedAt) return mmss(new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime());
  return mmss(ms);
}

const list = (items: string[], empty = "_none_") => (items.length ? items.map((i) => `- ${i}`).join("\n") : empty);

function summarySection(summary: unknown): string[] {
  const s = summary as Partial<SessionSummary> | null;
  if (!s || typeof s !== "object" || !("headline" in s)) return ["## Summary", "", "_No summary was generated for this session._", ""];
  const out = ["## Summary", "", `**${s.headline ?? ""}**`, ""];
  if (s.simulated) out.push("_Simulated summary (no AI provider)._", "");
  const sections: [string, string[] | undefined][] = [
    ["What I thought about", s.whatIThoughtAbout],
    ["Conclusions", s.conclusions],
    ["Next steps", s.nextSteps],
    ["Open questions", s.openQuestions],
    ["Ideas to explore", s.ideasToExplore],
    ["Dependencies", s.dependencies],
    ["Priorities", s.priorities],
    ["Systems to change", s.systemsToChange],
    ["Suggestions (inferred)", s.suggestions],
  ];
  for (const [title, items] of sections) {
    if (items && items.length) out.push(`### ${title}`, "", list(items), "");
  }
  return out;
}

export function snapshotToMarkdown(snapshot: SessionSnapshot): string {
  const { session } = snapshot;
  const conceptLabel = new Map(snapshot.concepts.map((c) => [c.id, c.label]));
  const label = (id: string) => conceptLabel.get(id) ?? id;
  const lines: string[] = [];

  lines.push(`# ${session.title}`, "");
  lines.push(`- Date: ${session.startedAt}`);
  lines.push(`- Duration: ${duration(session, snapshot)}`);
  lines.push(`- Status: ${session.status}${session.endedAt ? ` (ended ${session.endedAt})` : ""}`);
  if (session.languageHint) lines.push(`- Language hint: ${session.languageHint}`);
  lines.push("");

  lines.push(...summarySection(session.summary));

  const active = snapshot.thoughts.filter((t) => t.status === "active");
  const decisions = active.filter((t) => t.type === "decision");
  lines.push("## Decisions", "", list(decisions.map((d) => `${d.text} _(${d.provenance})_`)), "");

  lines.push("## Actions", "");
  if (snapshot.actions.length === 0) lines.push("_none_");
  for (const a of snapshot.actions) {
    const box = a.status === "done" ? "[x]" : a.status === "dropped" ? "[-]" : "[ ]";
    const extra = [a.priority ? `priority: ${a.priority}` : null, a.dueDate ? `due: ${a.dueDate}` : null, a.status === "dropped" ? "dropped" : null]
      .filter(Boolean)
      .join(", ");
    lines.push(`- ${box} ${a.text}${extra ? ` _(${extra})_` : ""}`);
  }
  lines.push("");

  const questions = active.filter((t) => t.type === "question");
  lines.push("## Open questions", "", list(questions.map((q) => q.text)), "");

  const concepts = snapshot.concepts.filter((c) => c.status === "active");
  lines.push("## Concepts", "", list(concepts.map((c) => `**${c.label}** (${c.kind})${c.description ? ` — ${c.description}` : ""}`)), "");

  const relations = snapshot.relations.filter((r) => r.status === "active");
  if (relations.length) {
    lines.push("### Relations", "", list(relations.map((r) => `${label(r.fromId)} → *${r.type}* → ${label(r.toId)}${r.label ? ` (${r.label})` : ""}`)), "");
  }

  lines.push("## System models", "");
  if (snapshot.models.length === 0) lines.push("_none_", "");
  for (const m of snapshot.models) {
    lines.push(`### ${m.name} (current version ${m.currentVersion})`, "");
    if (m.description) lines.push(m.description, "");
    const versions = snapshot.versions.filter((v) => v.modelId === m.id).sort((a, b) => a.version - b.version);
    for (const v of versions) {
      const cs = v.snapshot.concepts.map((c) => c.label).join(", ") || "—";
      const rs = v.snapshot.relations.map((r) => `${label(r.fromId)} → ${r.type} → ${label(r.toId)}`).join("; ") || "—";
      lines.push(`- v${v.version} (${v.createdAt}): concepts: ${cs}; relations: ${rs}`);
    }
    lines.push("");
  }

  lines.push("## Change log", "");
  if (snapshot.changes.length === 0) lines.push("_none_", "");
  for (const c of snapshot.changes) {
    const model = c.modelId ? snapshot.models.find((m) => m.id === c.modelId)?.name ?? c.modelId : null;
    const ver = c.beforeVersion != null || c.afterVersion != null ? ` v${c.beforeVersion ?? "–"} → v${c.afterVersion ?? "–"}` : "";
    lines.push(`- **${c.kind}**${model ? ` on _${model}_` : ""}${ver}: ${c.description}`);
    for (const i of c.implications) lines.push(`  - implication: ${i}`);
    for (const u of c.unresolved) lines.push(`  - unresolved: ${u}`);
  }
  lines.push("");

  const other = active.filter((t) => !["decision", "question"].includes(t.type));
  if (other.length) {
    lines.push("## Thoughts", "", list(other.map((t) => `_${t.type}_: ${t.text}${t.provenance === "inferred" ? " _(inferred)_" : ""}`)), "");
  }

  if (snapshot.scenes.length) {
    lines.push("## Scenes", "", list(snapshot.scenes.map((s) => `${s.title} — ${s.kind}, ${s.status}${s.assetId ? ` (asset ${s.assetId})` : ""}`)), "");
  }

  lines.push("## Transcript", "");
  if (snapshot.segments.length === 0) lines.push("_empty_");
  for (const s of snapshot.segments) {
    const text = s.cleanedText ? `${s.cleanedText} _(cleaned)_` : s.rawText;
    const edited = s.editedByUser ? " _(edited)_" : "";
    lines.push(`- **${mmss(s.startedMs)}** \`${s.language}\` ${text}${edited}`);
    if (s.translation) lines.push(`  - translation: ${s.translation}`);
  }
  lines.push("", `_Exported from THINKSPACE on ${new Date().toISOString()}_`, "");
  return lines.join("\n");
}
