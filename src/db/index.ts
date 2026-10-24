import * as SQLite from 'expo-sqlite';
import { DEFAULT_TEMPLATES } from './templates';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

const DB_VERSION = 4;

async function init(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('duzen.db');
  // Temel tablolar (ilk sürümdeki şekil). Yeni sütunlar aşağıdaki göçte eklenir;
  // böylece önceki sürümle oluşturulmuş veriler korunur.
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_at TEXT,
      due_has_time INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      done INTEGER NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS card_tags (
      card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (card_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hint TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      lists TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_cards_list ON cards(list_id);
    CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due_at);
    CREATE INDEX IF NOT EXISTS idx_lists_board ON lists(board_id);
    CREATE INDEX IF NOT EXISTS idx_subtasks_card ON subtasks(card_id);
  `);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version < 2) await migrateTo2(db);
  if (version < 3) await migrateTo3(db);
  if (version < 4) await migrateTo4(db);
  return db;
}

async function hasColumn(db: SQLite.SQLiteDatabase, table: string, column: string): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function migrateTo2(db: SQLite.SQLiteDatabase): Promise<void> {
  // Listelerde "tamamlanma listesi" bayrağı
  if (!(await hasColumn(db, 'lists', 'is_done'))) {
    await db.execAsync('ALTER TABLE lists ADD COLUMN is_done INTEGER NOT NULL DEFAULT 0');
    // Eski sürümde her panonun son listesi "tamamlandı" sayılıyordu
    const boards = await db.getAllAsync<{ id: number }>('SELECT id FROM boards');
    for (const b of boards) {
      const last = await db.getFirstAsync<{ id: number }>('SELECT id FROM lists WHERE board_id = ? ORDER BY sort DESC, id DESC LIMIT 1', [b.id]);
      if (last) await db.runAsync('UPDATE lists SET is_done = 1 WHERE id = ?', [last.id]);
    }
  }
  if (!(await hasColumn(db, 'cards', 'repeat'))) {
    await db.execAsync("ALTER TABLE cards ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none'");
  }
  if (!(await hasColumn(db, 'cards', 'completed_at'))) {
    await db.execAsync('ALTER TABLE cards ADD COLUMN completed_at TEXT');
  }
  if (!(await hasColumn(db, 'cards', 'created_at'))) {
    await db.execAsync('ALTER TABLE cards ADD COLUMN created_at TEXT');
  }

  // Varsayılan şablonlar
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM templates');
  if (!count || count.n === 0) {
    for (let i = 0; i < DEFAULT_TEMPLATES.length; i++) {
      const t = DEFAULT_TEMPLATES[i];
      await db.runAsync('INSERT INTO templates (name, hint, icon, color, lists, sort) VALUES (?, ?, ?, ?, ?, ?)', [
        t.name,
        t.hint,
        t.icon,
        t.color,
        JSON.stringify(t.lists),
        i,
      ]);
    }
  }

  await db.execAsync('PRAGMA user_version = 2');
}

/** v3: tarih aralığı için başlangıç tarihi (boşsa görev tek günlüktür) */
async function migrateTo3(db: SQLite.SQLiteDatabase): Promise<void> {
  if (!(await hasColumn(db, 'cards', 'start_at'))) {
    await db.execAsync('ALTER TABLE cards ADD COLUMN start_at TEXT');
  }
  await db.execAsync('PRAGMA user_version = 3');
}

/** v4: tekrar eden görevde geri alma bağlantısı ve odak süresi */
async function migrateTo4(db: SQLite.SQLiteDatabase): Promise<void> {
  if (!(await hasColumn(db, 'cards', 'next_id'))) {
    await db.execAsync('ALTER TABLE cards ADD COLUMN next_id INTEGER');
  }
  if (!(await hasColumn(db, 'cards', 'focus_minutes'))) {
    await db.execAsync('ALTER TABLE cards ADD COLUMN focus_minutes INTEGER NOT NULL DEFAULT 0');
  }
  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
