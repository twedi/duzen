import { useCallback } from 'react';
import { Alert } from 'react-native';
import { CardView, deleteCard, getCard, restoreCard, setCardDone } from './db/repo';
import { useToast } from './components/Toast';
import { syncNotifications } from './notifications';
import { success, tap } from './haptics';

/**
 * Kart tamamlama ve silme işlemleri: titreşim, "Geri al" bildirimi ve bildirim
 * senkronu tek yerde. Bugün, Pano, Takvim ve Arama ekranları bunu kullanır.
 */
export function useTaskActions(reload: () => Promise<void> | void) {
  const toast = useToast();

  const toggle = useCallback(
    async (card: CardView) => {
      const next = !card.done;
      if (next) success();
      else tap();
      await setCardDone(card.id, next);
      await reload();
      syncNotifications();
      if (next) {
        toast.show({
          message: card.repeat !== 'none' ? 'Tamamlandı, bir sonraki tekrar eklendi' : 'Görev tamamlandı',
          icon: 'check-circle-outline',
          actionLabel: 'Geri al',
          onAction: async () => {
            await setCardDone(card.id, false);
            await reload();
            syncNotifications();
          },
        });
      }
    },
    [reload, toast]
  );

  const remove = useCallback(
    async (card: CardView, confirm = false) => {
      const doIt = async () => {
        const snap = await getCard(card.id);
        await deleteCard(card.id);
        await reload();
        syncNotifications();
        toast.show({
          message: 'Görev silindi',
          icon: 'trash-can-outline',
          actionLabel: 'Geri al',
          onAction: async () => {
            if (snap) await restoreCard(snap);
            await reload();
            syncNotifications();
          },
        });
      };
      if (!confirm) return doIt();
      Alert.alert('Kartı sil', `"${card.title}" silinecek.`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: doIt },
      ]);
    },
    [reload, toast]
  );

  return { toggle, remove };
}
