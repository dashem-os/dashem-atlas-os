import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { AtlasEntity, EntityId, ISODateTime, OperationalContext, OrganizationId, TenantScoped } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type WorkOrderPriority = "low" | "normal" | "high" | "urgent";
export type WorkOrderState = "requested" | "scheduled" | "in_progress" | "completed" | "cancelled";

export interface WorkOrder extends AtlasEntity, TenantScoped {
  readonly assetId: EntityId;
  readonly title: string;
  readonly priority: WorkOrderPriority;
  readonly state: WorkOrderState;
  readonly dueAt?: ISODateTime;
}

export interface CreateWorkOrderCommand {
  readonly organizationId: OrganizationId;
  readonly assetId: EntityId;
  readonly title: string;
  readonly priority?: WorkOrderPriority;
  readonly dueAt?: ISODateTime;
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
    state: "requested",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...(command.dueAt ? { dueAt: command.dueAt } : {})
  };

  await bus.publish(
    createEvent(
      "maintenance.work_order_created",
      { workOrderId: workOrder.id, organizationId: workOrder.organizationId, subjectId: workOrder.id },
      context,
      { organizationId: workOrder.organizationId, subjectId: workOrder.id, sourceModule: "maintenance" }
    )
  );
  return workOrder;
}
