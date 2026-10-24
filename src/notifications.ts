import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getOpenCardsWithDue, getSettings } from './db/repo';
import { parseHm } from './dates';

const CHANNEL_ID = 'duzen-reminders';

// Expo Go bildirim modülünü içermiyor. Geliştirirken false kalsın;
// APK (gerçek build) üretmeden önce true yap.
const NOTIFICATIONS_ENABLED = true;

// expo-notifications, Expo Go'da (özellikle Android) her zaman yüklenemeyebiliyor.
// Bu yüzden import'u erteliyoruz; modül yoksa uygulama çökmez, bildirimler sadece kapalı kalır.
let cached: any = undefined;

function getNotifications(): any | null {
  if (cached !== undefined) return cached;
  if (!NOTIFICATIONS_ENABLED) {
    cached = null;
    return cached;
  }
  // Expo Go'da bu modülün yerel kısmı yok; yüklemeye çalışmak kırmızı hata ekranı çıkarır.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    cached = null;
    return cached;
  }
  try {
    const N = require('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = N;
  } catch (e) {
    console.warn('Bildirim modülü bu ortamda yüklenemedi (Expo Go olabilir):', e);
    cached = null;
  }
  return cached;
}

/**
 * Tüm planlı bildirimleri silip güncel veriye göre yeniden kurar.
 * Kart/ayar her değiştiğinde ve uygulama açılırken çağrılır.
 */
export async function syncNotifications(askPermission = false): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    const settings = await getSettings();

    let granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted && (askPermission || settings.remindersOn)) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Görev hatırlatıcıları',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { h, m } = parseHm(settings.checkTime);
    const now = Date.now();

    if (settings.remindersOn) {
      const cards = await getOpenCardsWithDue();
      for (const c of cards) {
        if (!c.due_at) continue;
        const date = new Date(c.due_at);
        if (!c.due_has_time) date.setHours(h, m, 0, 0); // saati yoksa günlük kontrol saatinde
        if (date.getTime() <= now) continue;
        await Notifications.scheduleNotificationAsync({
          content: { title: c.title, body: c.board_name + ' panosunda bir görevin zamanı geldi' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
        });
      }
    }

    if (settings.overdueOn) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Günlük kontrol', body: 'Bugünkü ve gecikmiş görevlerine göz atmak ister misin?' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: m,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch (e) {
    console.warn('Bildirimler kurulamadı:', e);
  }
}
