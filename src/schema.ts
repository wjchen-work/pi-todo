import { StringEnum } from "@earendil-works/pi-ai";
import { Type, type Static } from "typebox";

/** Parameters accepted by the `todo` tool. */
export const TodoParams = Type.Object({
  action: StringEnum(["add", "delete", "list", "start", "complete", "reopen", "clean"] as const),
  summary: Type.Optional(
    Type.String({ description: "Short summary of the item, shown in the widget (required for add)" }),
  ),
  goal: Type.Optional(
    Type.String({ description: "Detailed goal / description of the item (required for add)" }),
  ),
  id: Type.Optional(
    Type.Number({
      description:
        "Todo item ID (required for delete, start, complete, reopen)",
    }),
  ),
});

export type TodoInput = Static<typeof TodoParams>;