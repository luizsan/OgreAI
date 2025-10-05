WITH newest AS (
  SELECT m.chat_id AS chat_id, MAX(c.create_date) AS max_create
  FROM messages m
  JOIN candidates c ON c.message_id = m.id
  GROUP BY m.chat_id
)
UPDATE chats
SET last_interaction = (
  SELECT max_create FROM newest WHERE newest.chat_id = chats.id
)
WHERE chats.id IN (SELECT chat_id FROM newest)
  AND chats.last_interaction != (
    SELECT max_create FROM newest WHERE newest.chat_id = chats.id
)
