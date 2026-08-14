import { StringEnum } from "@earendil-works/pi-ai";
import { Type, type Static } from "typebox";

/** One entry inside a `create` action's `items` array. */
const CreateItem = Type.Object({
  summary: Type.String({
    description: "Short summary of the item, shown in the widget. Also acts as the item's unique key — must not collide with any other todo in the list (or with another entry in the same create batch).",
    minLength: 1,
  }),
  goal: Type.String({
    description: "Detailed goal / description of the item (private to the agent, for planning)",
  }),
});

/** Parameters accepted by the `todo` tool. */
export const TodoParams = Type.Object({
  action: StringEnum(["create", "list", "start", "complete", "reopen", "clean"] as const),
  items: Type.Optional(
    Type.Array(CreateItem, {
      description:
        "One or more todos to create in a single batch (required for create). The whole batch is committed atomically — either all items land, or none do. Rejected if any summary already exists in the list or appears more than once in the batch.",
      minItems: 1,
    }),
  ),
  summary: Type.Optional(
    Type.String({
      description:
        "Exact summary of an existing todo (required for start, complete, reopen). Used as the item's key — must match a summary already in the list.",
      minLength: 1,
    }),
  ),
});

export type TodoInput = Static<typeof TodoParams>;