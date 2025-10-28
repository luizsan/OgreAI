import { Statement } from "bun:sqlite";
import { db } from "../core/database.ts"

export const ADD: Statement = db.prepare(`
    INSERT INTO bookmarks (candidate_id, create_date)
    VALUES (?, ?)
    ON CONFLICT (candidate_id) DO NOTHING
`);

export const DELETE: Statement = db.prepare(`
    DELETE FROM bookmarks
    WHERE candidate_id = ?
`);

export const LIST: Statement = db.prepare(`
    SELECT
    c.*,
    m.chat_id,
    m.participant,
    ch.character_id,
    ch.title as chat_title,
    b.create_date as bookmarked_at
    FROM bookmarks b
    JOIN candidates c ON b.candidate_id = c.id
    JOIN messages m ON c.message_id = m.id
    JOIN chats ch ON m.chat_id = ch.id
    WHERE ch.character_id = ?
    ORDER BY b.create_date DESC
`);