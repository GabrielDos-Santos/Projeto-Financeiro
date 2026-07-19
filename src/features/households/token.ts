import { createHash } from "node:crypto";

/** O token cru vai só no link do convite; o banco guarda apenas o sha-256. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
