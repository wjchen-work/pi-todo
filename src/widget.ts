import { truncateToWidth, type Component } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";
import type { TodoState } from "./types.js";
import { MAX_DISPLAY } from "./types.js";

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
      return [truncateToWidth(th.fg("dim", "No todos"), width)];
    }

    const visible = todos.slice(0, MAX_DISPLAY);
    const hiddenCount = todos.length - visible.length;

    const lines: string[] = [];
    for (const todo of visible) {
      const idLabel = th.fg("accent", `#${todo.id}`);
      const summary = th.fg("text", todo.summary);
      lines.push(truncateToWidth(`  ${idLabel} ${summary}`, width));
    }

    if (hiddenCount > 0) {
      lines.push(truncateToWidth(th.fg("dim", `  +${hiddenCount} more...`), width));
    }

    return lines;
  }
}