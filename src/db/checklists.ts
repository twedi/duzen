import { getDb } from './index';

/** Basit listeler: alışveriş, bavul, okuma listesi gibi. Tarih, pano, öncelik yok. */

export type Checklist = {
  id: number;
  name: string;
  color: string;
  icon: string;
  sort: number;
  created_at: string | null;
  total: number;
  done: number;
};

export type ChecklistItem = {
  id: number;
  list_id: number;
  text: string;
  done: number;
  sort: number;
  created_at: string | null;
};

export type ChecklistInput = { name: string; color: string; icon: string };

/** Yeni liste penceresindeki hazır başlangıçlar */
export const LIST_PRESETS: (ChecklistInput & { hint: string })[] = [
  { name: 'Alışveriş', icon: 'cart-outline', color: '#7DAE92', hint: 'Market, ev ihtiyaçları' },
  { name: 'Yapılacaklar', icon: 'checkbox-marked-circle-outline', color: '#8579E8', hint: 'Hızlı küçük işler' },
  { name: 'Bavul', icon: 'bag-suitcase-outline', color: '#5B9BE6', hint: 'Yolculuk için' },
  { name: 'Okuma listesi', icon: 'book-open-variant', color: '#D9976A', hint: 'Kitaplar, makaleler' },
  { name: 'Hediye fikirleri', icon: 'gift-outline', color: '#EE8FC0', hint: 'Unutmamak için' },
];

export const LIST_ICONS = [
  'format-list-checks',
  'cart-outline',
  'checkbox-marked-circle-outline',
  'bag-suitcase-outline',
  'book-open-variant',
  'gift-outline',
  'food-apple-outline',
  'home-outline',
  'school-outline',
  'movie-open-outline',
  'dumbbell',
  'star-outline',
];

export async function listChecklists(): Promise<Checklist[]> {
  const db = await getDb();
  return db.getAllAsync<Checklist>(`
    SELECT l.*,
      (SELECT COUNT(*) FROM checklist_items i WHERE i.list_id = l.id) AS total,
      (SELECT COUNT(*) FROM checklist_items i WHERE i.list_id = l.id AND i.done = 1) AS done
    FROM checklists l ORDER BY l.sort, l.id
  `);
}

export async function getChecklist(id: number): Promise<Checklist | null> {
  const db = await getDb();
  return db.getFirstAsync<Checklist>(
    `SELECT l.*,
      (SELECT COUNT(*) FROM checklist_items i WHERE i.list_id = l.id) AS total,
      (SELECT COUNT(*) FROM checklist_items i WHERE i.list_id = l.id AND i.done = 1) AS done
     FROM checklists l WHERE l.id = ?`,
    [id]
  );
}

export async function createChecklist(input: ChecklistInput): Promise<number> {
  const db = await getDb();
  const m = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort) AS m FROM checklists');
  const res = await db.runAsync('INSERT INTO checklists (name, color, icon, sort, created_at) VALUES (?, ?, ?, ?, ?)', [
    input.name,
    input.color,
    input.icon,
    (m?.m ?? -1) + 1,
    new Date().toISOString(),
  ]);
  return res.lastInsertRowId;
}

export async function updateChecklist(id: number, input: ChecklistInput): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE checklists SET name = ?, color = ?, icon = ? WHERE id = ?', [input.name, input.color, input.icon, id]);
}

export async function deleteChecklist(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM checklists WHERE id = ?', [id]);
}

export async function getItems(listId: number): Promise<ChecklistItem[]> {
  const db = await getDb();
  return db.getAllAsync<ChecklistItem>('SELECT * FROM checklist_items WHERE list_id = ? ORDER BY sort, id', [listId]);
}

/** Birden çok satır yapıştırılırsa her satır ayrı öğe olur */
export async function addItems(listId: number, raw: string): Promise<number> {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•\s]+/, '').trim())
    .filter(Boolean);
  if (!lines.length) return 0;
  const db = await getDb();
  const m = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort) AS m FROM checklist_items WHERE list_id = ?', [listId]);
  let sort = (m?.m ?? -1) + 1;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const text of lines) {
      await db.runAsync('INSERT INTO checklist_items (list_id, text, done, sort, created_at) VALUES (?, ?, 0, ?, ?)', [listId, text, sort++, now]);
    }
  });
  return lines.length;
}

export async function updateItemText(id: number, text: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE checklist_items SET text = ? WHERE id = ?', [text, id]);
}

export async function setItemDone(id: number, done: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE checklist_items SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
}

export async function deleteItem(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM checklist_items WHERE id = ?', [id]);
}

/** Silinen öğeyi "Geri al" ile aynı yerine koyar */
export async function restoreItem(item: ChecklistItem): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO checklist_items (list_id, text, done, sort, created_at) VALUES (?, ?, ?, ?, ?)', [
    item.list_id,
    item.text,
    item.done,
    item.sort,
    item.created_at,
  ]);
}

export async function reorderItems(ids: number[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) await db.runAsync('UPDATE checklist_items SET sort = ? WHERE id = ?', [i, ids[i]]);
  });
}

export async function clearDoneItems(listId: number): Promise<ChecklistItem[]> {
  const db = await getDb();
  const removed = await db.getAllAsync<ChecklistItem>('SELECT * FROM checklist_items WHERE list_id = ? AND done = 1', [listId]);
  await db.runAsync('DELETE FROM checklist_items WHERE list_id = ? AND done = 1', [listId]);
  return removed;
}

export async function uncheckAll(listId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE checklist_items SET done = 0 WHERE list_id = ?', [listId]);
}

/** Paylaşmak için düz metin: "Alışveriş\n☐ Süt\n☑ Ekmek" */
export function checklistAsText(list: Checklist, items: ChecklistItem[]): string {
  const open = items.filter((i) => !i.done).map((i) => `☐ ${i.text}`);
  const done = items.filter((i) => i.done).map((i) => `☑ ${i.text}`);
  return [list.name, '', ...open, ...done].join('\n');
}
