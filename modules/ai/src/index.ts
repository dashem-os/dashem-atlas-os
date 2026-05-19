import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { EntityId, OperationalContext, OrganizationId } from "@atlas/core-shared";
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
  readonly subjectId?: EntityId;
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
      "AiSuggestionCreated",
      {
        taskId: task.id,
        organizationId: task.organizationId,
        subjectId: command.subjectId,
        suggestion: command.input,
        title: "IA sugeriu intervencao",
        body: command.input,
        kind: "ai_suggestion",
        metadata: { aiTaskKind: command.kind }
      },
      context,
      { organizationId: task.organizationId, sourceModule: "ai", ...(command.subjectId ? { subjectId: command.subjectId } : {}) }
    )
  );
  return task;
}
