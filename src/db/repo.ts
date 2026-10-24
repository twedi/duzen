import { getDb } from './index';
import { DEFAULT_LISTS, TemplateList } from './templates';
import { addDays, addRepeat, startOfDay } from '../dates';
import type { PriorityKey } from '../theme';

export type { TemplateList };
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly';

/* ================= Tipler ================= */

export type TemplateRow = {
  id: number;
  name: string;
  hint: string;
  icon: string;
  color: string;
  lists: TemplateList[];
  sort: number;
};
type RawTemplate = Omit<TemplateRow, 'lists'> & { lists: string };

export type Board = {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  sort: number;
};

export type BoardSummary = Board & { total: number; done: number; overdue: number };

export type ListRow = { id: number; board_id: number; name: string; sort: number; is_done: number };

export type BoardWithLists = Board & { lists: ListRow[] };

export type CardView = {
  id: number;
  list_id: number;
  board_id: number;
  title: string;
  description: string;
  due_at: string | null;
  due_has_time: number;
  priority: PriorityKey;
  done: number;
  sort: number;
  repeat: Repeat;
  completed_at: string | null;
  list_name: string;
  list_is_done: number;
  board_name: string;
  board_color: string;
  tags: string[];
  sub_total: number;
  sub_done: number;
};

export type SubtaskRow = { id: number; card_id: number; title: string; done: number; sort: number };

export type SaveCardInput = {
  id?: number;
  list_id: number;
  title: string;
  description: string;
  due_at: string | null;
  due_has_time: boolean;
  priority: PriorityKey;
  done: boolean;
  repeat: Repeat;
  tags: string[];
  subtasks: { title: string; done: boolean }[];
};

/* ================= Ayarlar ================= */

export type Settings = {
  theme: 'light' | 'dark' | 'system';
  remindersOn: boolean;
  overdueOn: boolean;
  checkTime: string; // "HH:MM"
};

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  remindersOn: true,
  overdueOn: true,
  checkTime: '09:00',
};

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const m: Record<string, string> = {};
  rows.forEach((r) => (m[r.key] = r.value));
  return {
    theme: (m.theme as Settings['theme']) ?? DEFAULT_SETTINGS.theme,
    remindersOn: m.remindersOn !== undefined ? m.remindersOn === '1' : DEFAULT_SETTINGS.remindersOn,
    overdueOn: m.overdueOn !== undefined ? m.overdueOn === '1' : DEFAULT_SETTINGS.overdueOn,
    checkTime: m.checkTime ?? DEFAULT_SETTINGS.checkTime,
  };
}

export async function setSetting(key: keyof Settings, value: string | boolean): Promise<void> {
  const db = await getDb();
  const v = typeof value === 'boolean' ? (value ? '1' : '0') : value;
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, v]);
}

/* ================= Şablonlar ================= */

function parseLists(s: string): TemplateList[] {
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) {
      return arr.map((x: any) => ({ name: String(x?.name ?? '').trim(), done: !!x?.done })).filter((x) => x.name);
    }
  } catch {
    // bozuk veri: boş liste döner
  }
  return [];
}

/** Boş adları atar, en fazla bir tamamlanma listesi bırakır */
function normalizeLists(lists: TemplateList[]): TemplateList[] {
  let doneSeen = false;
  return lists
    .map((l) => ({ name: l.name.trim(), done: l.done }))
    .filter((l) => l.name)
    .map((l) => {
      if (l.done && !doneSeen) {
        doneSeen = true;
        return l;
      }
      return { ...l, done: false };
    });
}

function toTemplate(r: RawTemplate): TemplateRow {
  return { ...r, lists: parseLists(r.lists) };
}

export async function listTemplates(): Promise<TemplateRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawTemplate>('SELECT * FROM templates ORDER BY sort, id');
  return rows.map(toTemplate);
}

