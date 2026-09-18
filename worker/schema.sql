-- HEMS Runner · ranking en servidor (Cloudflare D1)
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  score INTEGER NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0,
  patients INTEGER NOT NULL DEFAULT 0,
  distance INTEGER NOT NULL DEFAULT 0,
  device TEXT,
  lang TEXT,
  ua TEXT,
  ip TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS scores_ts ON scores(ts DESC);
