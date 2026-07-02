// Generate a bcrypt hash for the staff password.
// Usage: node scripts/hash-password.mjs 'your-strong-password'
import bcrypt from "bcryptjs";

const pw = process.argv[2];
if (!pw) {
  console.error("Usage: node scripts/hash-password.mjs 'your-strong-password'");
  process.exit(1);
}
console.log(bcrypt.hashSync(pw, 12));
console.log("\nPut this in your environment as STAFF_PASSWORD_HASH (do not commit it).");
