import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type {
  TodoState,
  TodoDetails,
  TodoItem,
  TodoStatus,
  CreateTodoInput,
} from "./types.js";
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

/**
 * True when the list has at least one item and every item is `completed`.
 * Used by the auto-clean logic to detect a round that the agent finished but
 * forgot to terminate with `clean`.
 */
export function isAllCompleted(state: TodoState): boolean {
  return state.todos.length > 0 && state.todos.every((t) => t.status === "completed");
}

/**
 * Walk the current branch and load the most recent snapshot.
 *
 * Auto-clean heuristic: if the last todo toolResult shows "all completed"
 * AND the branch has at least one more entry after it (any subsequent
 * action by the agent or the user), treat the round as already cleaned and
 * reset to EMPTY_STATE. This mirrors the in-memory `turn_end` cleanup so
 * the dirty state does not resurrect on session reload.
 */
export function readState(ctx: ExtensionContext): TodoState {
  const branch = ctx.sessionManager.getBranch();
  let state: TodoState = { ...EMPTY_STATE };
  let lastTodoResultIdx = -1;

  for (let i = 0; i < branch.length; i++) {
    const entry = branch[i];
    if (!entry || entry.type !== "message") continue;
    const msg = entry.message;
    if (msg.role !== "toolResult" || msg.toolName !== "todo") continue;
    const details = msg.details as TodoDetails | undefined;
    if (!details) continue;
    state = { todos: details.todos, nextId: details.nextId };
    lastTodoResultIdx = i;
  }

  if (
    lastTodoResultIdx >= 0 &&
    lastTodoResultIdx < branch.length - 1 &&
    isAllCompleted(state)
  ) {
    state = { ...EMPTY_STATE };
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
    reset(next) {
      state = {
        todos: next.todos.map((t) => ({ ...t })),
        nextId: next.nextId,
      };
    },
  };
}
