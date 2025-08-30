PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  character_id TEXT NOT NULL,
  create_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT DEFAULT '{}'
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  participant INTEGER NOT NULL,
  parent_id INTEGER,
  candidate INTEGER NOT NULL,
  metadata TEXT DEFAULT '{}',
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Candidats table
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  text_content TEXT NOT NULL,
  text_reasoning TEXT,
  create_date INTEGER NOT NULL,
  model TEXT NOT NULL,
  timer INTEGER NOT NULL,
  tokens TEXT,
  metadata TEXT DEFAULT '{}',
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  persona TEXT DEFAULT '',
  customization TEXT DEFAULT '{}',
  metadata TEXT DEFAULT '{}'
);

-- Auth presets table
CREATE TABLE IF NOT EXISTS credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_mode TEXT,
  title TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  key TEXT NOT NULL
);

-- Prompts table, including system, jailbreak, prefill and custom
CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL
);

-- Lorebooks table
CREATE TABLE IF NOT EXISTS lorebooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS settings (
  api_mode TEXT PRIMARY KEY NOT NULL,
  main TEXT DEFAULT '{}',
  prompt TEXT DEFAULT '{}',
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_chats ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_parents ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_candidates ON candidates(message_id);