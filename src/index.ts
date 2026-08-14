/**
 * pi-todo Extension
 *
 * Provides a todo list for the agent:
 * - A `todo` tool with `add` / `delete` / `list` actions
 * - Each item has a short `summary` (shown in the widget) and a longer `goal` (for the agent)
 * - A widget above the editor shows up to 4 summaries and a `+N more` hint
 *   for the hidden remainder
 *
 * State is persisted in tool result `details` so branching/forking reconstructs
 * the correct list for the current branch.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { Text, truncateToWidth, type Component } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface TodoItem {
  id: number;
  summary: string;
  goal: string;
}

interface TodoState {
  todos: TodoItem[];
  nextId: number;
}

interface TodoDetails {
  action: "add" | "delete" | "list";
  todos: TodoItem[];
  nextId: number;
}

const EMPTY_STATE: TodoState = { todos: [], nextId: 1 };
const MAX_DISPLAY = 4;

// ----------------------------------------------------------------------------
// Tool schema
// ----------------------------------------------------------------------------

const TodoParams = Type.Object({
  action: StringEnum(["add", "delete", "list"] as const),
  summary: Type.Optional(
    Type.String({ description: "Short summary of the item, shown in the widget (required for add)" }),
  ),
  goal: Type.Optional(
    Type.String({ description: "Detailed goal / description of the item (required for add)" }),
  ),
  id: Type.Optional(Type.Number({ description: "Todo item ID (required for delete)" })),
});

export type TodoInput = Static<typeof TodoParams>;

// ----------------------------------------------------------------------------
// State helpers
// ----------------------------------------------------------------------------

/** Defensive copy for persistence — callers must not share the returned array. */
function snapshot(state: TodoState): TodoState {
  return {
    todos: state.todos.map((t) => ({ ...t })),
    nextId: state.nextId,
  };
}

function detailsFor(action: TodoInput["action"], state: TodoState): TodoDetails {
  return { action, ...snapshot(state) };
}

/** Walk the current branch and load the most recent snapshot. */
function readState(ctx: ExtensionContext): TodoState {
  let state: TodoState = { ...EMPTY_STATE };
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type !== "message") continue;
    const msg = entry.message;
    if (msg.role !== "toolResult" || msg.toolName !== "todo") continue;
    const details = msg.details as TodoDetails | undefined;
    if (!details) continue;
    state = { todos: details.todos, nextId: details.nextId };
  }
  return state;
}

// ----------------------------------------------------------------------------
// Widget
// ----------------------------------------------------------------------------

/**
 * Reads state via a getter on every render so the widget always reflects
 * the current in-memory state without explicit invalidation.
 */
class TodoWidget implements Component {
  private readonly getState: () => TodoState;
  private readonly theme: Theme;

  constructor(getState: () => TodoState, theme: Theme) {
    this.getState = getState;
    this.theme = theme;
  }

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

// ----------------------------------------------------------------------------
// Extension factory
// ----------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // Single source of truth, scoped to this extension instance (a new factory
  // call is made for each session).
  let state: TodoState = { ...EMPTY_STATE };

  function syncWidget(ctx: ExtensionContext): void {
    if (!ctx.hasUI) return;
    ctx.ui.setWidget(
      "pi-todo",
      (_tui, theme) => new TodoWidget(() => state, theme),
      { placement: "aboveEditor" },
    );
  }

  pi.on("session_start", async (_event, ctx) => {
    state = readState(ctx);
    syncWidget(ctx);
  });

  pi.on("session_tree", async (_event, ctx) => {
    state = readState(ctx);
  });

  pi.registerTool({
    name: "todo",
    label: "Todo",
    description:
			"Manage a persistent todo list. Each item has a short summary (shown in the editor widget) and a longer goal (private to the agent). Actions: add (requires summary + goal), delete (requires id), list.",
    promptSnippet: "Track tasks via a persistent todo list (summary + goal)",
    promptGuidelines: [
      "Use todo to track multi-step work. Call todo with action=\"add\" and provide both summary and goal when starting a new task; call with action=\"delete\" and the item id when a task is done; call action=\"list\" to see all items including their goal text.",
    ],
    parameters: TodoParams,

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      switch (params.action) {
        case "list": {
          const text = state.todos.length === 0
            ? "No todos"
            : state.todos
              .map((t) => `#${t.id} [summary] ${t.summary}\n         [goal] ${t.goal}`)
              .join("\n");
          return {
            content: [{ type: "text", text }],
            details: detailsFor("list", state),
          };
        }

        case "add": {
          if (!params.summary || !params.goal) {
            throw new Error("both summary and goal are required for add");
          }
          const newTodo: TodoItem = { id: state.nextId++, summary: params.summary, goal: params.goal };
          state.todos.push(newTodo);
          return {
            content: [{ type: "text", text: `Added todo #${newTodo.id}: ${newTodo.summary}` }],
            details: detailsFor("add", state),
          };
        }

        case "delete": {
          if (params.id === undefined) {
            throw new Error("id is required for delete");
          }
          const idx = state.todos.findIndex((t) => t.id === params.id);
          if (idx === -1) {
            throw new Error(`todo #${params.id} not found`);
          }
          const removed = state.todos[idx]!;
          state.todos.splice(idx, 1);
          return {
            content: [{ type: "text", text: `Deleted todo #${removed.id}: ${removed.summary}` }],
            details: detailsFor("delete", state),
          };
        }
      }
    },

    renderCall(args, theme, context) {
      const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
      let content = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", args.action);
      if (args.summary) {
        content += ` ${theme.fg("dim", `"${args.summary}"`)}`;
      }
      if (args.id !== undefined) {
        content += ` ${theme.fg("accent", `#${args.id}`)}`;
      }
      text.setText(content);
      return text;
    },

    renderResult(result, _options, theme, context) {
      const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
      const first = result.content[0];
      const msg = first?.type === "text" ? first.text : "";
      text.setText(theme.fg("success", "✓ ") + theme.fg("muted", msg));
      return text;
    },
  });
}
