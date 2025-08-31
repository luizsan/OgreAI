INSERT INTO chats (character_id, title, create_date, last_interaction, metadata)
VALUES (?, ?, ?, ?, ?)
RETURNING id, create_date