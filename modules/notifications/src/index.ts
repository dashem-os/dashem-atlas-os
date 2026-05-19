import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type NotificationChannel = "email" | "sms" | "push" | "in_app";

export interface Notification {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly recipientUserId: UserId;
  readonly channel: NotificationChannel;
  readonly subject: string;
  readonly body: string;
  readonly createdAt: string;
}

export interface SendNotificationCommand {
  readonly organizationId: OrganizationId;
  readonly recipientUserId: UserId;
  readonly channel: NotificationChannel;
  readonly subject: string;
  readonly body: string;
}

export async function queueNotification(
  command: SendNotificationCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<Notification> {
  const notification: Notification = {
    id: createId("ntf"),
    organizationId: command.organizationId,
    recipientUserId: command.recipientUserId,
    channel: command.channel,
    subject: command.subject,
    body: command.body,
    createdAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "notification.queued",
      { notificationId: notification.id, organizationId: notification.organizationId },
      context,
      { organizationId: notification.organizationId, actorId: notification.recipientUserId, sourceModule: "notifications" }
    )
  );
  return notification;
}
