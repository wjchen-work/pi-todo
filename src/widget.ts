import { Markdown, type Component } from "@earendil-works/pi-tui";
import { getMarkdownTheme, type Theme } from "@earendil-works/pi-coding-agent";
import type { TodoItem, TodoState, TodoStatus } from "./types.js";
import { MAX_DISPLAY } from "./types.js";

/**
 * Status-based render order. Items earlier in this array are shown higher in
 * the widget; insertion order is preserved as a secondary key.
 */
const STATUS_ORDER: readonly TodoStatus[] = ["in_progress", "pending", "completed"];

/**
 * Reads state via a getter on every render so the widget always reflects
 * the current in-memory state without explicit invalidation.
 *
 * The body is rendered through pi's `Markdown` component so styling comes
 * from the markdown theme — no manual `theme.fg(...)` calls here. Status is
 * expressed through markdown syntax: completed items use `~~strikethrough~~`
 * together with a `[x]` task checkbox; the in-progress item is bolded so it
 * stands out among the pending ones.
 */
export class TodoWidget implements Component {
  private readonly markdown: Markdown;

  constructor(
    private readonly getState: () => TodoState,
    _theme: Theme,
  ) {
    this.markdown = new Markdown("", 0, 0, getMarkdownTheme());
  }

  invalidate(): void {
    this.markdown.invalidate();
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

    const lines = visible.map(formatTodoAsMarkdown);
    if (hiddenCount > 0) {
      lines.push(`*+${hiddenCount} more...*`);
    }

    this.markdown.setText(lines.join("\n"));
    return this.markdown.render(width);
  }
}

/**
 * Render a single todo line as a markdown list item. Pure — no side effects.
 */
function formatTodoAsMarkdown(todo: TodoItem): string {
  const id = `#${todo.id}`;
  switch (todo.status) {
    case "in_progress":
      // Bold so the active item stands out among pending ones.
      return `- [ ] ${id} **${todo.summary}**`;
    case "pending":
      return `- [ ] ${id} ${todo.summary}`;
    case "completed":
      // Task list checkbox + strikethrough; sorted to the bottom.
      return `- [x] ${id} ~~${todo.summary}~~`;
  }
}