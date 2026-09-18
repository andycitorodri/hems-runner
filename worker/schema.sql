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

-- Analítica: una fila por evento (open = carga de la página, play = partida
-- empezada, end = partida terminada). País/ciudad los pone Cloudflare.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,
  device TEXT,
  session TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  ua_kind TEXT,
  os TEXT,
  browser TEXT,
  lang TEXT,
  ref TEXT,
  screen TEXT,
  score INTEGER,
  distance INTEGER,
  duration INTEGER
);
CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS events_device ON events(device);
