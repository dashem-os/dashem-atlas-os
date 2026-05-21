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
  readonly organizationId: OrganizationId;
  readonly workOrderId: EntityId;
  readonly kind: EvidenceKind;
  readonly title: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
  readonly contentBase64?: string;
  readonly url?: string;
  readonly notes?: string;
  readonly metadata: Record<string, unknown>;
  readonly ocrText?: string;
  readonly attachedAt: ISODateTime;
  readonly attachedBy?: UserId;
}

export interface Budget {
  readonly amount: number;
  readonly currency: string;
  readonly state: BudgetState;
  readonly materialsTotal?: number;
  readonly laborTotal?: number;
  readonly marginPercent?: number;
  readonly durationHours?: number;
  readonly riskLevel?: "low" | "medium" | "high" | "critical";
  readonly notes?: string;
  readonly submittedAt?: ISODateTime;
  readonly decidedAt?: ISODateTime;
  readonly decidedBy?: UserId;
}

export interface MaterialItem {
  readonly id: EntityId;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
}

export interface WorkOrder extends AtlasEntity, TenantScoped {
  readonly assetId: EntityId;
  readonly title: string;
  readonly description?: string;
  readonly priority: WorkOrderPriority;
  readonly state: WorkOrderState;
  readonly dueAt?: ISODateTime;
  readonly technicianName?: string;
  readonly diagnosis?: string;
  readonly materials: readonly MaterialItem[];
  readonly laborHours?: number;
  readonly laborRate?: number;
  readonly laborCost?: number;
  readonly estimatedDurationHours?: number;
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
  readonly technicianName?: string;
  readonly diagnosis?: string;
  readonly materials?: readonly Omit<MaterialItem, "id" | "totalPrice">[];
  readonly laborHours?: number;
  readonly laborRate?: number;
  readonly estimatedDurationHours?: number;
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

export interface UploadEvidenceCommand {
  readonly kind: EvidenceKind;
  readonly title: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly contentBase64: string;
  readonly notes?: string;
  readonly metadata?: Record<string, unknown>;
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
  readonly materialsTotal?: number;
  readonly laborTotal?: number;
  readonly marginPercent?: number;
  readonly durationHours?: number;
  readonly riskLevel?: "low" | "medium" | "high" | "critical";
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
    materials: (command.materials ?? []).map((material) => ({
      id: createId("mat"),
      name: material.name.trim(),
      quantity: Number(material.quantity || 0),
      unitPrice: Number(material.unitPrice || 0),
      totalPrice: Number(material.quantity || 0) * Number(material.unitPrice || 0)
    })),
    checklist: (command.checklist ?? []).map((label) => ({
      id: createId("chk"),
      label,
      state: "open" as const
    })),
    evidence: [],
    createdAt: now,
    updatedAt: now,
    ...(command.technicianName?.trim() ? { technicianName: command.technicianName.trim() } : {}),
    ...(command.diagnosis?.trim() ? { diagnosis: command.diagnosis.trim() } : {}),
    ...(command.laborHours !== undefined ? { laborHours: command.laborHours } : {}),
    ...(command.laborRate !== undefined ? { laborRate: command.laborRate } : {}),
    ...(command.laborHours !== undefined && command.laborRate !== undefined
      ? { laborCost: Number(command.laborHours) * Number(command.laborRate) }
      : {}),
    ...(command.estimatedDurationHours !== undefined ? { estimatedDurationHours: command.estimatedDurationHours } : {}),
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
        metadata: {
          assetId: workOrder.assetId,
          priority: workOrder.priority,
          technicianName: workOrder.technicianName,
          dueAt: workOrder.dueAt,
          materialsCount: workOrder.materials.length,
          laborCost: workOrder.laborCost
        }
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
    organizationId: workOrder.organizationId,
    workOrderId: workOrder.id,
    kind: command.kind,
    title: command.title,
    attachedAt: systemClock.now(),
    metadata: {},
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

export async function uploadEvidence(
  workOrder: WorkOrder,
  command: UploadEvidenceCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<WorkOrder> {
  const ocrText = extractSimpleOcr(command.contentBase64, command.mimeType);
  const evidence: Evidence = {
    id: createId("evd"),
    organizationId: workOrder.organizationId,
    workOrderId: workOrder.id,
    kind: command.kind,
    title: command.title,
    fileName: command.fileName,
    mimeType: command.mimeType,
    contentBase64: command.contentBase64,
    sizeBytes: Buffer.from(command.contentBase64, "base64").byteLength,
    attachedAt: systemClock.now(),
    metadata: command.metadata ?? {},
    ...(command.notes ? { notes: command.notes } : {}),
    ...(ocrText ? { ocrText } : {}),
    ...(command.actorId ? { attachedBy: command.actorId } : {})
  };
  const updated: WorkOrder = {
    ...workOrder,
    evidence: [...workOrder.evidence, evidence],
    updatedAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "EvidenceUploaded",
      {
        workOrderId: updated.id,
        evidenceId: evidence.id,
        organizationId: updated.organizationId,
        subjectId: updated.id,
        title: `Evidencia enviada: ${evidence.fileName}`,
        body: evidence.notes ?? evidence.mimeType,
        kind: "attachment",
        metadata: {
          evidenceKind: evidence.kind,
          fileName: evidence.fileName,
          mimeType: evidence.mimeType,
          sizeBytes: evidence.sizeBytes,
          ...evidence.metadata
        }
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

  if (ocrText) {
    await bus.publish(
      createEvent(
        "EvidenceOcrExtracted",
        {
          workOrderId: updated.id,
          evidenceId: evidence.id,
          organizationId: updated.organizationId,
          subjectId: updated.id,
          title: "OCR extraido da evidencia",
          body: ocrText,
          kind: "system",
          metadata: { fileName: evidence.fileName, textLength: ocrText.length }
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
  }

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
    ...(command.materialsTotal !== undefined ? { materialsTotal: command.materialsTotal } : {}),
    ...(command.laborTotal !== undefined ? { laborTotal: command.laborTotal } : {}),
    ...(command.marginPercent !== undefined ? { marginPercent: command.marginPercent } : {}),
    ...(command.durationHours !== undefined ? { durationHours: command.durationHours } : {}),
    ...(command.riskLevel ? { riskLevel: command.riskLevel } : {}),
    ...(command.notes ? { notes: command.notes } : {}),
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
        metadata: {
          amount: budget.amount,
          currency: budget.currency,
          materialsTotal: budget.materialsTotal,
          laborTotal: budget.laborTotal,
          marginPercent: budget.marginPercent,
          durationHours: budget.durationHours,
          riskLevel: budget.riskLevel
        }
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

function extractSimpleOcr(contentBase64: string, mimeType: string): string | undefined {
  const decoded = Buffer.from(contentBase64, "base64").toString("utf8");
  const cleaned = decoded.replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ]/g, " ").replace(/\s+/g, " ").trim();

  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return cleaned.slice(0, 2000);
  }

  if (cleaned.length > 24) {
    return cleaned.slice(0, 1000);
  }

  return undefined;
}
