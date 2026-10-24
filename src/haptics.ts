import * as Haptics from 'expo-haptics';

/** Küçük titreşim geri bildirimleri. Desteklenmeyen cihazda sessizce geçer. */
export function tap(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function success(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function impact(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
