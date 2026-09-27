/**
 * Grant a role via Firebase custom claims.
 *   npm run set-role -- someone@example.com SUPER_ADMIN
 * Use this once to create the first super admin; afterwards manage roles in /admin.
 */
import { FieldValue } from "firebase-admin/firestore";

import { ROLES, type Role } from "../src/lib/domain/enums";
import { auth, db, initAdmin } from "./_admin";

async function main() {
  const [email, roleArg] = process.argv.slice(2);
  const role = roleArg?.toUpperCase() as Role;
  if (!email || !ROLES.includes(role)) {
    console.error(`Usage: npm run set-role -- <email> <${ROLES.join("|")}>`);
    process.exit(1);
  }
  initAdmin();
  const user = await auth().getUserByEmail(email.toLowerCase());
  await auth().setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role });
  await db()
    .collection("users")
    .doc(user.uid)
    .set(
      {
        email: user.email?.toLowerCase(),
        name: user.displayName ?? user.email?.split("@")[0],
        role,
        onboarded: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  await auth().revokeRefreshTokens(user.uid);
  console.log(`✔ ${email} is now ${role}. They must sign in again.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
