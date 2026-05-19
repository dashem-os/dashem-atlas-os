import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { AtlasEntity, ISODateTime, OperationalContext, OrganizationId, TenantScoped } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type ProjectState = "planning" | "active" | "blocked" | "completed" | "cancelled";

export interface ConstructionProject extends AtlasEntity, TenantScoped {
  readonly name: string;
  readonly state: ProjectState;
  readonly startsAt?: ISODateTime;
  readonly endsAt?: ISODateTime;
}

export interface CreateProjectCommand {
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly startsAt?: ISODateTime;
  readonly endsAt?: ISODateTime;
}

export async function createConstructionProject(
  command: CreateProjectCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<ConstructionProject> {
  const now = systemClock.now();
  const project: ConstructionProject = {
    id: createId("prj"),
    organizationId: command.organizationId,
    name: command.name.trim(),
    state: "planning",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...(command.startsAt ? { startsAt: command.startsAt } : {}),
    ...(command.endsAt ? { endsAt: command.endsAt } : {})
  };

  await bus.publish(
    createEvent(
      "construction.project_created",
      { projectId: project.id, organizationId: project.organizationId, subjectId: project.id },
      context,
      { organizationId: project.organizationId, subjectId: project.id, sourceModule: "construction" }
    )
  );
  return project;
}
