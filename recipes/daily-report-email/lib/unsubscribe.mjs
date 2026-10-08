// Signed one-click unsubscribe links, so nobody can unsubscribe someone else by guessing an id.
import { createHmac, timingSafeEqual } from "node:crypto";
const sign = (email, secret) => createHmac("sha256", secret).update(email.toLowerCase()).digest("base64url");
export const unsubscribeUrl = (base, email, secret) =>
  `${base}/api/unsubscribe?e=${encodeURIComponent(email.toLowerCase())}&t=${sign(email, secret)}`;
export function verifyUnsubscribe(email, token, secret) {
  const a = Buffer.from(sign(email ?? "", secret)), b = Buffer.from(token ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}
