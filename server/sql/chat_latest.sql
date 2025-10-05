SELECT character_id, MAX(last_interaction) AS last_interaction
FROM chats
GROUP BY character_id