SELECT id FROM messages
WHERE chat_id = ?
ORDER BY create_date DESC
LIMIT 1
