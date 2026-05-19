import { createEvent, InMemoryEventBus } from "@atlas/core-events";
import type { EntityId, OperationalContext, OrganizationId } from "@atlas/core-shared";
import { InMemoryTimelineRepository, bindTimelineProjection } from "@atlas/module-timeline";

const bus = new InMemoryEventBus();
const timeline = new InMemoryTimelineRepository();
const context: OperationalContext = {
  requestId: crypto.randomUUID(),
  environment: process.env.ATLAS_ENV === "production" ? "production" : "development",
  organizationId: "org_bootstrap" as OrganizationId
};

bindTimelineProjection(bus, timeline);

bus.subscribe("maintenance.work_order_created", async (event) => {
  const entries = await timeline.list({
    organizationId: event.metadata.organizationId as OrganizationId,
    ...(event.metadata.subjectId ? { subjectId: event.metadata.subjectId } : {})
  });
  console.log(JSON.stringify({ worker: "timeline", entry: entries[0] }));
});

await bus.publish(
  createEvent(
    "maintenance.work_order_created",
    {
      workOrderId: "wo_bootstrap",
      organizationId: "org_bootstrap",
      subjectId: "wo_bootstrap"
    },
    context,
    {
      organizationId: "org_bootstrap" as OrganizationId,
      subjectId: "wo_bootstrap" as EntityId,
      sourceModule: "maintenance"
    }
  )
);

console.log("Atlas worker bootstrapped. Ready for durable queues.");
