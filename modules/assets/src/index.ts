import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { AtlasEntity, OperationalContext, OrganizationId, TenantScoped } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type AssetKind = "facility" | "equipment" | "vehicle" | "tool" | "system";
export type AssetCriticality = "low" | "medium" | "high" | "critical";

export interface Asset extends AtlasEntity, TenantScoped {
  readonly name: string;
  readonly kind: AssetKind;
  readonly criticality: AssetCriticality;
  readonly location?: string;
}

export interface RegisterAssetCommand {
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly kind: AssetKind;
  readonly criticality?: AssetCriticality;
  readonly location?: string;
}

export async function registerAsset(command: RegisterAssetCommand, context: OperationalContext, bus: EventBus): Promise<Asset> {
  const now = systemClock.now();
  const asset: Asset = {
    id: createId("ast"),
    organizationId: command.organizationId,
    name: command.name.trim(),
    kind: command.kind,
    criticality: command.criticality ?? "medium",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...(command.location ? { location: command.location } : {})
  };

  await bus.publish(
    createEvent(
      "asset.registered",
      { assetId: asset.id, organizationId: asset.organizationId, subjectId: asset.id },
      context,
      { organizationId: asset.organizationId, subjectId: asset.id, sourceModule: "assets" }
    )
  );
  return asset;
}
