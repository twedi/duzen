// Renkler Figma ekran görüntülerinden tahmin edilmiştir (YAKLAŞIK).
// Gerçek hex kodlarını Figma Variables panelinden alıp burada değiştirmen yeterli.

export type PriorityKey = 'high' | 'medium' | 'low';

export type Colors = {
  background: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  danger: string;
  dangerContainer: string;
  onDangerContainer: string;
  overdue: string;
  priority: Record<PriorityKey, { bg: string; fg: string }>;
};

export type Theme = {
  dark: boolean;
  colors: Colors;
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F7F7FD',
    surface: '#FFFFFF',
    surfaceVariant: '#EEEDF7',
    border: '#E6E5F0',
    text: '#1C1B2E',
    textSecondary: '#6B6A80',
    primary: '#5548C8',
    onPrimary: '#FFFFFF',
    primaryContainer: '#ECE9FC',
    onPrimaryContainer: '#4A3FB0',
    danger: '#D93B48',
    dangerContainer: '#FDE8EA',
    onDangerContainer: '#C62F40',
    overdue: '#D93B48',
    priority: {
      high: { bg: '#FDE7EA', fg: '#C62F40' },
      medium: { bg: '#FEF0DB', fg: '#C77A0E' },
      low: { bg: '#DDF3E6', fg: '#23834F' },
    },
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#14131C',
    surface: '#22212D',
    surfaceVariant: '#2A2937',
    border: '#34334A',
    text: '#F2F1FA',
    textSecondary: '#A09FB5',
    primary: '#BDB2FF',
    onPrimary: '#1E1740',
    primaryContainer: '#3A3562',
    onPrimaryContainer: '#D9D3FF',
    danger: '#FF9AA4',
    dangerContainer: '#5A2B35',
    onDangerContainer: '#FFB3BB',
    overdue: '#FF8A96',
    priority: {
      high: { bg: '#4A2530', fg: '#FF8A96' },
      medium: { bg: '#4A3520', fg: '#F2B35C' },
      low: { bg: '#1F3D2E', fg: '#6FD39A' },
    },
  },
};

// Pano renkleri iki temada da aynı
// Hazır renkler (ayrıca renk spektrumundan istenen her renk seçilebilir)
export const BOARD_COLORS = [
  '#8579E8',
  '#B49AD8',
  '#D9976A',
  '#7DAE92',
  '#85A2B6',
  '#9A99A8',
  '#E5737F',
  '#EE8FC0',
  '#E9B949',
  '#4FB3A9',
  '#5B9BE6',
  '#A78B71',
];

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export type TextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyRegular'
  | 'small'
  | 'label'
  | 'caption'
  | 'overline';

export const textStyles: Record<
  TextVariant,
  { fontFamily: string; fontSize: number; lineHeight: number }
> = {
  display: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32 },
  title: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 27 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  bodyRegular: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
};
