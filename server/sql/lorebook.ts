import { Statement } from "bun:sqlite";
import { db } from "../core/database.ts"

export const DELETE: Statement = db.prepare(`
    DELETE FROM lorebooks WHERE id = ?
`);

export const GET: Statement = db.prepare(`
    SELECT * FROM lorebooks
    WHERE id = ?
    LIMIT 1
`);

export const LIST: Statement = db.prepare(`
    SELECT * FROM lorebooks
`);

export const SAVE: Statement = db.prepare(`
    INSERT OR REPLACE INTO lorebooks (id, content, metadata)
    VALUES (?, ?, ?)
    RETURNING id
`);

export const TOGGLE: Statement = db.prepare(`
    UPDATE lorebooks
    SET toggled = ?
    WHERE id = ?
`);