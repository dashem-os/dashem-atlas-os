import type { EntityId, ISODateTime, OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type EventOriginModule =
  | "auth"
  | "organizations"
  | "assets"
  | "maintenance"
  | "construction"
  | "workflow"
  | "timeline"
  | "ai"
  | "operations"
  | "notifications"
  | "reports"
  | "monitoring";

export interface EventMetadata {
  readonly organizationId?: OrganizationId;
  readonly subjectId?: EntityId;
  readonly actorId?: UserId;
  readonly sourceModule: EventOriginModule;
  readonly labels?: readonly string[];
}

export interface DomainEvent<Name extends string = string, Payload = unknown> {
  readonly id: string;
  readonly name: Name;
  readonly occurredAt: ISODateTime;
  readonly payload: Payload;
  readonly context: OperationalContext;
  readonly metadata: EventMetadata;
}

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent
) => Promise<void> | void;

export interface EventBus {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
  subscribe<TEvent extends DomainEvent>(name: TEvent["name"], handler: EventHandler<TEvent>): void;
  subscribeAll(handler: EventHandler): void;
}

export function createEvent<Name extends string, Payload>(
  name: Name,
  payload: Payload,
  context: OperationalContext,
  metadata: EventMetadata
): DomainEvent<Name, Payload> {
  return {
    id: createId("evt"),
    name,
    occurredAt: systemClock.now(),
    payload,
    context,
    metadata
  };
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly globalHandlers: EventHandler[] = [];
  readonly published: DomainEvent[] = [];

  subscribe<TEvent extends DomainEvent>(name: TEvent["name"], handler: EventHandler<TEvent>): void {
    const handlers = this.handlers.get(name) ?? [];
    handlers.push(handler as EventHandler);
    this.handlers.set(name, handlers);
  }

  subscribeAll(handler: EventHandler): void {
    this.globalHandlers.push(handler);
  }

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    this.published.push(event);

    for (const handler of this.globalHandlers) {
      await handler(event);
    }

    const handlers = this.handlers.get(event.name) ?? [];

    for (const handler of handlers) {
      await handler(event);
    }
  }
}
