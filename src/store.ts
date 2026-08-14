import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TodoState, TodoDetails, TodoItem } from "./types.js";
import { EMPTY_STATE } from "./types.js";
import type { TodoInput } from "./schema.js";

// ----------------------------------------------------------------------------
// Pure functions — no closure over mutable state.
// ----------------------------------------------------------------------------

/** Defensive copy for persistence — callers must not share the returned array. */
export function snapshot(state: TodoState): TodoState {
  return {
    todos: state.todos.map((t) => ({ ...t })),
    nextId: state.nextId,
  };
}

export function detailsFor(action: TodoInput["action"], state: TodoState): TodoDetails {
  return { action, ...snapshot(state) };
}

/** Walk the current branch and load the most recent snapshot. */
export function readState(ctx: ExtensionContext): TodoState {
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
// Mutable store — scoped to one extension instance / session.
// ----------------------------------------------------------------------------

export interface TodoStore {
  /** Live state. Reads always return the latest snapshot. */
  readonly state: TodoState;
  add(summary: string, goal: string): TodoItem;
  delete(id: number): TodoItem;
  list(): readonly TodoItem[];
  /** Replace state from a freshly-read branch snapshot (session_start / session_tree). */
  reset(state: TodoState): void;
}

export function createStore(): TodoStore {
  let state: TodoState = { ...EMPTY_STATE };

  return {
    get state() { return state; },
    add(summary, goal) {
      const item: TodoItem = { id: state.nextId++, summary, goal };
      state.todos.push(item);
      return item;
    },
    delete(id) {
      const idx = state.todos.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error(`todo #${id} not found`);
      const removed = state.todos.splice(idx, 1)[0]!;
      return removed;
    },
    list() {
      return state.todos;
    },
    reset(next) {
      state = {
        todos: next.todos.map((t) => ({ ...t })),
        nextId: next.nextId,
      };
    },
  };
}