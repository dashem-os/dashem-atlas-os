import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { AtlasEntity, OperationalContext, OrganizationId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export interface Organization extends AtlasEntity<OrganizationId> {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly type?: "corporate" | "private";
  readonly monthlyContractValue?: number;
  readonly targetSla?: number;
  readonly address?: string;
  readonly phone?: string;
  readonly document?: string;
}

export interface CreateOrganizationCommand {
  readonly name: string;
  readonly slug: string;
  readonly type?: "corporate" | "private";
  readonly monthlyContractValue?: number;
  readonly targetSla?: number;
  readonly address?: string;
  readonly phone?: string;
  readonly document?: string;
}

export async function createOrganization(
  command: CreateOrganizationCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<Organization> {
  const now = systemClock.now();
  const organization: Organization = {
    id: createId<OrganizationId>("org"),
    name: command.name.trim(),
    slug: command.slug.trim().toLowerCase(),
    ...(command.type ? { type: command.type } : {}),
    ...(command.monthlyContractValue !== undefined ? { monthlyContractValue: Number(command.monthlyContractValue) } : {}),
    ...(command.targetSla !== undefined ? { targetSla: Number(command.targetSla) } : {}),
    ...(command.address !== undefined ? { address: command.address.trim() } : {}),
    ...(command.phone !== undefined ? { phone: command.phone.trim() } : {}),
    ...(command.document !== undefined ? { document: command.document.trim() } : {}),
    status: "active",
    createdAt: now,
    updatedAt: now
  };

  await bus.publish(
    createEvent(
      "organization.created",
      { organizationId: organization.id },
      { ...context, organizationId: organization.id },
      { organizationId: organization.id, sourceModule: "organizations" }
    )
  );
  return organization;
}