export async function getTemplateById(id: number): Promise<TemplateRow | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<RawTemplate>('SELECT * FROM templates WHERE id = ?', [id]);
  return r ? toTemplate(r) : null;
}

export type SaveTemplateInput = { id?: number; name: string; hint: string; icon: string; color: string; lists: TemplateList[] };

export async function saveTemplate(t: SaveTemplateInput): Promise<number> {
  const db = await getDb();
  const lists = JSON.stringify(normalizeLists(t.lists));
  if (t.id) {
    await db.runAsync('UPDATE templates SET name = ?, hint = ?, icon = ?, color = ?, lists = ? WHERE id = ?', [
      t.name,
      t.hint,
      t.icon,
      t.color,
      lists,
      t.id,
    ]);
    return t.id;
  }
  const m = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort) AS m FROM templates');
  const res = await db.runAsync('INSERT INTO templates (name, hint, icon, color, lists, sort) VALUES (?, ?, ?, ?, ?, ?)', [
    t.name,
    t.hint,
    t.icon,
    t.color,
    lists,
    (m?.m ?? -1) + 1,
  ]);
  return res.lastInsertRowId;
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
}

export async function saveBoardAsTemplate(boardId: number, name: string): Promise<number> {
  const board = await getBoard(boardId);
  const lists = await getLists(boardId);
  return saveTemplate({
    name,
    hint: board?.description ?? '',
    icon: board?.icon ?? 'view-dashboard-outline',
    color: board?.color ?? '#8579E8',
    lists: lists.map((l) => ({ name: l.name, done: !!l.is_done })),
  });
}

/* ================= Panolar ================= */

export async function listBoards(): Promise<BoardSummary[]> {
  const db = await getDb();
  const today = startOfDay(new Date()).toISOString();
  return db.getAllAsync<BoardSummary>(
    `SELECT b.*,
      (SELECT COUNT(*) FROM cards c JOIN lists l ON l.id = c.list_id WHERE l.board_id = b.id) AS total,
      (SELECT COUNT(*) FROM cards c JOIN lists l ON l.id = c.list_id WHERE l.board_id = b.id AND c.done = 1) AS done,
      (SELECT COUNT(*) FROM cards c JOIN lists l ON l.id = c.list_id
         WHERE l.board_id = b.id AND c.done = 0 AND c.due_at IS NOT NULL AND c.due_at < ?) AS overdue
    FROM boards b ORDER BY b.sort, b.id`,
    [today]
  );
}

export async function getBoard(id: number): Promise<Board | null> {
  const db = await getDb();
  return db.getFirstAsync<Board>('SELECT * FROM boards WHERE id = ?', [id]);
}

export async function getBoardsWithLists(): Promise<BoardWithLists[]> {
  const db = await getDb();
  const boards = await db.getAllAsync<Board>('SELECT * FROM boards ORDER BY sort, id');
  const out: BoardWithLists[] = [];
  for (const b of boards) out.push({ ...b, lists: await getLists(b.id) });
  return out;
}

export type BoardInput = { name: string; description: string; color: string; icon: string };

export async function createBoard(input: BoardInput & { lists: TemplateList[] }): Promise<number> {
  const db = await getDb();
  const lists = normalizeLists(input.lists.length ? input.lists : DEFAULT_LISTS);
  let boardId = 0;
  await db.withTransactionAsync(async () => {
    const maxRow = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort) AS m FROM boards');
    const res = await db.runAsync('INSERT INTO boards (name, description, color, icon, sort) VALUES (?, ?, ?, ?, ?)', [
      input.name,
      input.description,
      input.color,
      input.icon,
      (maxRow?.m ?? -1) + 1,
    ]);
    boardId = res.lastInsertRowId;
    for (let i = 0; i < lists.length; i++) {
      await db.runAsync('INSERT INTO lists (board_id, name, sort, is_done) VALUES (?, ?, ?, ?)', [
        boardId,
        lists[i].name,
        i,
        lists[i].done ? 1 : 0,
      ]);
    }
  });
  return boardId;
}

