INSERT INTO candidates (message_id, text_content, text_reasoning, create_date, model, timer, tokens, metadata)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id