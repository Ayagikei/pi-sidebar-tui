import type { SidebarContext } from "../types.ts";
import { dim, fg, COLORS, panelHeader, panelTitle, trunc } from "../colors.ts";

const NA = "—";

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h${m % 60}m`;
  if (m > 0) return `${m}m${s % 60}s`;
  return `${s}s`;
}

function renderProgressBar(percent: number, width: number): string {
  const label = `${percent}%`;
  const indent = 2;
  const gap = 1;
  const barWidth = Math.max(4, width - indent - gap - label.length);
  const filled = Math.round((percent / 100) * barWidth);
  const empty = Math.max(0, barWidth - filled);
  const fillColor = percent >= 100 ? COLORS.success : COLORS.accent;
  return (
    " ".repeat(indent) +
    fg(fillColor, "█".repeat(filled)) +
    dim("░".repeat(empty)) +
    " " +
    fg(fillColor, label)
  );
}

export function renderSessionPanel(ctx: SidebarContext, width: number): string[] {
  const lines: string[] = [...panelHeader(panelTitle("Session"), width)];

  const title = ctx.sessionTitle;
  if (!title) {
    lines.push(dim("  (waiting for first message…)"));
  } else {
    const truncated = trunc(title, Math.max(0, width - 2));
    lines.push(fg(COLORS.model, `  ${truncated}`));
  }

  if (typeof ctx.deskPercent === "number") {
    lines.push(renderProgressBar(ctx.deskPercent, width));
    if (ctx.deskNote) {
      lines.push(dim(`  ${trunc(ctx.deskNote, Math.max(0, width - 2))}`));
    }
  }

  // Short session ID (first 8 chars)
  if (ctx.sessionId) {
    const shortId = ctx.sessionId.slice(0, 8);
    lines.push(dim(`  ${shortId}`));
  }

  lines.push("");

  // Active tool (live only)
  if (ctx.activeTool) {
    const toolElapsed = Date.now() - ctx.activeTool.startedAt;
    const toolName = trunc(ctx.activeTool.name, Math.max(0, width - 14));
    lines.push(dim("  tool  ") + fg(COLORS.accent, toolName) + dim(` (${formatDuration(toolElapsed)})`));
    lines.push("");
  }

  // Stats: time, turns, last turn, speed
  const elapsed = Date.now() - ctx.sessionStartMs;
  const avgTps = ctx.liveTps ?? ctx.lastTps;

  const stats: [string, string, string][] = [
    ["time",   elapsed >= 1000 ? formatDuration(elapsed) : NA,                   "label"],
    ["turns",  ctx.turnCount > 0 ? String(ctx.turnCount) : NA,                    "accent"],
    ["last",   ctx.lastTurnMs !== null ? formatDuration(ctx.lastTurnMs) : NA,     "label"],
    ["speed",  avgTps !== null ? `${avgTps} tok/s` : NA,                          "thinking"],
  ];

  for (const [label, value, color] of stats) {
    lines.push(dim(`  ${label.padEnd(5)} `) + fg(COLORS[color] ?? COLORS.muted, value));
  }

  // Current turn live timer (if agent is active)
  if (ctx.agentActive && ctx.currentTurnMs !== null) {
    lines.push(dim("  now   ") + fg(COLORS.warning, formatDuration(ctx.currentTurnMs)));
  }

  // Turn history — recent durations as a sparkline-like row
  if (ctx.turnDurations.length > 0) {
    lines.push("");
    lines.push(dim("  turns:"));
    const bars = ctx.turnDurations.map(d => {
      const s = Math.round(d / 1000);
      if (s >= 60) return fg(COLORS.warning, "▆");
      if (s >= 30) return fg(COLORS.thinking, "▄");
      if (s >= 10) return fg(COLORS.accent, "▂");
      return fg(COLORS.success, "▁");
    });
    // Show last N turn durations as compact labels
    const recent = ctx.turnDurations.slice(-6);
    const labels = recent.map(d => formatDuration(d));
    const labelStr = labels.join(dim(" · "));
    lines.push(dim("  ") + labelStr);
    // Sparkline
    lines.push(dim("  ") + bars.join(""));
  }

  return lines;
}
