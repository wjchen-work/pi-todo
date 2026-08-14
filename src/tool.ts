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

// ----------------------------------------------------------------------------
// Tool registration
// ----------------------------------------------------------------------------

export function registerTodoTool(pi: ExtensionAPI, store: TodoStore): void {
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
          const items = handleList(store);
          const text = items.length === 0
            ? "No todos"
            : items
              .map((t) => `#${t.id} [summary] ${t.summary}\n         [goal] ${t.goal}`)
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