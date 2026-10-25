import { getDb } from './index';

/** Her tablo için sütunlar ve eski yedeklerde eksik olabilecek sütunların varsayılanları */
const TABLES: Record<string, { cols: string[]; defaults?: Record<string, unknown> }> = {
  boards: { cols: ['id', 'name', 'description', 'color', 'icon', 'sort'], defaults: { description: '', sort: 0 } },
  lists: { cols: ['id', 'board_id', 'name', 'sort', 'is_done'], defaults: { sort: 0, is_done: 0 } },
  cards: {
    cols: ['id', 'list_id', 'title', 'description', 'due_at', 'due_has_time', 'priority', 'done', 'sort', 'repeat', 'completed_at', 'created_at', 'start_at', 'next_id', 'focus_minutes'],
    defaults: { description: '', due_has_time: 0, priority: 'medium', done: 0, sort: 0, repeat: 'none', focus_minutes: 0 },
  },
  subtasks: { cols: ['id', 'card_id', 'title', 'done', 'sort'], defaults: { done: 0, sort: 0 } },
  tags: { cols: ['id', 'name'] },
  card_tags: { cols: ['card_id', 'tag_id'] },
  templates: { cols: ['id', 'name', 'hint', 'icon', 'color', 'lists', 'sort'], defaults: { hint: '', sort: 0 } },
  checklists: { cols: ['id', 'name', 'color', 'icon', 'sort', 'created_at'], defaults: { sort: 0 } },
  checklist_items: { cols: ['id', 'list_id', 'text', 'done', 'sort', 'created_at'], defaults: { done: 0, sort: 0 } },
};

/** Eski yedeklerde bulunmayabilecek tablolar: yedekte varsa geri yüklenir, yoksa mevcut hali korunur */
const OPTIONAL_GROUPS = [['templates'], ['checklists', 'checklist_items']];

const DATA_ORDER = ['boards', 'lists', 'cards', 'subtasks', 'tags', 'card_tags'];

export type BackupFile = {
  app: 'duzen';
  version: number;
  exportedAt: string;
  [table: string]: any;
};

export async function exportAll(): Promise<string> {
  const db = await getDb();
  const out: Record<string, unknown> = { app: 'duzen', version: 5, exportedAt: new Date().toISOString() };
  for (const t of [...DATA_ORDER, 'templates', 'checklists', 'checklist_items']) {
    out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  }
  return JSON.stringify(out, null, 2);
}

export function parseBackup(text: string): BackupFile {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Dosya okunamadı (geçerli bir JSON değil).');
  }
  if (!data || data.app !== 'duzen' || ![1, 2, 3, 4, 5].includes(data.version)) {
    throw new Error('Bu dosya Düzen yedeği gibi görünmüyor.');
  }
  for (const t of DATA_ORDER) {
    if (!Array.isArray(data[t])) throw new Error(`Yedekte "${t}" bölümü eksik.`);
  }
  return data as BackupFile;
}

export async function importAll(backup: BackupFile): Promise<void> {
  const db = await getDb();
  const tables = [...DATA_ORDER];
  for (const group of OPTIONAL_GROUPS) {
    if (group.every((t) => Array.isArray(backup[t]))) tables.push(...group);
  }

  await db.withTransactionAsync(async () => {
    for (const t of [...tables].reverse()) {
      await db.runAsync(`DELETE FROM ${t}`);
    }
    for (const t of tables) {
      const { cols, defaults = {} } = TABLES[t];
      const sql = `INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
      for (const row of backup[t] as Record<string, unknown>[]) {
        await db.runAsync(
          sql,
          cols.map((c) => (row[c] ?? defaults[c] ?? null) as any)
        );
      }
    }
    // Eski (v1) yedeklerde tamamlanma listesi bilgisi yok: her panonun son listesi kabul edilir
    if (backup.version === 1) {
      const boards = await db.getAllAsync<{ id: number }>('SELECT id FROM boards');
      for (const b of boards) {
        const last = await db.getFirstAsync<{ id: number }>('SELECT id FROM lists WHERE board_id = ? ORDER BY sort DESC, id DESC LIMIT 1', [b.id]);
        if (last) await db.runAsync('UPDATE lists SET is_done = 1 WHERE id = ?', [last.id]);
      }
    }
  });
}
