CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
