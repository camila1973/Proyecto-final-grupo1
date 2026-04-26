import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`UPDATE reservations SET status = 'submitted' WHERE status = 'pending'`.execute(
    db,
  );
  await sql`UPDATE reservations SET status = 'held' WHERE status = 'on_hold'`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`UPDATE reservations SET status = 'on_hold' WHERE status = 'held'`.execute(
    db,
  );
  await sql`UPDATE reservations SET status = 'pending' WHERE status = 'submitted'`.execute(
    db,
  );
}
