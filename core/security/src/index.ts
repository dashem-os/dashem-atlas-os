import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { OperationalContext } from "@atlas/core-shared";

const scrypt = promisify(scryptCallback);

export type Permission =
  | "organization:read"
  | "asset:read"
  | "asset:write"
  | "maintenance:write"
  | "construction:write"
  | "workflow:approve"
  | "ai:invoke"
  | "notification:send";

export interface Policy {
  readonly role: string;
  readonly permissions: readonly Permission[];
}

export const defaultPolicies: readonly Policy[] = [
  {
    role: "owner",
    permissions: [
      "organization:read",
      "asset:read",
      "asset:write",
      "maintenance:write",
      "construction:write",
      "workflow:approve",
      "ai:invoke",
      "notification:send"
    ]
  },
  {
    role: "operator",
    permissions: ["organization:read", "asset:read", "asset:write", "maintenance:write", "notification:send"]
  },
  {
    role: "viewer",
    permissions: ["organization:read", "asset:read"]
  }
];

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");

  if (!salt || !key) {
    return false;
  }

  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(key, "hex"), derived);
}

export function hasPermission(context: OperationalContext, permission: Permission): boolean {
  const roles = context.actor?.roles ?? [];
  const allowed = defaultPolicies
    .filter((policy) => roles.includes(policy.role))
    .flatMap((policy) => policy.permissions);

  return allowed.includes(permission);
}

export function signOperationalToken(payload: object, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyOperationalToken<T extends object>(token: string, secret: string): T | null {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(body).digest("base64url");

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
}
