import type { AtlasEntity, EntityId, OrganizationId, TenantScoped } from "@atlas/core-shared";

export interface QueryOptions {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
}

export interface Repository<T extends AtlasEntity<string>> {
  findById(id: EntityId): Promise<T | null>;
  save(entity: T): Promise<T>;
  list(options?: QueryOptions): Promise<Page<T>>;
}

export interface TenantRepository<T extends AtlasEntity<string> & TenantScoped> extends Repository<T> {
  listByOrganization(organizationId: OrganizationId, options?: QueryOptions): Promise<Page<T>>;
}

export interface UnitOfWork {
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export class InMemoryTenantRepository<T extends AtlasEntity<string> & TenantScoped> implements TenantRepository<T> {
  private readonly records = new Map<string, T>();

  async findById(id: EntityId): Promise<T | null> {
    return this.records.get(id) ?? null;
  }

  async save(entity: T): Promise<T> {
    this.records.set(entity.id, entity);
    return entity;
  }

  async list(options: QueryOptions = {}): Promise<Page<T>> {
    const limit = options.limit ?? 100;
    return { items: [...this.records.values()].slice(0, limit) };
  }

  async delete(id: EntityId): Promise<void> {
    this.records.delete(id);
  }

  async listByOrganization(organizationId: OrganizationId, options: QueryOptions = {}): Promise<Page<T>> {
    const limit = options.limit ?? 100;
    const items = [...this.records.values()]
      .filter((record) => record.organizationId === organizationId)
      .slice(0, limit);

    return { items };
  }
}

export const passthroughUnitOfWork: UnitOfWork = {
  run: (operation) => operation()
};
