import type {
  TodoState,
  TodoItem,
  TodoStatus,
  CreateTodoInput,
} from "./types.js";
import { DEFAULT_STATUS, EMPTY_STATE } from "./types.js";

// ----------------------------------------------------------------------------
// Pure functions — no closure over mutable state.
// ----------------------------------------------------------------------------

/**
 * True when the list has at least one item and every item is `completed`.
 * Used by the tool layer to remind the LLM (via the result text) that the
 * round looks done and it should call `clean`.
 */
export function isAllCompleted(state: TodoState): boolean {
  return state.todos.length > 0 && state.todos.every((t) => t.status === "completed");
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
  /** Batch-create one or more todos atomically. Returns the created items in input order. */
  create(items: ReadonlyArray<CreateTodoInput>): TodoItem[];
  list(): readonly TodoItem[];
  /** Move a todo to `in_progress`. */
  start(id: number): TodoItem;
  /** Mark a todo as completed. */
  complete(id: number): TodoItem;
  /** Reopen a completed todo back to pending. */
  reopen(id: number): TodoItem;
  /** Empty the list and reset nextId to 1 — used between rounds of work. */
  clear(): void;
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
  const state: TodoState = { ...EMPTY_STATE };

  return {
    get state() { return state; },
    create(items) {
      if (items.length === 0) {
        throw new Error("create requires at least one item");
      }
      const created: TodoItem[] = [];
      for (const input of items) {
        const item: TodoItem = {
          id: state.nextId++,
          status: DEFAULT_STATUS,
          summary: input.summary,
          goal: input.goal,
        };
        state.todos.push(item);
        created.push(item);
      }
      return created;
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
  };
}