export async function updateBoard(id: number, input: BoardInput): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE boards SET name = ?, description = ?, color = ?, icon = ? WHERE id = ?', [
    input.name,
    input.description,
    input.color,
    input.icon,
    id,
  ]);
}

export async function deleteBoard(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM boards WHERE id = ?', [id]);
}

/* ================= Listeler ================= */

export async function getLists(boardId: number): Promise<ListRow[]> {
  const db = await getDb();
  return db.getAllAsync<ListRow>('SELECT * FROM lists WHERE board_id = ? ORDER BY sort, id', [boardId]);
}

export async function getList(id: number): Promise<ListRow | null> {
  const db = await getDb();
  return db.getFirstAsync<ListRow>('SELECT * FROM lists WHERE id = ?', [id]);
}

async function writeListOrder(ids: number[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < ids.length; i++) {
    await db.runAsync('UPDATE lists SET sort = ? WHERE id = ?', [i, ids[i]]);
  }
}

/** Yeni liste tamamlanma listesinin önüne eklenir (yoksa sona) */
export async function addList(boardId: number, name: string): Promise<number> {
  const db = await getDb();
  const lists = await getLists(boardId);
  let newId = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync('INSERT INTO lists (board_id, name, sort, is_done) VALUES (?, ?, ?, 0)', [boardId, name, lists.length]);
    newId = res.lastInsertRowId;
    const ids = lists.map((l) => l.id);
    const doneIdx = lists.findIndex((l) => l.is_done);
    if (doneIdx >= 0) ids.splice(doneIdx, 0, newId);
    else ids.push(newId);
    await writeListOrder(ids);
  });
  return newId;
}

export async function renameList(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE lists SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteList(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM lists WHERE id = ?', [id]);
}

export async function moveList(listId: number, dir: -1 | 1): Promise<void> {
  const db = await getDb();
  const list = await getList(listId);
  if (!list) return;
  const lists = await getLists(list.board_id);
  const idx = lists.findIndex((l) => l.id === listId);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= lists.length) return;
  const ids = lists.map((l) => l.id);
  [ids[idx], ids[j]] = [ids[j], ids[idx]];
  await db.withTransactionAsync(async () => {
    await writeListOrder(ids);
  });
}

/** Bir listeyi panonun tamamlanma listesi yapar (null: hiçbiri). İçindeki kartlar tamamlanmış sayılır. */
export async function setDoneList(boardId: number, listId: number | null): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE lists SET is_done = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE board_id = ?', [listId ?? -1, boardId]);
    if (listId) {
      await db.runAsync('UPDATE cards SET done = 1, completed_at = COALESCE(completed_at, ?) WHERE list_id = ?', [now, listId]);
    }
  });
}

/* ================= Kartlar ================= */

const CARD_SELECT = `
  SELECT c.*, l.board_id AS board_id, l.name AS list_name, l.is_done AS list_is_done,
    b.name AS board_name, b.color AS board_color,
    (SELECT COUNT(*) FROM subtasks s WHERE s.card_id = c.id) AS sub_total,
    (SELECT COUNT(*) FROM subtasks s WHERE s.card_id = c.id AND s.done = 1) AS sub_done,
    (SELECT group_concat(t.name, '||') FROM card_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.card_id = c.id) AS tag_names
  FROM cards c
  JOIN lists l ON l.id = c.list_id
  JOIN boards b ON b.id = l.board_id
`;

type RawCard = Omit<CardView, 'tags'> & { tag_names: string | null };

function toView(r: RawCard): CardView {
  const { tag_names, ...rest } = r;
  return { ...rest, repeat: (rest.repeat || 'none') as Repeat, tags: tag_names ? tag_names.split('||') : [] };
}

