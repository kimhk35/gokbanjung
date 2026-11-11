// Retired: this tool assigned administrators through the deleted Supabase
// auth.users table. Accounts now live in the Neon database auth tables.
// Use `node scripts/bootstrap-admin.mjs` (or scripts/approve-first-admin.sql).
console.error(
  "bootstrap-admin.mts is retired. Run `node scripts/bootstrap-admin.mjs` instead.",
);
process.exitCode = 1;
export {};
