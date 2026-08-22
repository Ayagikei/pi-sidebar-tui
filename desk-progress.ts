import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";

export interface DeskProgress {
  percent: number;
  note: string | null;
  title: string | null;
}

export function deskPath(): string {
  return process.env.PAPER_DESK_PATH
    ? process.env.PAPER_DESK_PATH
    : join(homedir(), ".papercolor", "desk.json");
}

export function stripSessionTitle(name: string): string {
  let text = name.trim();
  for (const sep of ["｜", " | "]) {
    if (text.includes(sep)) {
      text = text.split(sep, 2)[0].trim();
      break;
    }
  }
  return text.slice(0, 80);
}

export function parseDeskProgress(input: unknown): DeskProgress | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const raw = obj["percent"];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const percent = Math.max(0, Math.min(100, Math.round(raw)));
  const note = typeof obj["note"] === "string" && obj["note"].trim()
    ? obj["note"].trim().slice(0, 80)
    : null;
  const titleRaw = typeof obj["title"] === "string" ? obj["title"] : "";
  const title = titleRaw.trim() ? stripSessionTitle(titleRaw) : null;
  return { percent, note, title };
}

export function inferDeskProgress(sm: { getBranch?: () => unknown[] } | null | undefined): DeskProgress | null {
  let last: DeskProgress | null = null;
  try {
    for (const entry of sm?.getBranch?.() ?? []) {
      const e = entry as { type?: string; message?: { role?: string; content?: unknown } };
      if (e?.type !== "message") continue;
      const content = e.message?.content;
      if (e.message?.role !== "assistant" || !Array.isArray(content)) continue;
      for (const block of content) {
        const b = block as { type?: string; name?: string; arguments?: unknown; input?: unknown };
        if (b?.type !== "toolCall" || b.name !== "desk_progress") continue;
        const parsed = parseDeskProgress(b.arguments ?? b.input);
        if (parsed) last = parsed;
      }
    }
  } catch {
    // ignore
  }
  return last;
}

export function loadDeskOverlay(sessionId: string | null | undefined, path = deskPath()): DeskProgress | null {
  if (!sessionId) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      sessions?: Record<string, { percent?: unknown; note?: unknown; title?: unknown }>;
    };
    const sessions = parsed.sessions;
    if (!sessions || typeof sessions !== "object") return null;
    const raw = sessions[sessionId] ?? Object.entries(sessions).find(([key]) =>
      key.endsWith(sessionId) || sessionId.endsWith(key)
    )?.[1];
    if (!raw) return null;
    return parseDeskProgress({
      percent: raw.percent,
      note: raw.note,
      title: raw.title,
    });
  } catch {
    return null;
  }
}
