import { visibleWidth } from "@earendil-works/pi-tui";

// Selective reset: clears bold/dim/italic/underline/fg but NOT background
const RESET = "\x1b[22;23;24;39m";
const BOLD = "\x1b[1m";
const DIM_CODE = "\x1b[2m";

function hexToAnsi(color: string): string {
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

// Pastel palette aligned with the @nilskluewer/pi-cost-transparency-statusline
// footer colors. We use hex directly instead of theme.fg() so the sidebar
// always shows vibrant pastel colors regardless of the active pi theme.
const PALETTE: Record<string, string> = {
  accent:   "#a8e6a3",  // pastel green
  success:  "#a8e6a3",  // pastel green
  warning:  "#ff9aa2",  // pastel red
  text:     "#b8c0ff",  // pastel periwinkle
  muted:    "#aaa6c2",  // muted lavender
  branch:   "#ffbe98",  // soft peach
  model:    "#b8c0ff",  // pastel periwinkle
  thinking: "#ffe28a",  // soft sunshine
  label:    "#aaa6c2",  // muted lavender
  tokIn:    "#a8e6a3",  // pastel green
  tokOut:   "#ff9aa2",  // pastel red
  context:  "#c3b1e1",  // soft lavender
  sep:      "#504c60",  // muted plum
  cost:     "#98e4c6",  // pastel mint
};

// COLORS maps semantic names to palette keys (kept for readability at call sites)
export const COLORS = {
  accent:   "accent",
  success:  "success",
  warning:  "warning",
  header:   "text",
  muted:    "muted",
  branch:   "branch",
  model:    "model",
  thinking: "thinking",
  label:    "label",
  tokIn:    "tokIn",
  tokOut:   "tokOut",
  context:  "context",
  sep:      "sep",
  cost:     "cost",
} as const;

let _piTheme: any = null;

export function setPiTheme(t: any): void {
  _piTheme = t;
}

export function bold(text: string): string {
  if (_piTheme) return _piTheme.bold(text);
  return `${BOLD}${text}${RESET}`;
}

export function dim(text: string): string {
  // Always use theme dim when available — it's a standard color
  if (_piTheme) return _piTheme.fg("dim", text);
  return `${DIM_CODE}${text}${RESET}`;
}

export function fg(colorName: string, text: string): string {
  // Use hex directly for vibrant pastel colors that match the footer.
  // Only "dim" delegates to the theme (it's a standard, non-pastel color).
  const hex = PALETTE[colorName];
  if (hex) return `${hexToAnsi(hex)}${text}${RESET}`;
  // Unknown color — try theme, then fall back to muted lavender
  if (_piTheme) {
    try { return _piTheme.fg(colorName, text); } catch { /* fall through */ }
  }
  return `${hexToAnsi(PALETTE.muted)}${text}${RESET}`;
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h${m % 60}m`;
  if (m > 0) return `${m}m${s % 60}s`;
  return `${s}s`;
}

export function formatRelativeTime(ms: number): string {
  return `${formatDuration(ms)} ago`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function spinnerFrame(): string {
  return SPINNER_FRAMES[Math.floor(Date.now() / 80) % SPINNER_FRAMES.length];
}

export function formatDiffStat(added: number, removed: number): string {
  if (removed > 0) return `+${added} -${removed}`;
  return `+${added}`;
}

export function trunc(text: string, max: number): string {
  if (max <= 0) return "";
  if (visibleWidth(text) <= max) return text;
  let result = "";
  let w = 0;
  for (const ch of text) {
    const cw = visibleWidth(ch);
    if (w + cw > max - 1) break;
    result += ch;
    w += cw;
  }
  return result + "…";
}

export function panelHeader(title: string, width: number): string[] {
  const separatorLen = Math.max(0, width);
  return [
    bold(` ${title}`),
    dim("─".repeat(separatorLen)),
  ];
}
