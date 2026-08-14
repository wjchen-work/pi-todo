import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TodoState, TodoDetails, TodoItem, TodoStatus } from "./types.js";
import { DEFAULT_STATUS, EMPTY_STATE } from "./types.js";
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

/**
 * Backfill legacy todo items persisted before `status` existed. Items without
 * a status field are treated as `pending`. New items always have a status set
 * by the store, so this is only relevant when replaying old sessions.
 */
export function normalize(todos: TodoItem[]): TodoItem[] {
  return todos.map((t) => (t.status ? t : { ...t, status: DEFAULT_STATUS }));
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
  state.todos = normalize(state.todos);
  return state;
}

// ----------------------------------------------------------------------------
// State-machine helpers
// ----------------------------------------------------------------------------

/**
 * Allowed transitions between statuses. Encoded as a map from current → set of
 * valid next states. The map is small enough to keep inline; rejecting an
 * invalid transition throws so the tool layer can surface a clear error to the
 * LLM.
 */
const TRANSITIONS: Record<TodoStatus, ReadonlySet<TodoStatus>> = {
  pending: new Set(["pending", "in_progress", "completed"]),
  in_progress: new Set(["in_progress", "completed"]),
  completed: new Set(["completed", "pending"]),
};

/** Throws if `next` is not reachable from `current`. */
export function assertTransition(current: TodoStatus, next: TodoStatus): void {
  if (!TRANSITIONS[current].has(next)) {
    throw new Error(`cannot transition todo from "${current}" to "${next}"`);
  }
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
  /** Move a todo to `in_progress`. */
  start(id: number): TodoItem;
  /** Mark a todo as completed. */
  complete(id: number): TodoItem;
  /** Reopen a completed todo back to pending. */
  reopen(id: number): TodoItem;
  /** Empty the list and reset nextId to 1 — used between rounds of work. */
  clear(): void;
  /** Replace state from a freshly-read branch snapshot (session_start / session_tree). */
  reset(state: TodoState): void;
}

function findTodo(state: TodoState, id: number): TodoItem {
  const idx = state.todos.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`todo #${id} not found`);
  const todo = state.todos[idx]!;
  return todo;
}

function transition(state: TodoState, id: number, next: TodoStatus): TodoItem {
  const todo = findTodo(state, id);
  assertTransition(todo.status, next);
  todo.status = next;
  return todo;
}

export function createStore(): TodoStore {
  let state: TodoState = { ...EMPTY_STATE };

  return {
    get state() { return state; },
    add(summary, goal) {
      const item: TodoItem = {
        id: state.nextId++,
        status: DEFAULT_STATUS,
        summary,
        goal,
      };
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
    start(id) {
      return transition(state, id, "in_progress");
    },
    complete(id) {
      return transition(state, id, "completed");
    },
    reopen(id) {
      return transition(state, id, "pending");
    },
    clear() {
      state.todos = [];
      state.nextId = 1;
    },
    reset(next) {
      state = {
        todos: next.todos.map((t) => ({ ...t })),
        nextId: next.nextId,
      };
    },
  };
}