export async function getCardsOfBoard(boardId: number): Promise<CardView[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawCard>(`${CARD_SELECT} WHERE l.board_id = ? ORDER BY c.sort, c.id`, [boardId]);
  return rows.map(toView);
}

export async function getAllCards(): Promise<CardView[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawCard>(`${CARD_SELECT} ORDER BY c.done, c.due_at IS NULL, c.due_at, c.id`);
  return rows.map(toView);
}

export async function getCard(id: number): Promise<{ card: CardView; subtasks: SubtaskRow[] } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RawCard>(`${CARD_SELECT} WHERE c.id = ?`, [id]);
  if (!row) return null;
  const subtasks = await db.getAllAsync<SubtaskRow>('SELECT * FROM subtasks WHERE card_id = ? ORDER BY sort, id', [id]);
  return { card: toView(row), subtasks };
}

export async function getAllTags(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(
    'SELECT name FROM tags WHERE id IN (SELECT tag_id FROM card_tags) ORDER BY name'
  );
  return rows.map((r) => r.name);
}

async function nextSort(listId: number): Promise<number> {
  const db = await getDb();
  const m = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort) AS m FROM cards WHERE list_id = ?', [listId]);
  return (m?.m ?? -1) + 1;
}

async function writeSubtasks(cardId: number, subtasks: { title: string; done: boolean }[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM subtasks WHERE card_id = ?', [cardId]);
  const clean = subtasks.filter((s) => s.title.trim());
  for (let i = 0; i < clean.length; i++) {
    await db.runAsync('INSERT INTO subtasks (card_id, title, done, sort) VALUES (?, ?, ?, ?)', [cardId, clean[i].title.trim(), clean[i].done ? 1 : 0, i]);
  }
}

async function writeTags(cardId: number, tags: string[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM card_tags WHERE card_id = ?', [cardId]);
  const seen = new Set<string>();
  for (const raw of tags) {
    const name = raw.trim();
    const key = name.toLocaleLowerCase('tr-TR');
    if (!name || seen.has(key)) continue;
    seen.add(key);
    await db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name]);
    const t = await db.getFirstAsync<{ id: number }>('SELECT id FROM tags WHERE name = ?', [name]);
    if (t) await db.runAsync('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)', [cardId, t.id]);
  }
}

