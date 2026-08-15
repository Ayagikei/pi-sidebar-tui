import { truncateToWidth } from "@earendil-works/pi-tui";
import type { SidebarContext } from "./types.ts";
import { renderSidebar } from "./sidebar.ts";
import { dim } from "./colors.ts";

// No forced background — let the terminal's own bg show through.
// The original black bg (\x1b[48;2;0;0;0m) looked out of place on
// themed terminals (e.g. everforest).

function moveCursor(row: number, col: number): string {
  return `\x1b[${row};${col}H`;
}

function descriptorFor(obj: object, key: string): PropertyDescriptor | undefined {
  let target: object | null = obj;
  while (target) {
    const d = Object.getOwnPropertyDescriptor(target, key);
    if (d) return d;
    target = Object.getPrototypeOf(target);
  }
  return undefined;
}

export class SidebarCompositor {
  private tui: any;
  private terminal: any;
  private getCtx: () => SidebarContext;
  private originalColumnsDesc: PropertyDescriptor | undefined;
  private originalDoRender: (() => void) | null = null;
  private originalWrite: (data: string) => void;
  private disposed = false;

  private readonly sidebarWidth: number;
  private scrollOffset = 0;
  private lastLineCount = 0;

  constructor(tui: any, getCtx: () => SidebarContext, sidebarWidth = 40) {
    this.tui = tui;
    this.terminal = tui.terminal;
    this.getCtx = getCtx;
    this.originalWrite = this.terminal.write.bind(this.terminal);
    this.sidebarWidth = sidebarWidth;
  }

  install(): void {
    // Narrow terminal.columns so pi renders in the left portion only.
    this.originalColumnsDesc = descriptorFor(this.terminal, "columns");
    const origDesc = this.originalColumnsDesc;
    const terminal = this.terminal;

    Object.defineProperty(terminal, "columns", {
      configurable: true,
      enumerable: true,
      get() {
        const d = origDesc;
        const raw = d?.get ? (d.get.call(terminal) ?? 80) : (typeof d?.value === "number" ? d.value : 80);
        return Math.max(1, raw - 40 - 1);
      },
    });

    // Paint sidebar after every pi render cycle
    if (typeof this.tui.doRender === "function") {
      this.originalDoRender = this.tui.doRender.bind(this.tui);
      const self = this;
      this.tui.doRender = function () {
        if (self.disposed) { self.originalDoRender?.(); return; }
        self.originalDoRender!();
        self.paint();
      };
    }
  }

  paint(): void {
    if (this.disposed) return;
    const rawRows = this.terminal.rows;
    const d = this.originalColumnsDesc;
    const rawCols = d?.get ? (d.get.call(this.terminal) ?? 80) : (typeof d?.value === "number" ? d.value : 80);
    const sw = this.sidebarWidth;
    const sepCol = rawCols - sw;
    const sidebarCol = sepCol + 1;
    const ctx = this.getCtx();
    const allLines = renderSidebar(ctx, sw);
    this.lastLineCount = allLines.length;

    // Clamp scroll offset to valid range
    const maxOffset = Math.max(0, allLines.length - rawRows);
    if (this.scrollOffset > maxOffset) this.scrollOffset = maxOffset;
    if (this.scrollOffset < 0) this.scrollOffset = 0;

    // Lines visible in the current viewport (from scrollOffset)
    const lines = allLines.slice(this.scrollOffset, this.scrollOffset + rawRows);

    let buf = "\x1b[?2026h"; // begin synchronized output
    buf += "\x1b7";          // save cursor (DECSC)
    buf += "\x1b[?7l";       // disable auto-wrap

    for (let row = 1; row <= rawRows; row++) {
      buf += moveCursor(row, sepCol);
      buf += dim("│");
      buf += moveCursor(row, sidebarCol);
      const line = lines[row - 1];
      buf += line !== undefined
        ? truncateToWidth(line, sw, "", true)
        : " ".repeat(sw);
    }

    // Scroll indicators: show arrows on the separator when content overflows
    const hasMoreUp = this.scrollOffset > 0;
    const hasMoreDown = this.scrollOffset < maxOffset;
    if (hasMoreUp) {
      buf += moveCursor(1, sepCol);
      buf += dim("↑");
    }
    if (hasMoreDown) {
      buf += moveCursor(rawRows, sepCol);
      buf += dim("↓");
    }

    buf += "\x1b[?7h";       // enable auto-wrap
    buf += "\x1b8";          // restore cursor (DECRC)
    buf += "\x1b[?2026l";    // end synchronized output

    this.originalWrite(buf);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.originalColumnsDesc) {
      Object.defineProperty(this.terminal, "columns", this.originalColumnsDesc);
    } else {
      Reflect.deleteProperty(this.terminal, "columns");
    }

    if (this.originalDoRender !== null) {
      this.tui.doRender = this.originalDoRender;
    }
  }

  scroll(delta: number): void {
    if (this.disposed) return;
    const maxOffset = Math.max(0, this.lastLineCount - this.terminal.rows);
    this.scrollOffset = Math.max(0, Math.min(maxOffset, this.scrollOffset + delta));
    this.paint();
  }

  get canScrollUp(): boolean { return this.scrollOffset > 0; }
  get canScrollDown(): boolean { return this.scrollOffset < this.lastLineCount - this.terminal.rows; }
}
