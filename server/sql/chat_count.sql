SELECT character_id, COUNT(*) AS count
FROM chats
GROUP BY character_id