export async function saveCard(input: SaveCardInput): Promise<number> {
  const db = await getDb();
  let cardId = input.id ?? 0;
  let becameDone = false;
  const target = await getList(input.list_id);
  const done = input.done || !!target?.is_done;
  const nowIso = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (input.id) {
      const prev = await db.getFirstAsync<{ list_id: number; sort: number; done: number }>(
        'SELECT list_id, sort, done FROM cards WHERE id = ?',
        [input.id]
      );
      let sort = prev?.sort ?? 0;
      if (prev && prev.list_id !== input.list_id) sort = await nextSort(input.list_id);
      becameDone = done && !prev?.done;
      await db.runAsync(
        `UPDATE cards SET list_id = ?, title = ?, description = ?, due_at = ?, due_has_time = ?, priority = ?,
           done = ?, repeat = ?, sort = ?,
           completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, ?) ELSE NULL END
         WHERE id = ?`,
        [
          input.list_id,
          input.title,
          input.description,
          input.due_at,
          input.due_has_time ? 1 : 0,
          input.priority,
          done ? 1 : 0,
          input.repeat,
          sort,
          done ? 1 : 0,
          nowIso,
          input.id,
        ]
      );
    } else {
      const sort = await nextSort(input.list_id);
      const res = await db.runAsync(
        `INSERT INTO cards (list_id, title, description, due_at, due_has_time, priority, done, repeat, sort, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.list_id,
          input.title,
          input.description,
          input.due_at,
          input.due_has_time ? 1 : 0,
          input.priority,
          done ? 1 : 0,
          input.repeat,
          sort,
          done ? nowIso : null,
          nowIso,
        ]
      );
      cardId = res.lastInsertRowId;
      becameDone = done;
    }
    await writeSubtasks(cardId, input.subtasks);
    await writeTags(cardId, input.tags);
  });

  if (becameDone) await spawnNext(cardId);
  return cardId;
}

/**
 * Tekrar eden bir görev tamamlanınca bir sonraki kopyasını oluşturur.
 * Seri yeni karttan devam eder; tamamlanan kartın tekrarı kapatılır (çift kopya olmasın).
 */
async function spawnNext(cardId: number): Promise<void> {
  const db = await getDb();
  const res = await getCard(cardId);
  if (!res) return;
  const { card, subtasks } = res;
  if (card.repeat === 'none' || !card.due_at) return;

  let next = addRepeat(new Date(card.due_at), card.repeat);
  const today = startOfDay(new Date());
  let guard = 0;
  while (next < today && guard++ < 1000) next = addRepeat(next, card.repeat);

  const lists = await getLists(card.board_id);
  let listId = card.list_id;
  if (card.list_is_done) {
    const open = lists.find((l) => !l.is_done);
    if (!open) return; // açık liste yoksa yeni kopya da tamamlanmış olurdu
    listId = open.id;
  }

  await db.runAsync("UPDATE cards SET repeat = 'none' WHERE id = ?", [cardId]);
  await saveCard({
    list_id: listId,
    title: card.title,
    description: card.description,
    due_at: next.toISOString(),
    due_has_time: !!card.due_has_time,
    priority: card.priority,
    done: false,
    repeat: card.repeat,
    tags: card.tags,
    subtasks: subtasks.map((s) => ({ title: s.title, done: false })),
  });
}

export async function deleteCard(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
}

export async function duplicateCard(id: number): Promise<number | null> {
  const res = await getCard(id);
  if (!res) return null;
  const { card, subtasks } = res;
  let listId = card.list_id;
  if (card.list_is_done) {
    const open = (await getLists(card.board_id)).find((l) => !l.is_done);
    if (open) listId = open.id;
  }
  return saveCard({
    list_id: listId,
    title: `${card.title} (kopya)`,
    description: card.description,
    due_at: card.due_at,
    due_has_time: !!card.due_has_time,
    priority: card.priority,
    done: false,
    repeat: card.repeat,
    tags: card.tags,
    subtasks: subtasks.map((s) => ({ title: s.title, done: false })),
  });
}

type CardPlace = { list_id: number; board_id: number; is_done: number; done: number };

async function getPlace(cardId: number): Promise<CardPlace | null> {
  const db = await getDb();
  return db.getFirstAsync<CardPlace>(
    `SELECT c.list_id AS list_id, l.board_id AS board_id, l.is_done AS is_done, c.done AS done
     FROM cards c JOIN lists l ON l.id = c.list_id WHERE c.id = ?`,
    [cardId]
  );
}

/**
 * Tamamlandı işareti. Panonun tamamlanma listesi varsa kart oraya taşınır;
 * işaret kaldırılınca ilk açık listeye geri döner.
 */
export async function setCardDone(cardId: number, done: boolean): Promise<void> {
  const db = await getDb();
  const place = await getPlace(cardId);
  if (!place) return;
  const lists = await getLists(place.board_id);
  let target = place.list_id;
  if (done) {
    const doneList = lists.find((l) => l.is_done);
    if (doneList) target = doneList.id;
  } else if (place.is_done) {
    const open = lists.find((l) => !l.is_done);
    if (open) target = open.id;
  }
  const now = new Date().toISOString();
  if (target !== place.list_id) {
    const sort = await nextSort(target);
    await db.runAsync('UPDATE cards SET done = ?, completed_at = ?, list_id = ?, sort = ? WHERE id = ?', [
      done ? 1 : 0,
      done ? now : null,
      target,
      sort,
      cardId,
    ]);
  } else {
    await db.runAsync('UPDATE cards SET done = ?, completed_at = ? WHERE id = ?', [done ? 1 : 0, done ? now : null, cardId]);
  }
  if (done && !place.done) await spawnNext(cardId);
}

export async function moveCardToList(cardId: number, listId: number): Promise<void> {
  const db = await getDb();
  const place = await getPlace(cardId);
  const target = await getList(listId);
  if (!place || !target || place.list_id === listId) return;
  let done = place.done;
  if (target.is_done) done = 1;
  else if (place.is_done) done = 0;
  const sort = await nextSort(listId);
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE cards SET list_id = ?, sort = ?, done = ?,
       completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, ?) ELSE NULL END
     WHERE id = ?`,
    [listId, sort, done, done, now, cardId]
  );
  if (done && !place.done) await spawnNext(cardId);
}

export async function reorderCards(orderedIds: number[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE cards SET sort = ? WHERE id = ?', [i, orderedIds[i]]);
    }
  });
}

