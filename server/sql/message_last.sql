SELECT id FROM messages
WHERE chat_id = ?
ORDER BY id DESC
LIMIT COALESCE(?, 1)
