INSERT INTO chats (character_id, title, metadata)
VALUES (?, ?, ?)
RETURNING id, create_date