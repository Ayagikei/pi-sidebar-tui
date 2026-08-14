import { visibleWidth } from "@earendil-works/pi-tui";
import type { SidebarContext, TodoItem, TodoStatus } from "../types.ts";
import { dim, fg, COLORS, panelHeader, trunc } from "../colors.ts";

const GLYPHS: Record<TodoStatus, string> = {
  completed: "✓",
  in_progress: "●",
  pending: "○",
};

const GLYPH_COLORS: Record<TodoStatus, string> = {
  completed: COLORS.success,
  in_progress: COLORS.accent,
  pending: COLORS.muted,
};

const INDENT = 2; // glyph(1) + space(1)
const CONTINUE_INDENT = 2; // continuation lines align under content

/** Wrap text to fit within maxWidth, returning an array of lines. */
function wrapText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [""];
  if (visibleWidth(text) <= maxWidth) return [text];

  const lines: string[] = [];
  let remaining = text;
  while (visibleWidth(remaining) > maxWidth && remaining.length > 0) {
    let cut = 0;
    let w = 0;
    for (const ch of remaining) {
      const cw = visibleWidth(ch);
      if (w + cw > maxWidth) break;
      cut += ch.length;
      w += cw;
    }
    if (cut === 0) cut = remaining.length;
    lines.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining.length > 0) lines.push(remaining);
  return lines;
}

function renderTodoLines(todo: TodoItem, width: number): string[] {
  const glyph = fg(GLYPH_COLORS[todo.status], GLYPHS[todo.status]);
  const contentMax = Math.max(0, width - INDENT);

  let text = todo.content;
  let subAction: string | null = null;
  if (todo.status === "in_progress" && todo.subAction) {
    subAction = `(${todo.subAction})`;
    text = todo.content;
  }

  const wrapped = wrapText(text, contentMax);
  const result: string[] = [];
  for (let i = 0; i < wrapped.length; i++) {
    if (i === 0) {
      let line = `${glyph} ${wrapped[i]}`;
      // Append sub-action on the first line if it fits, else on its own line
      if (subAction) {
        const remaining = contentMax - visibleWidth(wrapped[i]) - 1;
        if (remaining > visibleWidth(subAction) + 2) {
          line += dim(` (${subAction})`);
          subAction = null;
        }
      }
      result.push(line);
    } else {
      result.push(`${" ".repeat(CONTINUE_INDENT)}${dim(wrapped[i])}`);
    }
  }
  // Sub-action didn't fit on any content line — show it dimmed
  if (subAction) {
    result.push(`${" ".repeat(CONTINUE_INDENT)}${dim(`(${subAction})`)}`);
  }
  return result;
}

export function renderTodosPanel(ctx: SidebarContext, width: number): string[] {
  const { todos } = ctx;
  const done = todos.filter(t => t.status === "completed").length;
  const inProgress = todos.filter(t => t.status === "in_progress").length;
  const title = `Todos (${done}/${todos.length})`;
  const lines: string[] = [...panelHeader(title, width)];

  if (todos.length === 0) {
    lines.push(dim("  (no todos)"));
    return lines;
  }

  for (const todo of todos) {
    lines.push(...renderTodoLines(todo, width));
  }

  return lines;
}
