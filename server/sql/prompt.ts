import { Statement } from "bun:sqlite";
import { db } from "../core/database.ts"

export const DELETE: Statement = db.prepare(`
    DELETE FROM prompts WHERE id = ?
`);

export const GET: Statement = db.prepare(`
    SELECT * FROM prompts
    WHERE id = ?
`);

export const LIST: Statement = db.prepare(`
    SELECT * FROM prompts
    WHERE type = ?
`);

export const UPDATE: Statement = db.prepare(`
    UPDATE prompts
    SET title = ?, content = ?, type = ?
    WHERE id = ?
`);