/* ================= Bugün / Takvim ================= */

export type TodayData = {
  overdue: CardView[];
  today: CardView[];
  upcoming: CardView[];
  doneToday: CardView[];
};

export async function getToday(now: Date = new Date()): Promise<TodayData> {
  const db = await getDb();
  const start = startOfDay(now);
  const startIso = start.toISOString();
  const tomorrowIso = addDays(start, 1).toISOString();
  const endIso = addDays(start, 8).toISOString(); // önümüzdeki 7 gün

  const rows = await db.getAllAsync<RawCard>(
    `${CARD_SELECT} WHERE c.done = 0 AND c.due_at IS NOT NULL AND c.due_at < ? ORDER BY c.due_at, c.id`,
    [endIso]
  );
  const data: TodayData = { overdue: [], today: [], upcoming: [], doneToday: [] };
  for (const r of rows) {
    const v = toView(r);
    const due = v.due_at as string;
    if (due < startIso) data.overdue.push(v);
    else if (due < tomorrowIso) data.today.push(v);
    else data.upcoming.push(v);
  }
  const doneRows = await db.getAllAsync<RawCard>(
    `${CARD_SELECT} WHERE c.done = 1 AND c.completed_at IS NOT NULL AND c.completed_at >= ? ORDER BY c.completed_at DESC`,
    [startIso]
  );
  data.doneToday = doneRows.map(toView);
  return data;
}

export async function getCardsBetween(start: Date, end: Date): Promise<CardView[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawCard>(
    `${CARD_SELECT} WHERE c.due_at IS NOT NULL AND c.due_at >= ? AND c.due_at < ? ORDER BY c.done, c.due_at, c.id`,
    [start.toISOString(), end.toISOString()]
  );
  return rows.map(toView);
}

/** Bildirimler için: tamamlanmamış, tarihi olan tüm kartlar */
export async function getOpenCardsWithDue(): Promise<CardView[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawCard>(`${CARD_SELECT} WHERE c.done = 0 AND c.due_at IS NOT NULL ORDER BY c.due_at`);
  return rows.map(toView);
}

/* ================= Genel ================= */

export async function getCounts(): Promise<{ boards: number; cards: number; done: number }> {
  const db = await getDb();
  const b = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM boards');
  const c = await db.getFirstAsync<{ n: number; d: number | null }>('SELECT COUNT(*) AS n, SUM(done) AS d FROM cards');
  return { boards: b?.n ?? 0, cards: c?.n ?? 0, done: c?.d ?? 0 };
}

/** Panoları, kartları ve etiketleri siler. Şablonlar ve ayarlar kalır. */
export async function wipeAll(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM card_tags');
    await db.runAsync('DELETE FROM subtasks');
    await db.runAsync('DELETE FROM cards');
    await db.runAsync('DELETE FROM lists');
    await db.runAsync('DELETE FROM boards');
    await db.runAsync('DELETE FROM tags');
  });
}
