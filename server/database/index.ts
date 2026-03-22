import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { DB_PATH, CREATE_TABLES_SQL } from './schema'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(CREATE_TABLES_SQL)

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
