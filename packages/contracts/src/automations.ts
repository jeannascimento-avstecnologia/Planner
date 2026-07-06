import { z } from "zod";
import { cardPriority, uuid } from "./schemas";

export const automationTriggerEvent = z.enum(["card_created", "card_moved", "priority_changed"]);
export type AutomationTriggerEvent = z.infer<typeof automationTriggerEvent>;

export const automationActionType = z.enum(["move_card", "set_priority", "set_assignee"]);
export type AutomationActionType = z.infer<typeof automationActionType>;

export const automationConditionsSchema = z
  .object({
    column_id: uuid.optional(),
    priority: cardPriority.optional(),
  })
  .strict()
  .default({});

export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("move_card"), target_column_id: uuid }),
  z.object({ type: z.literal("set_priority"), value: cardPriority }),
  z.object({ type: z.literal("set_assignee"), user_id: uuid }),
]);

export type AutomationAction = z.infer<typeof automationActionSchema>;

export const createAutomationRuleInput = z.object({
  boardId: uuid,
  orgId: uuid,
  name: z.string().min(1).max(120),
  triggerEvent: automationTriggerEvent,
  conditions: automationConditionsSchema,
  actions: z.array(automationActionSchema).min(1).max(10),
});

export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleInput>;

export const updateAutomationRuleInput = z.object({
  ruleId: uuid,
  boardId: uuid,
  active: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
});

export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleInput>;

export const deleteAutomationRuleInput = z.object({
  ruleId: uuid,
  boardId: uuid,
});

export type DeleteAutomationRuleInput = z.infer<typeof deleteAutomationRuleInput>;

export type AutomationRuleRow = {
  id: string;
  org_id: string;
  board_id: string;
  name: string;
  trigger_event: AutomationTriggerEvent;
  conditions: Record<string, unknown>;
  actions: AutomationAction[];
  active: boolean;
  created_at: string;
  updated_at: string;
};
