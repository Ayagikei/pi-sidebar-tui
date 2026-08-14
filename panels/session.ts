import type { SidebarContext } from "../types.ts";
import { dim, fg, COLORS, panelHeader, trunc } from "../colors.ts";

const NA = "—";

export function renderSessionPanel(ctx: SidebarContext, width: number): string[] {
  const lines: string[] = [...panelHeader("Session", width)];

  const title = ctx.sessionTitle;
  if (!title) {
    lines.push(dim("  (waiting for first message…)"));
  } else {
    const truncated = trunc(title, Math.max(0, width - 2));
    lines.push(dim(`  ${truncated}`));
  }

  lines.push("");

  // Active tool (live only)
  if (ctx.activeTool) {
    const toolElapsed = Date.now() - ctx.activeTool.startedAt;
    const toolName = trunc(ctx.activeTool.name, Math.max(0, width - 14));
    lines.push(dim("  tool  ") + fg(COLORS.accent, toolName) + dim(` (${formatDuration(toolElapsed)})`));
    lines.push("");
  }

  // Slim stats: time, turns, last turn duration, speed
  const elapsed = Date.now() - ctx.sessionStartMs;
  const avgTps = ctx.liveTps ?? ctx.lastTps;

  const stats: [string, string][] = [
    ["time", elapsed >= 1000 ? formatDuration(elapsed) : NA],
    ["turns", ctx.turnCount > 0 ? String(ctx.turnCount) : NA],
    ["last", ctx.lastTurnMs !== null ? formatDuration(ctx.lastTurnMs) : NA],
    ["speed", avgTps !== null ? `${avgTps} tok/s` : NA],
  ];

  for (const [label, value] of stats) {
    lines.push(dim(`  ${label.padEnd(5)} `) + fg(COLORS.muted, value));
  }

  return lines;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h${m % 60}m`;
  if (m > 0) return `${m}m${s % 60}s`;
  return `${s}s`;
}
