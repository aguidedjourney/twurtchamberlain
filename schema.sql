-- Run once against the D1 database (Cloudflare dashboard > D1 > Console, or wrangler d1 execute).
CREATE TABLE IF NOT EXISTS uploads (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('photo','video')),
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  r2_key       TEXT NOT NULL,
  name         TEXT,
  show_name    TEXT,
  caption      TEXT,
  status       TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','pending','approved','rejected')),
  ip_hash      TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  reviewed_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads (status, created_at);
CREATE INDEX IF NOT EXISTS idx_uploads_ip ON uploads (ip_hash, created_at);
