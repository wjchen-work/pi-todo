<div align="center">

# 📝 pi-todo

**An in-memory todo list for the pi coding agent.**

Give your model a real task list — summaries, detailed goals, and live status —
that shows up as a tidy widget above the editor for the current session.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![pi](https://img.shields.io/badge/pi-extension-7c3aed)](https://github.com/earendil-works/pi-coding-agent)
[![typescript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![repo](https://img.shields.io/badge/repo-pi--todo-181717?logo=github)](https://github.com/wjchen-work/pi-todo)

[English](./README.md) · [简体中文](./README_zh.md)

</div>

---

## ✨ What it is

`pi-todo` is an extension for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent).
It hands your model a **structured todo list** — not a wall of free-form text in the chat,
but a real list with short summaries and longer goals that lives in memory for the session.
Each item's `summary` is also its identity: the model references todos by summary string, so there's
no separate id to keep track of.

Your model can:

- 🟢 **Create** todos in one batch (short summary + detailed goal each)
- ▶️ **Start** / ✅ **Complete** / 🔁 **Reopen** items as work progresses
- 🔍 **List** every todo, including the private goal text
- 🧹 **Clean** the list once a round of work is done

And you'll see a slim, live panel **above the editor** — always knowing what the model is doing
and what's left.

---

## 👀 What it looks like

> The widget above the editor renders the todo list as a markdown bullet list. Up to 4 items show; the rest collapse into a `+N more...` hint. Status is expressed purely through inline markdown styling — no checkboxes:

```
* **Implement the in-memory store**   ← in_progress (bold, sorted first)
* Wire up the todo tool handlers               ← pending
* Register the widget on session_start         ← pending
* ~~Design the schema with TypeBox types~~     ← completed (strikethrough, sorted last)
* +2 more...
```

Empty state: the widget is hidden — nothing renders above the editor until you add a todo.

### Status lifecycle

| Status        | Markdown form                          | Meaning                                  |
| ------------- | -------------------------------------- | ---------------------------------------- |
| `pending`     | `* summary`                            | Planned but not started yet              |
| `in_progress` | `* **summary**` (bold)                 | Currently being worked on                |
| `completed`   | `* ~~summary~~` (sorted last)          | Done; visually de-emphasized             |

New items start as `pending`. Use `start` to flip one to `in_progress`, `complete` to mark it done, and `reopen` to bring a completed item back to `pending`. When a full round of work is done, call `clean` to empty the list.

---

## 📦 Installation

`pi-todo` is a [pi package](https://github.com/earendil-works/pi-coding-agent#pi-packages) and
installs straight from its git repository:

```bash
pi install git:https://github.com/wjchen-work/pi-todo.git
```

After install, enable it with `pi config` or explicitly in your project's `.pi/settings.json`.

---

## 🚀 Usage

Once installed, **you don't call any commands** — your model will use the `todo` tool when
multi-step work is on the table. Just talk to pi normally.

### Natural-language trigger

> **You**: Rewrite the README for this repo and add a few unit tests.
>
> **pi (internally)**: Let me lay out the work in `todo` first.
>
> ```
> todo create items=[{"summary":"Rewrite README","goal":"Keep the original structure, add install / usage / API sections, include an ASCII mockup"},{"summary":"Add unit tests","goal":"Cover store.create / clear and status transitions"},{"summary":"Run npm run check","goal":"tsc --noEmit && eslint . must pass"}]
> todo start summary="Rewrite README"
> ... (work on README) ...
> todo complete summary="Rewrite README"
> todo start summary="Add unit tests"
> ... (work on tests) ...
> todo complete summary="Add unit tests"
> todo start summary="Run npm run check"
> ... (run npm run check) ...
> todo complete summary="Run npm run check"
> todo clean
> ```
>
> (The widget above the editor updates immediately —)
>
> ```
> * **Run npm run check**
> * ~~Rewrite README~~
> * ~~Add unit tests~~
> ```
>
> (After `clean`, the widget disappears — the round is done.)

---

## 📁 Project layout

```
src/
├── types.ts    # TodoItem / TodoState / constants
├── schema.ts   # TypeBox parameter schema for the todo tool
├── store.ts    # In-memory store + status state machine
├── tool.ts     # todo tool: handlers + renderCall + renderResult
└── widget.ts   # TodoWidget: TUI component
index.ts        # Extension entry (lives at the project root): register widget + tool
```

---

## 🧑‍💻 Development

```bash
# Install dependencies
npm install

# Type-check + ESLint
npm run check

# Lint only
npm run lint
```

`npm run check` must pass before committing.

### Module boundaries

- `store.ts` and `widget.ts` don't depend on the pi API — easy to unit-test in isolation.
- `tool.ts` is the only place that hands a `TodoStore` to the `ExtensionAPI`.
- `index.ts` is just composition: build store → register widget → register tool.

---

## 📄 License

[MIT](./LICENSE) © [wjchen](https://github.com/wjchen-work)

---

## 🙏 Acknowledgements

- [pi coding agent](https://github.com/earendil-works/pi-coding-agent) — the minimal coding harness that made me want to write an extension.
- [@earendil-works/pi-tui](https://github.com/earendil-works/pi-tui) — the TUI library the widget is built on.
- [TypeBox](https://github.com/sinclairzx81/typebox) — schema and TS types from a single source of truth.

<div align="center">

**If this helped you, a ⭐ goes a long way!**

</div>