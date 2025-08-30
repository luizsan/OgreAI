INSERT INTO messages (chat_id, participant, parent_id, candidate, metadata)
VALUES (?, ?, ?, ?, ?)
RETURNING id