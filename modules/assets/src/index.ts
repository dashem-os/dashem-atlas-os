import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { AtlasEntity, EntityId, OperationalContext, OrganizationId, TenantScoped } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type AssetKind = "facility" | "equipment" | "vehicle" | "tool" | "system";
export type AssetCriticality = "low" | "medium" | "high" | "critical";

export interface Asset extends AtlasEntity, TenantScoped {
  readonly name: string;
  readonly kind: AssetKind;
  readonly criticality: AssetCriticality;
  readonly location?: string;
  readonly description?: string;
}

export interface RegisterAssetCommand {
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly kind: AssetKind;
  readonly criticality?: AssetCriticality;
  readonly location?: string;
  readonly description?: string;
}

export interface UpdateAssetCommand {
  readonly name?: string;
  readonly kind?: AssetKind;
  readonly criticality?: AssetCriticality;
  readonly location?: string;
  readonly description?: string;
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
    ...(command.location ? { location: command.location } : {}),
    ...(command.description ? { description: command.description } : {})
  };

  await bus.publish(
    createEvent(
      "AssetCreated",
      {
        assetId: asset.id,
        organizationId: asset.organizationId,
        subjectId: asset.id,
        title: "Ativo criado",
        kind: "status",
        metadata: { name: asset.name, assetKind: asset.kind, criticality: asset.criticality }
      },
      context,
      { organizationId: asset.organizationId, subjectId: asset.id, sourceModule: "assets" }
    )
  );
  return asset;
}

export async function updateAsset(
  asset: Asset,
  command: UpdateAssetCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<Asset> {
  const updated: Asset = {
    ...asset,
    ...(command.name ? { name: command.name.trim() } : {}),
    ...(command.kind ? { kind: command.kind } : {}),
    ...(command.criticality ? { criticality: command.criticality } : {}),
    ...(command.location ? { location: command.location } : {}),
    ...(command.description ? { description: command.description } : {}),
    updatedAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "AssetUpdated",
      {
        assetId: updated.id,
        organizationId: updated.organizationId,
        subjectId: updated.id,
        title: "Ativo atualizado",
        kind: "status",
        metadata: command as Record<string, unknown>
      },
      context,
      { organizationId: updated.organizationId, subjectId: updated.id, sourceModule: "assets" }
    )
  );

  return updated;
}

export async function archiveAsset(asset: Asset, context: OperationalContext, bus: EventBus): Promise<Asset> {
  const archived: Asset = {
    ...asset,
    status: "archived",
    updatedAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "AssetArchived",
      {
        assetId: archived.id,
        organizationId: archived.organizationId,
        subjectId: archived.id,
        title: "Ativo arquivado",
        kind: "status"
      },
      context,
      { organizationId: archived.organizationId, subjectId: archived.id, sourceModule: "assets" }
    )
  );

  return archived;
}

export function assertAssetTenant(asset: Asset | null, organizationId: OrganizationId, id: EntityId): Asset {
  if (!asset || asset.organizationId !== organizationId) {
    throw new Error(`Asset ${id} not found for organization ${organizationId}.`);
  }

  return asset;
}
