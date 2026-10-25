import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getOpenCardsWithDue, getSettings } from './db/repo';
import { parseHm } from './dates';

const CHANNEL_ID = 'duzen-reminders';

// Bildirim modülünün çalışması için gereken yerel (native) parçalar.
// Expo Go'da bunlar yok; APK'da var. Elle açıp kapatmaya gerek kalmasın diye uygulama kendisi bakar.
const REQUIRED_NATIVE_MODULES = ['ExpoTopicSubscriptionModule'];

function nativeModulesAvailable(): boolean {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    return REQUIRED_NATIVE_MODULES.every((name) => !!requireOptionalNativeModule(name));
  } catch {
    return false;
  }
}

let cached: any = undefined;

function getNotifications(): any | null {
  if (cached !== undefined) return cached;
  // Expo Go'da (ya da modül eksikse) bildirimler sessizce kapalı kalır, uygulama çökmez
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !nativeModulesAvailable()) {
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
