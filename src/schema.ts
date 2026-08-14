import { StringEnum } from "@earendil-works/pi-ai";
import { Type, type Static } from "typebox";

/** One entry inside a `create` action's `items` array. */
const CreateItem = Type.Object({
  summary: Type.String({
    description: "Short summary of the item, shown in the widget",
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
        "One or more todos to create in a single batch (required for create). The whole batch is committed atomically — either all items land, or none do.",
      minItems: 1,
    }),
  ),
  id: Type.Optional(
    Type.Number({
      description:
        "Todo item ID (required for start, complete, reopen)",
    }),
  ),
});

export type TodoInput = Static<typeof TodoParams>;