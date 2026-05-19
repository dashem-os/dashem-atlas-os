import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { AtlasEntity, EntityId, ISODateTime, OperationalContext, OrganizationId, TenantScoped, UserId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type WorkOrderPriority = "low" | "normal" | "high" | "urgent";
export type WorkOrderState = "opened" | "scheduled" | "in_progress" | "waiting_budget" | "approved" | "rejected" | "closed" | "cancelled";
export type ChecklistItemState = "open" | "done" | "blocked";
export type EvidenceKind = "photo" | "document" | "note" | "measurement";
export type BudgetState = "draft" | "submitted" | "approved" | "rejected";

export interface ChecklistItem {
  readonly id: EntityId;
  readonly label: string;
  readonly state: ChecklistItemState;
  readonly completedAt?: ISODateTime;
  readonly completedBy?: UserId;
}

export interface Evidence {
  readonly id: EntityId;
  readonly kind: EvidenceKind;
  readonly title: string;
  readonly url?: string;
  readonly notes?: string;
  readonly attachedAt: ISODateTime;
  readonly attachedBy?: UserId;
}

export interface Budget {
  readonly amount: number;
  readonly currency: string;
  readonly state: BudgetState;
  readonly submittedAt?: ISODateTime;
  readonly decidedAt?: ISODateTime;
  readonly decidedBy?: UserId;
}

export interface WorkOrder extends AtlasEntity, TenantScoped {
  readonly assetId: EntityId;
  readonly title: string;
  readonly description?: string;
  readonly priority: WorkOrderPriority;
  readonly state: WorkOrderState;
  readonly dueAt?: ISODateTime;
  readonly checklist: readonly ChecklistItem[];
  readonly evidence: readonly Evidence[];
  readonly budget?: Budget;
  readonly closedAt?: ISODateTime;
}

export interface CreateWorkOrderCommand {
  readonly organizationId: OrganizationId;
  readonly assetId: EntityId;
  readonly title: string;
  readonly description?: string;
  readonly priority?: WorkOrderPriority;
  readonly dueAt?: ISODateTime;
  readonly checklist?: readonly string[];
}

export interface ChangeWorkOrderStatusCommand {
  readonly state: WorkOrderState;
  readonly reason?: string;
}

export interface AttachEvidenceCommand {
  readonly kind: EvidenceKind;
  readonly title: string;
  readonly url?: string;
  readonly notes?: string;
  readonly actorId?: UserId;
}

export interface UpdateChecklistItemCommand {
  readonly itemId: EntityId;
  readonly state: ChecklistItemState;
  readonly actorId?: UserId;
}

export interface SubmitBudgetCommand {
  readonly amount: number;
  readonly currency?: string;
  readonly notes?: string;
}

export async function createWorkOrder(
  command: CreateWorkOrderCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<WorkOrder> {
  const now = systemClock.now();
  const workOrder: WorkOrder = {
    id: createId("wo"),
    organizationId: command.organizationId,
    assetId: command.assetId,
    title: command.title.trim(),
    priority: command.priority ?? "normal",
    state: "opened",
    status: "active",
    checklist: (command.checklist ?? []).map((label) => ({
      id: createId("chk"),
      label,
      state: "open" as const
    })),
    evidence: [],
    createdAt: now,
    updatedAt: now,
    ...(command.description ? { description: command.description } : {}),
    ...(command.dueAt ? { dueAt: command.dueAt } : {})
  };

  await bus.publish(
    createEvent(
      "WorkOrderOpened",
      {
        workOrderId: workOrder.id,
        organizationId: workOrder.organizationId,
        subjectId: workOrder.id,
        title: "OS aberta",
        body: workOrder.title,
        kind: "status",
        metadata: { assetId: workOrder.assetId, priority: workOrder.priority }
      },
      context,
      { organizationId: workOrder.organizationId, subjectId: workOrder.id, sourceModule: "maintenance" }
    )
  );

  return workOrder;
}

export async function changeWorkOrderStatus(
  workOrder: WorkOrder,
  command: ChangeWorkOrderStatusCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<WorkOrder> {
  const now = systemClock.now();
  const updated: WorkOrder = {
    ...workOrder,
    state: command.state,
    updatedAt: now,
    ...(command.state === "closed" ? { status: "archived" as const, closedAt: now } : {})
  };

  await bus.publish(
    createEvent(
      command.state === "closed" ? "WorkOrderClosed" : "WorkOrderStatusChanged",
      {
        workOrderId: updated.id,
        organizationId: updated.organizationId,
        subjectId: updated.id,
        title: command.state === "closed" ? "OS encerrada" : `Status da OS alterado para ${command.state}`,
        body: command.reason,
        kind: "status",
        metadata: { state: command.state }
      },
      context,
      { organizationId: updated.organizationId, subjectId: updated.id, sourceModule: "maintenance" }
    )
  );

  return updated;
}

export async function attachEvidence(
  workOrder: WorkOrder,
  command: AttachEvidenceCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<WorkOrder> {
  const evidence: Evidence = {
    id: createId("evd"),
    kind: command.kind,
    title: command.title,
    attachedAt: systemClock.now(),
    ...(command.url ? { url: command.url } : {}),
    ...(command.notes ? { notes: command.notes } : {}),
    ...(command.actorId ? { attachedBy: command.actorId } : {})
  };

  const updated: WorkOrder = {
    ...workOrder,
    evidence: [...workOrder.evidence, evidence],
    updatedAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "EvidenceAttached",
      {
        workOrderId: updated.id,
        evidenceId: evidence.id,
        organizationId: updated.organizationId,
        subjectId: updated.id,
        title: evidence.kind === "photo" ? `Foto anexada: ${evidence.title}` : `Evidencia anexada: ${evidence.title}`,
        body: evidence.notes ?? evidence.url,
        kind: "attachment",
        metadata: { evidenceKind: evidence.kind, url: evidence.url }
      },
      context,
      {
        organizationId: updated.organizationId,
        subjectId: updated.id,
        sourceModule: "maintenance",
        ...(command.actorId ? { actorId: command.actorId } : {})
      }
    )
  );

  return updated;
}

export async function updateChecklistItem(
  workOrder: WorkOrder,
  command: UpdateChecklistItemCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<WorkOrder> {
  const now = systemClock.now();
  const checklist = workOrder.checklist.map((item) =>
    item.id === command.itemId
      ? {
          ...item,
          state: command.state,
          ...(command.state === "done" ? { completedAt: now } : {}),
          ...(command.actorId ? { completedBy: command.actorId } : {})
        }
      : item
  );
  const updated: WorkOrder = { ...workOrder, checklist, updatedAt: now };
  const changed = checklist.find((item) => item.id === command.itemId);

  await bus.publish(
    createEvent(
      "ChecklistItemUpdated",
      {
        workOrderId: updated.id,
        checklistItemId: command.itemId,
        organizationId: updated.organizationId,
        subjectId: updated.id,
        title: `Checklist: ${changed?.label ?? command.itemId}`,
        body: `Estado: ${command.state}`,
        kind: "status",
        metadata: { state: command.state }
      },
      context,
      {
        organizationId: updated.organizationId,
        subjectId: updated.id,
        sourceModule: "maintenance",
        ...(command.actorId ? { actorId: command.actorId } : {})
      }
    )
  );

  return updated;
}

export async function submitBudget(
  workOrder: WorkOrder,
  command: SubmitBudgetCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<WorkOrder> {
  const budget: Budget = {
    amount: command.amount,
    currency: command.currency ?? "BRL",
    state: "submitted",
    submittedAt: systemClock.now()
  };
  const updated: WorkOrder = { ...workOrder, state: "waiting_budget", budget, updatedAt: systemClock.now() };

  await bus.publish(
    createEvent(
      "BudgetSubmitted",
      {
        workOrderId: updated.id,
        organizationId: updated.organizationId,
        subjectId: updated.id,
        title: "Orcamento enviado",
        body: command.notes,
        kind: "approval",
        metadata: { amount: budget.amount, currency: budget.currency }
      },
      context,
      { organizationId: updated.organizationId, subjectId: updated.id, sourceModule: "maintenance" }
    )
  );

  return updated;
}

export function assertWorkOrderTenant(workOrder: WorkOrder | null, organizationId: OrganizationId, id: EntityId): WorkOrder {
  if (!workOrder || workOrder.organizationId !== organizationId) {
    throw new Error(`Work order ${id} not found for organization ${organizationId}.`);
  }

  return workOrder;
}
