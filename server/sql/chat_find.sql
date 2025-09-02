SELECT * FROM chats
WHERE character_id = ? AND title = ? AND create_date = ?
ORDER BY last_interaction DESC