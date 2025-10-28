import { Statement } from "bun:sqlite";
import { db } from "../core/database.ts";

export const COUNT: Statement = db.prepare(`
    SELECT character_id, COUNT(*) AS count
    FROM chats
    GROUP BY character_id
`);

export const CREATE: Statement = db.prepare(`
    INSERT INTO chats (character_id, title, create_date, last_interaction, metadata)
    VALUES (?, ?, ?, ?, ?)
    RETURNING id, create_date
`);

export const DELETE: Statement = db.prepare(`
    DELETE FROM chats
    WHERE id = ?
`);

export const FIND: Statement = db.prepare(`
    SELECT id FROM chats
    WHERE character_id = ? AND title = ?
    LIMIT 1
`);

export const GET: Statement = db.prepare(`
    SELECT *
    FROM chats
    WHERE id = ?
`);

export const INTERACTIONS: Statement = db.prepare(`
    WITH newest AS (
    SELECT m.chat_id AS chat_id, MAX(c.create_date) AS max_create
    FROM messages m
    JOIN candidates c ON c.message_id = m.id
    GROUP BY m.chat_id
    )
    UPDATE chats
    SET last_interaction = (
    SELECT max_create FROM newest WHERE newest.chat_id = chats.id
    )
    WHERE chats.id IN (SELECT chat_id FROM newest)
    AND chats.last_interaction != (
        SELECT max_create FROM newest WHERE newest.chat_id = chats.id
    )
`);

export const LATEST: Statement = db.prepare(`
    SELECT character_id, MAX(last_interaction) AS last_interaction
    FROM chats
    GROUP BY character_id
`);

export const LIST: Statement = db.prepare(`
    SELECT *
    FROM chats
    WHERE character_id = ?
    ORDER BY last_interaction DESC
`);

export const UPDATE: Statement = db.prepare(`
    UPDATE chats
    SET title = ?, last_interaction = ?, metadata = ?
    WHERE id = ?
`);