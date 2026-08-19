import { Pool } from "pg";

export const LANGUAGE_OPTIONS = ["English", "Telugu", "Hindi"] as const;
export type PreferredLanguage = (typeof LANGUAGE_OPTIONS)[number];

type AccessMateUser = {
  id: number;
  externalUserId: string;
  preferredLanguage: PreferredLanguage;
};

export type AccessMateDocument = {
  id: number;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  extractedText: string;
  processingStatus: "complete";
  createdAt: Date;
};

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

function getConnectionString() {
  const candidate = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!candidate || !/^postgres(?:ql)?:\/\//i.test(candidate)) {
    throw new Error("AccessMate requires NEON_DATABASE_URL with a PostgreSQL connection string.");
  }
  return candidate;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
      ssl: { rejectUnauthorized: false },
      max: 4,
    });
  }
  return pool;
}

export async function verifyAccessMateDatabase() {
  await ensureSchema();
  const result = await getPool().query<{ healthy: number }>("SELECT 1 AS healthy");
  return result.rows[0]?.healthy === 1;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = getPool();
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          external_user_id TEXT NOT NULL UNIQUE,
          display_name TEXT,
          email TEXT,
          preferred_language VARCHAR(16) NOT NULL DEFAULT 'English'
            CHECK (preferred_language IN ('English', 'Telugu', 'Hindi')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS documents (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          file_name TEXT NOT NULL,
          file_key TEXT NOT NULL UNIQUE,
          file_url TEXT NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          file_size INTEGER NOT NULL CHECK (file_size > 0),
          extracted_text TEXT NOT NULL,
          processing_status VARCHAR(32) NOT NULL DEFAULT 'complete',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS documents_user_created_idx ON documents(user_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS document_analysis (
          id BIGSERIAL PRIMARY KEY,
          document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          analysis_status VARCHAR(32) NOT NULL DEFAULT 'reserved',
          analysis_payload JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

async function getOrCreateUser(input: { externalUserId: string; displayName?: string | null; email?: string | null }): Promise<AccessMateUser> {
  await ensureSchema();
  const db = getPool();
  const result = await db.query<{
    id: string;
    external_user_id: string;
    preferred_language: PreferredLanguage;
  }>(
    `INSERT INTO users (external_user_id, display_name, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (external_user_id) DO UPDATE
       SET display_name = EXCLUDED.display_name, email = EXCLUDED.email, updated_at = NOW()
     RETURNING id, external_user_id, preferred_language`,
    [input.externalUserId, input.displayName ?? null, input.email ?? null],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Unable to create an AccessMate user record.");
  return { id: Number(row.id), externalUserId: row.external_user_id, preferredLanguage: row.preferred_language };
}

export async function getPreferredLanguage(user: { openId: string; name?: string | null; email?: string | null }) {
  const accessMateUser = await getOrCreateUser({ externalUserId: user.openId, displayName: user.name, email: user.email });
  return accessMateUser.preferredLanguage;
}

export async function setPreferredLanguage(user: { openId: string; name?: string | null; email?: string | null }, language: PreferredLanguage) {
  const accessMateUser = await getOrCreateUser({ externalUserId: user.openId, displayName: user.name, email: user.email });
  const result = await getPool().query<{ preferred_language: PreferredLanguage }>(
    "UPDATE users SET preferred_language = $1, updated_at = NOW() WHERE id = $2 RETURNING preferred_language",
    [language, accessMateUser.id],
  );
  return result.rows[0]?.preferred_language ?? language;
}

export async function saveDocument(input: {
  user: { openId: string; name?: string | null; email?: string | null };
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  extractedText: string;
}): Promise<AccessMateDocument> {
  const accessMateUser = await getOrCreateUser({ externalUserId: input.user.openId, displayName: input.user.name, email: input.user.email });
  const result = await getPool().query(
    `INSERT INTO documents (user_id, file_name, file_key, file_url, mime_type, file_size, extracted_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, file_name, file_key, file_url, mime_type, file_size, extracted_text, processing_status, created_at`,
    [accessMateUser.id, input.fileName, input.fileKey, input.fileUrl, input.mimeType, input.fileSize, input.extractedText],
  );
  return mapDocument(result.rows[0]);
}

export async function listDocuments(user: { openId: string; name?: string | null; email?: string | null }) {
  const accessMateUser = await getOrCreateUser({ externalUserId: user.openId, displayName: user.name, email: user.email });
  const result = await getPool().query(
    `SELECT id, file_name, file_key, file_url, mime_type, file_size, extracted_text, processing_status, created_at
     FROM documents WHERE user_id = $1 ORDER BY created_at DESC`,
    [accessMateUser.id],
  );
  return result.rows.map(mapDocument);
}

export async function getDocument(user: { openId: string; name?: string | null; email?: string | null }, documentId: number) {
  const accessMateUser = await getOrCreateUser({ externalUserId: user.openId, displayName: user.name, email: user.email });
  const result = await getPool().query(
    `SELECT id, file_name, file_key, file_url, mime_type, file_size, extracted_text, processing_status, created_at
     FROM documents WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [documentId, accessMateUser.id],
  );
  return result.rows[0] ? mapDocument(result.rows[0]) : null;
}

export async function deleteDocument(user: { openId: string; name?: string | null; email?: string | null }, documentId: number) {
  const accessMateUser = await getOrCreateUser({ externalUserId: user.openId, displayName: user.name, email: user.email });
  const result = await getPool().query("DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id", [documentId, accessMateUser.id]);
  return result.rowCount === 1;
}

function mapDocument(row: Record<string, unknown>): AccessMateDocument {
  return {
    id: Number(row.id),
    fileName: String(row.file_name),
    fileKey: String(row.file_key),
    fileUrl: String(row.file_url),
    mimeType: String(row.mime_type),
    fileSize: Number(row.file_size),
    extractedText: String(row.extracted_text),
    processingStatus: "complete",
    createdAt: new Date(String(row.created_at)),
  };
}
