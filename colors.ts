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

// ThemeColor names — matched to pi's Theme.fg() API.
// When a pi theme is active, these names are passed to theme.fg().
// The FALLBACK_HEX map provides pastel values aligned with the
// @nilskluewer/pi-cost-transparency-statusline footer palette so the
// sidebar and footer look cohesive even without a theme.
export const COLORS = {
  accent:   "accent",
  success:  "success",
  warning:  "warning",
  header:   "text",
  muted:    "muted",
  // Extended names — these resolve to theme colors when available,
  // otherwise fall back to pastel hex values below.
  branch:   "accent",
  model:    "accent",
  thinking: "warning",
  label:    "muted",
  tokIn:    "success",
  tokOut:   "warning",
  context:  "accent",
  sep:      "muted",
  cost:     "success",
} as const;

// Pastel fallback palette — mirrors the footer statusline colors so the
// sidebar matches even before the pi theme is injected.
const FALLBACK_HEX: Record<string, string> = {
  accent:   "#a8cfa3",  // pastel green (matches footer tokIn)
  success:  "#a8e6a3",  // pastel green
  warning:  "#ff9aa2",  // pastel red (matches footer tokOut)
  text:     "#b8c0ff",  // pastel periwinkle (matches footer model)
  muted:    "#aaa6c2",  // muted lavender (matches footer label)
  branch:   "#ffbe98",  // soft peach (matches footer branch)
  model:    "#b8c0ff",  // pastel periwinkle
  thinking: "#ffe28a",  // soft sunshine (matches footer thinking)
  label:    "#aaa6c2",  // muted lavender
  tokIn:    "#a8e6a3",  // pastel green
  tokOut:   "#ff9aa2",  // pastel red
  context:  "#c3b1e1",  // soft lavender (matches footer context)
  sep:      "#504c60",  // muted plum (matches footer sep)
  cost:     "#98e4c6",  // pastel mint (matches footer costTotal)
};

let _piTheme: any = null;

export function setPiTheme(t: any): void {
  _piTheme = t;
}

export function bold(text: string): string {
  if (_piTheme) return _piTheme.bold(text);
  return `${BOLD}${text}${RESET}`;
}

export function dim(text: string): string {
  if (_piTheme) return _piTheme.fg("dim", text);
  return `${DIM_CODE}${text}${RESET}`;
}

export function fg(colorName: string, text: string): string {
  if (_piTheme) {
    // Try the theme color name; if the theme doesn't know it, fall back to hex.
    try {
      return _piTheme.fg(colorName, text);
    } catch {
      // fall through to hex
    }
  }
  const hex = FALLBACK_HEX[colorName] ?? FALLBACK_HEX.muted ?? "#aaa6c2";
  return `${hexToAnsi(hex)}${text}${RESET}`;
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
