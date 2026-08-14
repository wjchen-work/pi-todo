<div align="center">

# 📝 pi-todo

**为 pi 编码代理提供一份内存态 todo 列表。**

把一份带 ID、短摘要、详细目标的真实任务清单交到模型手里——
在当前会话内以简洁的 widget 形态呈现在编辑器正上方。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![pi](https://img.shields.io/badge/pi-extension-7c3aed)](https://github.com/earendil-works/pi-coding-agent)
[![typescript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![repo](https://img.shields.io/badge/repo-pi--todo-181717?logo=github)](https://github.com/wjchen-work/pi-todo)

[English](./README.md) · [简体中文](./README_zh.md)

</div>

---

## ✨ 它是什么

`pi-todo` 是 [pi 编码代理](https://github.com/earendil-works/pi-coding-agent) 的扩展。
它把一份**结构化的 todo 列表**交到模型手里——不是埋在聊天里的一行行自由文本，
而是带 ID、短摘要、详细目标的真实清单，仅在当前会话内存中存活。

模型可以：

- 🟢 **批量创建** todo（每条含短摘要 + 详细目标）
- ▶️ **开始** / ✅ **完成** / 🔁 **重开** 条目，随工作推进流转状态
- 🔍 **查看** 当前所有 todo（包括模型私有的目标描述）
- 🧹 **清空** 列表，在一轮工作完成后重置

而你，会在**编辑器正上方**看到一个简洁、实时的面板——
始终知道模型正在做什么、还剩什么。

---

## 👀 长这样

> 编辑器上方的 widget，把 todo 列表渲染为 markdown 圆点列表。最多展示 4 条；超出部分以 `+N more...` 收尾。状态完全通过行内样式表达——不加 checkbox：

```
* **实现内存态 store**    ← in_progress（加粗，排在最前）
* 编写 todo 工具的 handler        ← pending
* 注册 widget 并接入 session_start ← pending
* ~~设计 schema 并落 TypeBox 类型~~ ← completed（删除线 + 固定末尾）
* +2 more...
```

空状态：widget 完全隐藏——在添加第一条 todo 之前，编辑器上方不会渲染任何内容。

### 状态生命周期

| 状态           | markdown 形式                         | 含义                |
| -------------- | ------------------------------------- | ------------------- |
| `pending`      | `* summary`                           | 已规划但还未开始    |
| `in_progress`  | `* **summary**`（加粗）                | 正在处理            |
| `completed`    | `* ~~summary~~`（固定末尾）            | 已完成，视觉上弱化  |

新增 todo 默认为 `pending`。调用 `start` 推进到 `in_progress`，调用 `complete` 标记完成，调用 `reopen` 把已完成的 todo 退回 `pending`。整轮工作完成时调用 `clean` 清空列表并重置 id 编号。

---

## 📦 安装

`pi-todo` 是一个 [pi package](https://github.com/earendil-works/pi-coding-agent#pi-packages)，
直接从 git 仓库安装即可：

```bash
pi install git:https://github.com/wjchen-work/pi-todo.git
```

安装后用 `pi config` 启用扩展，或在项目的 `.pi/settings.json` 中显式启用。

---

## 🚀 使用方法

安装并启用后，**你不需要手动调用任何命令**——
模型在处理多步任务时会主动使用 `todo` 工具。正常和 pi 对话即可。

### 自然语言触发示例

> **你**：帮我把这个仓库的 README 重写一下，再加几个单元测试。
>
> **pi（内部）**：先把这一轮的任务列出来，然后逐条推进。
>
> ```
> todo create items=[{"summary":"重写 README","goal":"保持原有结构，新增安装/使用/API 三个章节，配 ASCII mockup"},{"summary":"补充单元测试","goal":"覆盖 store.create / clear 与状态流转"},{"summary":"运行 npm run check","goal":"tsc --noEmit && eslint . 必须通过"}]
> todo start id=1
> ... (重写 README) ...
> todo complete id=1
> todo start id=2
> ... (补单元测试) ...
> todo complete id=2
> todo start id=3
> ... (跑 npm run check) ...
> todo complete id=3
> todo clean
> ```
>
> （编辑器上方的 widget 实时反映状态——）
>
> ```
> * **运行 npm run check**
> * ~~重写 README~~
> * ~~补充单元测试~~
> ```
>
> （调用 `clean` 后 widget 隐藏——这一轮就结束了。）

---

## 🛠 `todo` 工具 API

模型侧接口（TypeBox schema 自动渲染给 LLM）：

| 字段      | 类型                              | 必填时机 | 说明                                        |
| --------- | --------------------------------- | -------- | ------------------------------------------- |
| `action`  | `"create"` \| `"list"` \| `"start"` \| `"complete"` \| `"reopen"` \| `"clean"` | 始终     | 操作类型                                    |
| `items`   | `Array<{ summary: string; goal: string }>` | `create` | 批量提交的 todo 列表——**整体原子提交**；每条含短 `summary`（会显示在 widget 上）和详细 `goal`（仅模型可见） |
| `id`      | `number`                          | `start`, `complete`, `reopen` | 要操作的 todo ID               |

### 示例

```jsonc
// 1) 一轮需求开始时，**一次** create 完整计划
{
  "action": "create",
  "items": [
    { "summary": "实现 store", "goal": "支持 create 与状态流转" },
    { "summary": "编写 todo 工具", "goal": "handler + renderCall + renderResult" },
    { "summary": "注册 widget",   "goal": "session_start 时同步，空状态隐藏" }
  ]
}

// 2) 边做边推进状态
{ "action": "start", "id": 1 }      // pending -> in_progress
{ "action": "complete", "id": 1 }   // in_progress -> completed

// 3) 随时查看全貌
{ "action": "list" }

// 4) 需要回头修时重开（completed -> pending）。
//    工具不允许按条删除——重开到 pending 后，让 clean 在轮末统一清掉。
{ "action": "reopen", "id": 1 }

// 5) 一轮完全交付后清空，为下一轮重置
{ "action": "clean" }
```

返回：

```
Created 3 todos: #1, #2, #3
```

状态仅存在于当前会话内存中——不做跨重载、跨分支或分叉的持久化。当所有 todo 都 `completed` 时，
`list` 与 `complete` 的返回结果会追加一行提醒调用 `clean`，让下一轮从干净状态开始。

### 轮次工作流

编辑器上方的 widget 用于追踪**一轮完整工作**：

1. 用户提出新需求后，**一次 `create` 调用就把整个 `items: [...]` 计划交上去**——不要拆成多次调用，也不要在计划落地前就开始干活。
2. 推进过程中，逐条调用 `start` 开始、`complete` 完成；widget 实时反映当前状态。
3. 如果某条已经不需要了，调 `reopen` 让它回到 `pending`——工具不允许按条删除。
4. 用户需求**全部**交付后，调用一次 `clean` 清空列表、重置 id 编号。**不要在一轮中途调用 `clean`**——只有当当前请求的所有 todo 都 `completed` 后才能调。当所有 todo 都 `completed` 时，`list`/`complete` 的返回文本会追加提醒，看到它即表示本轮已完成。

### 状态转换

store 内置一个最小状态机，防止模型误用：

| 当前状态       | 允许的下一状态                              | 调用动作               |
| -------------- | ------------------------------------------- | ---------------------- |
| `pending`      | `pending`（no-op）、`in_progress`、`completed` | `start`、`complete`    |
| `in_progress`  | `in_progress`（no-op）、`completed`           | `complete`             |
| `completed`    | `completed`（no-op）、`pending`               | `reopen`               |

非法转换会向模型抛出一个明确的错误（例如：试图 `start` 一个已 `completed` 的 todo 会被拒绝——要继续处理请先 `reopen`）。

---

## 🧠 设计要点

| 特性              | 实现                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| **每条 todo 双轨** | `summary`（短，用户可见）+ `goal`（长，模型私有），避免冗长污染 widget        |
| **生命周期状态**    | `pending` / `in_progress` / `completed`，由状态机约束                          |
| **markdown 渲染** | widget 内部交由 pi 的 `Markdown` 组件渲染——状态用任务列表 checkbox、加粗、删除线表达；widget 代码不再手写 ANSI 颜色 |
| **轮次化使用**      | 一轮需求 = 开始时一次 `create` 提交整个计划 → 逐条 `start`/`complete` → 最后 `clean`；不支持按条删除 |
| **widget 节流**    | 最多渲染 4 条，超过则 `+N more...`，避免长列表喧宾夺主                         |
| **按状态排序**      | 渲染时按状态排序（`in_progress` → `pending` → `completed`）；插入顺序作为次要顺序保留 |
| **内存态**          | 列表只在当前会话内有效，不写 `details` 快照，重载/分叉后从干净状态开始        |
| **全部完成提醒**     | 当所有 todo 都 `completed` 时，`list`/`complete` 返回结果追加提醒调用 `clean` |
| **零副作用读**     | `render()` 每次拉取最新 state，无需缓存失效处理                                |
| **类型严格**       | TypeBox schema + strict TS，提交前 `npm run check` 全绿                          |

---

## 📁 项目结构

```
src/
├── types.ts    # TodoItem / TodoState / 常量
├── schema.ts   # TypeBox 工具参数 schema
├── store.ts    # 内存态 store + 状态机
├── tool.ts     # todo 工具：handler + renderCall + renderResult
└── widget.ts   # TodoWidget：TUI 组件
index.ts        # 扩展入口（位于项目根目录）：注册 widget + 工具
```

---

## 🧑‍💻 开发

```bash
# 安装依赖
npm install

# 类型检查 + ESLint
npm run check

# 仅 lint
npm run lint
```

提交前请确保 `npm run check` 全绿。

### 模块边界

- `store.ts` 与 `widget.ts` 不依赖 pi API，便于单独测试。
- `tool.ts` 是唯一把 `TodoStore` 暴露给 `ExtensionAPI` 的地方。
- `index.ts` 只做组合：建 store → 注册 widget → 注册 tool。

---

## 📄 许可证

[MIT](./LICENSE) © [wjchen](https://github.com/wjchen-work)

---

## 🙏 致谢

- [pi coding agent](https://github.com/earendil-works/pi-coding-agent) —— 优雅到让人想写扩展的最小编码代理。
- [@earendil-works/pi-tui](https://github.com/earendil-works/pi-tui) —— 拿来画 widget 的 TUI 库。
- [TypeBox](https://github.com/sinclairzx81/typebox) —— 让 schema 与 TS 类型同源。

<div align="center">

**如果这个项目对你有帮助，欢迎 ⭐ 一下！**

</div>