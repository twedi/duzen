import { BOARD_COLORS } from '../theme';

export type TemplateList = { name: string; done: boolean };

export type TemplateSeed = {
  name: string;
  hint: string;
  icon: string;
  color: string;
  lists: TemplateList[];
};

/** Şablon hiç yoksa ya da seçilmezse kullanılan listeler */
export const DEFAULT_LISTS: TemplateList[] = [
  { name: 'Yapılacak', done: false },
  { name: 'Devam ediyor', done: false },
  { name: 'Tamamlandı', done: true },
];

/** İlk açılışta veritabanına yazılan şablonlar. Kullanıcı sonra hepsini düzenleyebilir/silebilir. */
export const DEFAULT_TEMPLATES: TemplateSeed[] = [
  { name: 'Boş', hint: 'Sıfırdan başla', icon: 'view-dashboard-outline', color: BOARD_COLORS[0], lists: DEFAULT_LISTS },
  {
    name: 'Okul',
    hint: 'Dersler ve projeler',
    icon: 'school-outline',
    color: BOARD_COLORS[2],
    lists: [
      { name: 'Yapılacak', done: false },
      { name: 'Devam ediyor', done: false },
      { name: 'Tamamlandı', done: true },
    ],
  },
  {
    name: 'Alışveriş',
    hint: 'İhtiyaçlarını listele',
    icon: 'shopping-outline',
    color: BOARD_COLORS[3],
    lists: [
      { name: 'Alınacak', done: false },
      { name: 'Alındı', done: true },
    ],
  },
  {
    name: 'Sınav haftası',
    hint: 'Planla, çalış, tekrar et',
    icon: 'notebook-edit-outline',
    color: BOARD_COLORS[1],
    lists: [
      { name: 'Planla', done: false },
      { name: 'Çalış', done: false },
      { name: 'Tekrar et', done: false },
      { name: 'Hazırım', done: true },
    ],
  },
  {
    name: 'Proje',
    hint: 'Fikirden teslime',
    icon: 'briefcase-outline',
    color: BOARD_COLORS[4],
    lists: [
      { name: 'Fikirler', done: false },
      { name: 'Yapılacak', done: false },
      { name: 'Devam ediyor', done: false },
      { name: 'Bitti', done: true },
    ],
  },
];

/** Pano ve şablonlar için seçilebilir simgeler (MaterialCommunityIcons) */
export const ICON_CHOICES = [
  'view-dashboard-outline',
  'school-outline',
  'shopping-outline',
  'notebook-edit-outline',
  'briefcase-outline',
  'home-outline',
  'heart-outline',
  'dumbbell',
  'book-open-variant',
  'airplane',
  'cash',
  'lightbulb-on-outline',
  'white-balance-sunny',
  'palette-outline',
  'code-tags',
  'music-note',
  'food-apple-outline',
  'gamepad-variant-outline',
];
