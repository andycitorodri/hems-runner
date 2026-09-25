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

-- Marca de "puntuación poco creíble" (ver plausibility() en worker/index.js)
ALTER TABLE scores ADD COLUMN suspect INTEGER NOT NULL DEFAULT 0;

-- Auditoría de puntuación: de dónde salieron los puntos y multiplicador diario
ALTER TABLE scores ADD COLUMN src TEXT;
ALTER TABLE scores ADD COLUMN mult INTEGER;

-- Puntuación original de las partidas de la beta (multiplicador diario roto),
-- convertidas a 'equivalente' el 25-09-2026:
--   score = (coins*10 + patients*100 + distance/2) * 3
ALTER TABLE scores ADD COLUMN score_raw INTEGER;

-- Inscripciones a la Jornada (formulario propio que se vuelca al del hospital)
CREATE TABLE IF NOT EXISTS inscripcions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'prova',   -- prova | real
  nom TEXT, cognom1 TEXT, cognom2 TEXT,
  dia TEXT, mes TEXT, any TEXT,
  tel TEXT, movil TEXT, mail TEXT,
  domicili TEXT, cpostal TEXT, localitat TEXT, nif TEXT,
  professio TEXT, modalitat TEXT, centre TEXT,
  gdpr INTEGER NOT NULL DEFAULT 0,
  enviat INTEGER NOT NULL DEFAULT 0,    -- 1 = volcada al formulario del hospital
  enviat_ts INTEGER,
  resposta TEXT,                        -- qué contestó el servidor del hospital
  ip TEXT, ua TEXT
);
CREATE INDEX IF NOT EXISTS inscripcions_ts ON inscripcions(ts DESC);
CREATE INDEX IF NOT EXISTS inscripcions_mail ON inscripcions(mail);
