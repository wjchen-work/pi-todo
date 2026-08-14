import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import type { TodoItem } from "./types.js";
import { TodoParams, type TodoInput } from "./schema.js";
import type { TodoStore } from "./store.js";
import { isAllCompleted } from "./store.js";

// ----------------------------------------------------------------------------
// Handlers — pure business logic. `execute()` wraps them into tool results.
// ----------------------------------------------------------------------------

/** Reminder appended to results when every todo is `completed`. */
const ALL_COMPLETED_HINT =
  "All todos are completed. If this round of work is finished, call todo with " +
  "action=\"clean\" to empty the list and reset id numbering.";

export function handleList(store: TodoStore): readonly TodoItem[] {
  return store.list();
}

export function handleCreate(store: TodoStore, params: TodoInput): TodoItem[] {
  if (!params.items || params.items.length === 0) {
    throw new Error("items (at least one) is required for create");
  }
  return store.create(params.items);
}

export function handleStart(store: TodoStore, params: TodoInput): TodoItem {
  if (params.id === undefined) {
    throw new Error("id is required for start");
  }
  return store.start(params.id);
}

export function handleComplete(store: TodoStore, params: TodoInput): TodoItem {
  if (params.id === undefined) {
    throw new Error("id is required for complete");
  }
  return store.complete(params.id);
}

export function handleReopen(store: TodoStore, params: TodoInput): TodoItem {
  if (params.id === undefined) {
    throw new Error("id is required for reopen");
  }
  return store.reopen(params.id);
}

export function handleClean(store: TodoStore): number {
  const removed = store.state.todos.length;
  store.clear();
  return removed;
}

// ----------------------------------------------------------------------------
// Tool registration
// ----------------------------------------------------------------------------

export function registerTodoTool(pi: ExtensionAPI, store: TodoStore): void {
  pi.registerTool({
    name: "todo",
    label: "Todo",
    description:
      "Manage an in-memory todo list for one round of work. Each item has a short summary (shown in the editor widget) and a longer goal (private to the agent); every item also carries a lifecycle status (pending / in_progress / completed). Actions: create (requires items[]; each item has summary + goal; the whole batch is committed atomically and each item starts as pending), list, start (requires id; pending -> in_progress), complete (requires id; marks as completed), reopen (requires id; completed -> pending), clean (no args; empties the list and resets id counter to 1 — call this at the end of a round of work). Items are never individually removed; if a step is no longer relevant, reopen it back to pending and let clean drop the whole list at round end.",
    promptSnippet: "Track tasks via an in-memory todo list (summary + goal)",
    promptGuidelines: [
      "Use todo to track multi-step work as discrete rounds. At the start of a round (a new user request), batch-create the full todo list in ONE action=\"create\" call with items: [{summary, goal}, ...] — do not call create multiple times and do not mix in other actions before planning is complete.",
      "As you progress, call action=\"start\" with the item id when you begin a step, then action=\"complete\" with the item id when it is done. The widget renders the current status above the editor.",
      "Call action=\"reopen\" with the item id if a completed step needs to be revisited; it goes back to pending. Use this instead of deleting — individual items cannot be removed.",
      "When the round's request is fully implemented, call action=\"clean\" once to empty the list and reset id numbering. Do not call clean mid-round — only after every todo for the current request is completed.",
      "The `list` and `complete` results append a reminder whenever every todo is completed — treat that reminder as the signal the round is done and call action=\"clean\" once.",
      "Call action=\"list\" to see every item including the private goal text and current status.",
    ],
    parameters: TodoParams,

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      switch (params.action) {
        case "list": {
          const items = handleList(store);
          let text = items.length === 0
            ? "No todos"
            : items
              .map((t) => {
                const status = t.status.padEnd(11);
                return `#${t.id} [${status}] [summary] ${t.summary}\n         [goal]    ${t.goal}`;
              })
              .join("\n");
          if (isAllCompleted(store.state)) {
            text += `\n${ALL_COMPLETED_HINT}`;
          }
          return {
            content: [{ type: "text", text }],
            details: undefined,
          };
        }

        case "create": {
          const items = handleCreate(store, params);
          const header = items.length === 1
            ? `Created todo #${items[0]!.id}: ${items[0]!.summary}`
            : `Created ${items.length} todos: ${items.map((i) => `#${i.id}`).join(", ")}`;
          return {
            content: [{ type: "text", text: header }],
            details: undefined,
          };
        }

        case "start": {
          const item = handleStart(store, params);
          return {
            content: [{ type: "text", text: `Started todo #${item.id}: ${item.summary}` }],
            details: undefined,
          };
        }

        case "complete": {
          const item = handleComplete(store, params);
          const hint = isAllCompleted(store.state) ? `\n${ALL_COMPLETED_HINT}` : "";
          return {
            content: [{
              type: "text",
              text: `Completed todo #${item.id}: ${item.summary}${hint}`,
            }],
            details: undefined,
          };
        }

        case "reopen": {
          const item = handleReopen(store, params);
          return {
            content: [{ type: "text", text: `Reopened todo #${item.id}: ${item.summary}` }],
            details: undefined,
          };
        }

        case "clean": {
          const removed = handleClean(store);
          return {
            content: [{
              type: "text",
              text: removed === 0
                ? "Todo list is already empty"
                : `Cleared ${removed} todo${removed === 1 ? "" : "s"}`,
            }],
            details: undefined,
          };
        }
      }
    },

    renderCall(args, theme, context) {
      const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
      let content = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", args.action);
      if (args.items && args.items.length > 0) {
        const count = args.items.length;
        const first = args.items[0]!;
        const preview = count === 1
          ? `"${first.summary}"`
          : `"${first.summary}"${theme.fg("dim", ` (+${count - 1} more)`)}`;
        content += ` ${theme.fg("dim", preview)}`;
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