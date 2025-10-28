import { Statement } from "bun:sqlite";
import { db } from "../core/database.ts"

export const CREATE: Statement = db.prepare(`
    INSERT INTO messages (chat_id, create_date, participant, candidate, metadata)
    VALUES (?, ?, ?, ?, ?)
    RETURNING id
`);

export const DELETE: Statement = db.prepare(`
    DELETE FROM messages WHERE id = ?
`);

export const GET: Statement = db.prepare(`
    SELECT * FROM messages
    WHERE id = ?
`);

export const LAST: Statement = db.prepare(`
    SELECT id FROM messages
    WHERE chat_id = ?
    ORDER BY create_date DESC
    LIMIT 1
`);

export const LIST: Statement = db.prepare(`
    SELECT * FROM messages
    WHERE chat_id = ?
    ORDER BY create_date ASC
`);

export const SWIPE: Statement = db.prepare(`
    UPDATE messages
    SET candidate = ?
    WHERE id = ?
`);

export const UPDATE: Statement = db.prepare(`
    UPDATE messages
    SET candidate = ?, metadata = ?
    WHERE id = ?
`);