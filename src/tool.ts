import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import type { TodoItem } from "./types.js";
import { TodoParams, type TodoInput } from "./schema.js";
import type { TodoStore } from "./store.js";
import { detailsFor } from "./store.js";

// ----------------------------------------------------------------------------
// Handlers — pure business logic. `execute()` wraps them into tool results.
// ----------------------------------------------------------------------------

export function handleList(store: TodoStore): readonly TodoItem[] {
  return store.list();
}

export function handleAdd(store: TodoStore, params: TodoInput): TodoItem {
  if (!params.summary || !params.goal) {
    throw new Error("both summary and goal are required for add");
  }
  return store.add(params.summary, params.goal);
}

export function handleDelete(store: TodoStore, params: TodoInput): TodoItem {
  if (params.id === undefined) {
    throw new Error("id is required for delete");
  }
  return store.delete(params.id);
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

// ----------------------------------------------------------------------------
// Tool registration
// ----------------------------------------------------------------------------

export function registerTodoTool(pi: ExtensionAPI, store: TodoStore): void {
  pi.registerTool({
    name: "todo",
    label: "Todo",
    description:
      "Manage a persistent todo list. Each item has a short summary (shown in the editor widget), a longer goal (private to the agent), and a lifecycle status (pending / in_progress / completed). Actions: add (requires summary + goal; starts as pending), delete (requires id), list, start (requires id; pending -> in_progress), complete (requires id; marks as completed), reopen (requires id; completed -> pending).",
    promptSnippet: "Track tasks via a persistent todo list (summary + goal)",
    promptGuidelines: [
      "Use todo to track multi-step work. Call todo with action=\"add\" and provide both summary and goal when starting a new task (the new item starts as pending).",
      "Call action=\"start\" with the item id when you begin working on a todo; the widget renders active items in bright text.",
      "Call action=\"complete\" with the item id when a todo is done; completed items move to the bottom of the widget with a strikethrough.",
      "Call action=\"reopen\" with the item id if a completed todo needs to be revisited; it goes back to pending.",
      "Call action=\"delete\" with the item id when the todo is no longer relevant at all.",
      "Call action=\"list\" to see every item including the private goal text.",
    ],
    parameters: TodoParams,

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      switch (params.action) {
        case "list": {
          const items = handleList(store);
          const text = items.length === 0
            ? "No todos"
            : items
              .map((t) => {
                const status = t.status.padEnd(11);
                return `#${t.id} [${status}] [summary] ${t.summary}\n         [goal]    ${t.goal}`;
              })
              .join("\n");
          return {
            content: [{ type: "text", text }],
            details: detailsFor("list", store.state),
          };
        }

        case "add": {
          const item = handleAdd(store, params);
          return {
            content: [{ type: "text", text: `Added todo #${item.id}: ${item.summary}` }],
            details: detailsFor("add", store.state),
          };
        }

        case "delete": {
          const item = handleDelete(store, params);
          return {
            content: [{ type: "text", text: `Deleted todo #${item.id}: ${item.summary}` }],
            details: detailsFor("delete", store.state),
          };
        }

        case "start": {
          const item = handleStart(store, params);
          return {
            content: [{ type: "text", text: `Started todo #${item.id}: ${item.summary}` }],
            details: detailsFor("start", store.state),
          };
        }

        case "complete": {
          const item = handleComplete(store, params);
          return {
            content: [{ type: "text", text: `Completed todo #${item.id}: ${item.summary}` }],
            details: detailsFor("complete", store.state),
          };
        }

        case "reopen": {
          const item = handleReopen(store, params);
          return {
            content: [{ type: "text", text: `Reopened todo #${item.id}: ${item.summary}` }],
            details: detailsFor("reopen", store.state),
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
