import { truncateToWidth, type Component } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";
import type { TodoItem, TodoState, TodoStatus } from "./types.js";
import { MAX_DISPLAY } from "./types.js";

// SGR codes. SGR 9 enables strikethrough; SGR 29 disables it without
// disturbing the foreground color set by `theme.fg(...)`.
const STRIKETHROUGH_OPEN = "\x1b[9m";
const STRIKETHROUGH_CLOSE = "\x1b[29m";

/**
 * Status-based render order. Items earlier in this array are shown higher in
 * the widget; items not listed (`completed`) fall to the bottom. Stable within
 * each bucket, so insertion order is preserved as a secondary key.
 */
const STATUS_ORDER: readonly TodoStatus[] = ["in_progress", "pending", "completed"];

/**
 * Reads state via a getter on every render so the widget always reflects
 * the current in-memory state without explicit invalidation.
 */
export class TodoWidget implements Component {
  constructor(
    private readonly getState: () => TodoState,
    private readonly theme: Theme,
  ) { }

  invalidate(): void {
    // No cached state to clear; render() reads fresh data each call.
  }

  render(width: number): string[] {
    const { todos } = this.getState();
    const th = this.theme;

    if (todos.length === 0) {
      // Empty state: render nothing so the widget disappears entirely
      // (no "No todos" placeholder, no blank line).
      return [];
    }

    const sorted = [...todos].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );

    const visible = sorted.slice(0, MAX_DISPLAY);
    const hiddenCount = sorted.length - visible.length;

    const lines: string[] = [];
    for (const todo of visible) {
      lines.push(truncateToWidth(`  ${formatTodo(todo, th)}`, width));
    }

    if (hiddenCount > 0) {
      lines.push(truncateToWidth(th.fg("dim", `  +${hiddenCount} more...`), width));
    }

    return lines;
  }
}

/**
 * Render a single todo line according to its status. Pure — no side effects,
 * no shared state — so callers can compose it freely.
 */
function formatTodo(todo: TodoItem, th: Theme): string {
  const idLabel = th.fg("accent", `#${todo.id}`);
  const summary = styleSummary(todo.summary, todo.status, th);
  return `${idLabel} ${summary}`;
}

function styleSummary(summary: string, status: TodoStatus, th: Theme): string {
  switch (status) {
    case "in_progress":
      // Brightest (default `text` color) so the active item stands out.
      return th.fg("text", summary);
    case "pending":
      // Greyer than `text`, but not as muted as `dim`.
      return th.fg("muted", summary);
    case "completed":
      // Greyed out + strikethrough; nested so the FG color still applies.
      return `${STRIKETHROUGH_OPEN}${th.fg("muted", summary)}${STRIKETHROUGH_CLOSE}`;
  }
}
