import { visibleWidth } from "@earendil-works/pi-tui";
import type { SidebarContext } from "../types.ts";
import { bold, dim, fg, COLORS, formatDiffStat, panelTitle, trunc } from "../colors.ts";
import type { WorkspaceFile } from "../types.ts";

function renderWorkspaceHeader(ctx: SidebarContext, width: number): string[] {
  const left = bold(" " + panelTitle("Workspace"));
  const leftPlain = " " + panelTitle("Workspace");

  if (!ctx.branch) {
    return [left, dim("─".repeat(Math.max(0, width)))];
  }

  // Build a rich git status string: branch + ahead + untracked
  let status = `⎇ ${ctx.branch}`;
  if (ctx.aheadCount > 0) status += ` ↑${ctx.aheadCount}`;
  if (ctx.untrackedCount > 0) status += ` ?${ctx.untrackedCount}`;

  const leftLen = visibleWidth(leftPlain);
  let rightLen = visibleWidth(status);
  const minPadding = 1;

  let displayStatus = status;
  if (leftLen + minPadding + rightLen > width) {
    const maxStatusLen = Math.max(0, width - leftLen - minPadding);
    displayStatus = trunc(status, maxStatusLen);
  }

  rightLen = visibleWidth(displayStatus);
  const padding = Math.max(1, width - leftLen - rightLen);

  // Color the ahead/untracked parts
  let coloredStatus = fg(COLORS.branch, `⎇ ${ctx.branch}`);
  if (ctx.aheadCount > 0) coloredStatus += fg(COLORS.warning, ` ↑${ctx.aheadCount}`);
  if (ctx.untrackedCount > 0) coloredStatus += dim(` ?${ctx.untrackedCount}`);

  const headerLine = `${left}${" ".repeat(padding)}${coloredStatus}`;
  return [headerLine, dim("─".repeat(Math.max(0, width)))];
}

function renderFileLine(file: WorkspaceFile, width: number): string[] {
  const stat = formatDiffStat(file.added, file.removed);
  const statLen = visibleWidth(stat);
  const pathMax = Math.max(0, width - statLen - 1);
  const path = trunc(file.path, pathMax);
  const pathLen = visibleWidth(path);
  const padding = Math.max(1, width - pathLen - statLen);

  // Color the diff stat: green for additions, red for removals
  const coloredStat = file.removed > 0
    ? fg(COLORS.tokIn, `+${file.added}`) + " " + fg(COLORS.tokOut, `-${file.removed}`)
    : fg(COLORS.tokIn, stat);

  return [`${dim(path)}${" ".repeat(padding)}${coloredStat}`];
}

export function renderWorkspacePanel(ctx: SidebarContext, width: number): string[] {
  const lines: string[] = [...renderWorkspaceHeader(ctx, width)];

  if (!ctx.branch) {
    lines.push(dim("  (not a git repo)"));
    return lines;
  }

  const files = ctx.workspaceFiles.slice(0, 15);
  if (files.length === 0) {
    lines.push(dim("  (clean)"));
    return lines;
  }

  // Summary line: total changed files + total additions/removals
  const totalAdded = files.reduce((s, f) => s + f.added, 0);
  const totalRemoved = files.reduce((s, f) => s + f.removed, 0);
  const summary = `${files.length} files  ` +
    fg(COLORS.tokIn, `+${totalAdded}`) +
    (totalRemoved > 0 ? " " + fg(COLORS.tokOut, `-${totalRemoved}`) : "");
  lines.push(dim("  ") + summary);
  lines.push("");

  for (const file of files) {
    lines.push(...renderFileLine(file, width));
  }

  return lines;
}
