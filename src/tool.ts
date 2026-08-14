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
  "action=\"clean\" to empty the list.";

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
  if (params.summary === undefined) {
    throw new Error("summary is required for start");
  }
  return store.start(params.summary);
}

export function handleComplete(store: TodoStore, params: TodoInput): TodoItem {
  if (params.summary === undefined) {
    throw new Error("summary is required for complete");
  }
  return store.complete(params.summary);
}

export function handleReopen(store: TodoStore, params: TodoInput): TodoItem {
  if (params.summary === undefined) {
    throw new Error("summary is required for reopen");
  }
  return store.reopen(params.summary);
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
      "In-memory todo list for the current session. Use it for multi-step work that benefits from planning and progress tracking.",
    promptSnippet: "Plan and track multi-step work in one session",
    promptGuidelines: [
      "Use the todo tool when a user request breaks into multiple discrete steps that benefit from planning and progress tracking.",
      "When every step is delivered, close the round by calling todo with action=\"clean\" so the next request starts fresh.",
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
                return `[${status}] [summary] ${t.summary}\n         [goal]    ${t.goal}`;
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
            ? `Created todo: ${items[0]!.summary}`
            : `Created ${items.length} todos: ${items.map((i) => `"${i.summary}"`).join(", ")}`;
          return {
            content: [{ type: "text", text: header }],
            details: undefined,
          };
        }

        case "start": {
          const item = handleStart(store, params);
          return {
            content: [{ type: "text", text: `Started todo: ${item.summary}` }],
            details: undefined,
          };
        }

        case "complete": {
          const item = handleComplete(store, params);
          const hint = isAllCompleted(store.state) ? `\n${ALL_COMPLETED_HINT}` : "";
          return {
            content: [{
              type: "text",
              text: `Completed todo: ${item.summary}${hint}`,
            }],
            details: undefined,
          };
        }

        case "reopen": {
          const item = handleReopen(store, params);
          return {
            content: [{ type: "text", text: `Reopened todo: ${item.summary}` }],
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
      if (args.summary !== undefined) {
        content += ` ${theme.fg("accent", `"${args.summary}"`)}`;
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