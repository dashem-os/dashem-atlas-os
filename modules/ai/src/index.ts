import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { OperationalContext, OrganizationId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type AiTaskKind = "summarize" | "classify" | "recommend" | "extract";

export interface AiTask {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly kind: AiTaskKind;
  readonly input: string;
  readonly createdAt: string;
}

export interface RequestAiTaskCommand {
  readonly organizationId: OrganizationId;
  readonly kind: AiTaskKind;
  readonly input: string;
}

export async function requestAiTask(command: RequestAiTaskCommand, context: OperationalContext, bus: EventBus): Promise<AiTask> {
  const task: AiTask = {
    id: createId("ait"),
    organizationId: command.organizationId,
    kind: command.kind,
    input: command.input,
    createdAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "ai.task_requested",
      { taskId: task.id, organizationId: task.organizationId, suggestion: command.input },
      context,
      { organizationId: task.organizationId, sourceModule: "ai" }
    )
  );
  return task;
}
