import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import { hashPassword, signOperationalToken } from "@atlas/core-security";
import type { OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export interface AtlasUser {
  readonly id: UserId;
  readonly organizationId: OrganizationId;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  readonly passwordHash: string;
  readonly createdAt: string;
}

export interface RegisterUserCommand {
  readonly organizationId: OrganizationId;
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
  readonly roles?: readonly string[];
}

export async function registerUser(command: RegisterUserCommand, context: OperationalContext, bus: EventBus): Promise<AtlasUser> {
  const user: AtlasUser = {
    id: createId<UserId>("usr"),
    organizationId: command.organizationId,
    email: command.email.trim().toLowerCase(),
    displayName: command.displayName.trim(),
    roles: command.roles ?? ["viewer"],
    passwordHash: await hashPassword(command.password),
    createdAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "auth.user_registered",
      { userId: user.id, organizationId: user.organizationId },
      context,
      { organizationId: user.organizationId, actorId: user.id, sourceModule: "auth" }
    )
  );
  return user;
}

export function issueSessionToken(user: AtlasUser, secret: string): string {
  return signOperationalToken(
    {
      sub: user.id,
      organizationId: user.organizationId,
      roles: user.roles
    },
    secret
  );
}
