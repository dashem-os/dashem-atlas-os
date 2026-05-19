export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type EntityId = Brand<string, "EntityId">;
export type OrganizationId = Brand<string, "OrganizationId">;
export type UserId = Brand<string, "UserId">;
export type ISODateTime = Brand<string, "ISODateTime">;

export type AtlasEnvironment = "development" | "test" | "staging" | "production";

export type EntityStatus = "active" | "archived" | "deleted";

export type Result<T, E extends string = string> =
  | { ok: true; value: T }
  | { ok: false; error: E; message: string };

export interface AuditMetadata {
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly createdBy?: UserId;
  readonly updatedBy?: UserId;
}

export interface TenantScoped {
  readonly organizationId: OrganizationId;
}

export interface AtlasEntity<Id extends string = EntityId> extends AuditMetadata {
  readonly id: Id;
  readonly status: EntityStatus;
}

export interface OperationalContext {
  readonly requestId: string;
  readonly environment: AtlasEnvironment;
  readonly organizationId?: OrganizationId;
  readonly actor?: {
    readonly userId: UserId;
    readonly organizationId: OrganizationId;
    readonly roles: readonly string[];
  };
}

export interface Clock {
  now(): ISODateTime;
}

export const systemClock: Clock = {
  now: () => new Date().toISOString() as ISODateTime
};

export function createId<Id extends string = EntityId>(prefix: string): Id {
  return `${prefix}_${crypto.randomUUID()}` as Id;
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function fail<E extends string>(error: E, message: string): Result<never, E> {
  return { ok: false, error, message };
}

export function requireTenant(context: OperationalContext): OrganizationId {
  const organizationId = context.organizationId ?? context.actor?.organizationId;

  if (!organizationId) {
    throw new Error("Tenant context is required.");
  }

  return organizationId;
}
