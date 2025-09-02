INSERT INTO messages (chat_id, create_date, participant, candidate, metadata)
VALUES (?, ?, ?, ?, ?)
RETURNING id