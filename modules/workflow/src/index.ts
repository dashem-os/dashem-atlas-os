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

export interface DecideBudgetCommand {
  readonly approvalId?: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly decidedBy: UserId;
  readonly decision: "approved" | "rejected";
  readonly notes?: string;
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
      {
        approvalId: approval.id,
        organizationId: approval.organizationId,
        subjectId: approval.subjectId,
        title: "Aprovacao solicitada",
        kind: "approval"
      },
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

export async function decideBudget(
  command: DecideBudgetCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<ApprovalRequest> {
  const approval: ApprovalRequest = {
    id: command.approvalId ?? createId("apv"),
    organizationId: command.organizationId,
    subjectId: command.subjectId,
    state: command.decision,
    requestedBy: command.decidedBy,
    requestedAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      command.decision === "approved" ? "BudgetApproved" : "BudgetRejected",
      {
        approvalId: approval.id,
        organizationId: command.organizationId,
        subjectId: command.subjectId,
        title: command.decision === "approved" ? "Orcamento aprovado" : "Orcamento reprovado",
        body: command.notes,
        kind: "approval",
        metadata: { decision: command.decision }
      },
      context,
      {
        organizationId: command.organizationId,
        subjectId: command.subjectId,
        actorId: command.decidedBy,
        sourceModule: "workflow"
      }
    )
  );

  return approval;
}
