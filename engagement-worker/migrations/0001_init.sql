CREATE TABLE IF NOT EXISTS visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS visitors_last_seen_idx
ON visitors (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS page_view_events (
  visitor_id TEXT NOT NULL,
  path TEXT NOT NULL,
  hour_bucket TEXT NOT NULL,
  viewed_at TEXT NOT NULL,
  PRIMARY KEY (visitor_id, path, hour_bucket),
  FOREIGN KEY (visitor_id) REFERENCES visitors (visitor_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS page_view_events_path_idx
ON page_view_events (path);

CREATE TABLE IF NOT EXISTS favorites (
  visitor_id TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (visitor_id, path),
  FOREIGN KEY (visitor_id) REFERENCES visitors (visitor_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS favorites_path_idx
ON favorites (path);
