import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { EntityId, OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type ApprovalState = "pending" | "approved" | "rejected";

export interface ApprovalRequest {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly state: ApprovalState;
  readonly requestedBy: UserId;
  readonly requestedAt: string;
}

export interface RequestApprovalCommand {
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly requestedBy: UserId;
}

export async function requestApproval(
  command: RequestApprovalCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<ApprovalRequest> {
  const approval: ApprovalRequest = {
    id: createId("apv"),
    organizationId: command.organizationId,
    subjectId: command.subjectId,
    state: "pending",
    requestedBy: command.requestedBy,
    requestedAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "workflow.approval_requested",
      { approvalId: approval.id, organizationId: approval.organizationId, subjectId: approval.subjectId },
      context,
      {
        organizationId: approval.organizationId,
        subjectId: approval.subjectId,
        actorId: approval.requestedBy,
        sourceModule: "workflow"
      }
    )
  );
  return approval;
}
