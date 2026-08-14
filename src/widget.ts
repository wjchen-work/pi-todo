import { Text, type Component } from "@earendil-works/pi-tui";
import type { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import type { TodoItem, TodoState, TodoStatus } from "./types.js";
import { MAX_DISPLAY } from "./types.js";

/**
 * Status-based render order. Items earlier in this array are shown higher in
 * the widget; insertion order is preserved as a secondary key.
 */
const STATUS_ORDER: readonly TodoStatus[] = ["in_progress", "pending", "completed"];

/**
 * Bullet character used as the visual marker for every todo line.
 * A single character keeps width budgeting trivial; ANSI styling handles
 * per-status emphasis instead of swapping glyphs.
 */
const BULLET = "•";

/**
 * Per-status foreground color pulled from the active theme. Centralised so
 * the mapping is one obvious place to tweak.
 * - in_progress → `accent`: visually pops as the active step.
 * - pending     → `dim`:    present but subdued.
 * - completed   → `muted`:  lowest contrast; paired with strikethrough below.
 */
const STATUS_COLOR: Record<TodoStatus, ThemeColor> = {
  in_progress: "accent",
  pending: "dim",
  completed: "muted",
};

/**
 * Reads state via a getter on every render so the widget always reflects
 * the current in-memory state without explicit invalidation.
 *
 * The body is rendered through pi's plain `Text` component — no markdown
 * parsing, no `**bold**` / `~~strike~~` inline syntax. Each line is a
 * themed `• summary` string; status is conveyed by color and (for completed)
 * by strikethrough.
 */
export class TodoWidget implements Component {
  private readonly text: Text;

  constructor(
    private readonly getState: () => TodoState,
    private readonly theme: Theme,
  ) {
    this.text = new Text("", 0, 0);
  }

  invalidate(): void {
    this.text.invalidate();
  }

  render(width: number): string[] {
    const { todos } = this.getState();

    if (todos.length === 0) {
      // Empty state: render nothing so the widget disappears entirely
      // (no placeholder, no blank line).
      return [];
    }

    const sorted = [...todos].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );

    const visible = sorted.slice(0, MAX_DISPLAY);
    const hiddenCount = sorted.length - visible.length;

    const lines = visible.map((todo) => formatTodoLine(this.theme, todo));
    if (hiddenCount > 0) {
      lines.push(this.theme.fg("dim", `${BULLET} +${hiddenCount} more...`));
    }

    this.text.setText(lines.join("\n"));
    return this.text.render(width);
  }
}

/**
 * Render a single todo line as a themed `• summary` string. Pure — the only
 * side effect is calling pure theme helpers.
 *
 * No `#N` prefix and no `[ ]` checkbox — status is expressed purely through
 * color and (for completed) strikethrough. The id is still available to the
 * LLM via the `list` action.
 */
function formatTodoLine(theme: Theme, todo: TodoItem): string {
  const color = STATUS_COLOR[todo.status];
  const bullet = theme.fg(color, BULLET);
  const summary = theme.fg(
    color,
    todo.status === "completed" ? theme.strikethrough(todo.summary) : todo.summary,
  );
  return `${bullet} ${summary}`;
}