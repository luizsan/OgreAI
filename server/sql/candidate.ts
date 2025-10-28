import { Statement } from "bun:sqlite";
import { db } from "../core/database.ts";

export const CREATE: Statement = db.prepare(`
    INSERT INTO candidates (message_id, text_content, text_reasoning, create_date, model, timer, tokens, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id
`);

export const DELETE: Statement = db.prepare(`
    DELETE FROM candidates
    WHERE id = ?
`);

export const GET: Statement = db.prepare(`
    SELECT *
    FROM candidates
    WHERE id = ?
`);

export const LIST: Statement = db.prepare(`
    SELECT *
    FROM candidates
    WHERE message_id = ?
    ORDER BY id ASC
`);

export const UPDATE: Statement = db.prepare(`
    UPDATE candidates
    SET text_content = ?, text_reasoning = ?, create_date = ?, model = ?, timer = ?, tokens = ?, metadata = ?
    WHERE id = ?
`);