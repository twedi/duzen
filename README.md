# Düzen: çevrimdışı kişisel planlayıcı (Expo + React Native)

Bu klasör, boş bir Expo projesinin üzerine koyacağın **kaynak dosyalardır** (`app/` ve `src/`).
Paket sürümlerini senin bilgisayarında `expo install` seçsin diye `package.json` eklenmedi.

## Kurulum (WebStorm terminali)

```bash
# 1) Yeni proje (varsayılan şablon, expo-router dahil)
npx create-expo-app@latest duzen
cd duzen

# 2) Şablonun örnek ekranlarını sil
#    app/ klasörünün içini ve (varsa) components, hooks, constants klasörlerini boşalt
#    Windows PowerShell:  Remove-Item -Recurse -Force app, components, hooks, constants

# 3) Bu zip'teki "app" ve "src" klasörlerini proje köküne kopyala

# 4) Paketler
npx expo install expo-sqlite expo-notifications expo-file-system expo-sharing expo-document-picker \
  expo-font expo-splash-screen react-native-reanimated react-native-gesture-handler react-native-worklets \
  react-native-safe-area-context @react-native-community/datetimepicker @expo-google-fonts/inter @expo/vector-icons
npm install react-native-draggable-flatlist

# 5) Çalıştır
npx expo start -c
```

Telefonda Expo Go ile QR kodu okut (aynı Wi-Fi).

## Bilmen gerekenler

- Renkler Figma ekran görüntülerinden **tahmin edildi** → `src/theme.ts`. Gerçek hex kodlarını oraya yaz.
- Hata alırsan: `react-native-worklets` yoksa kaldır (eski Reanimated sürümlerinde gerekmez);
  `expo-file-system/legacy` bulunamazsa `src/…/settings.tsx` içinde `'expo-file-system'` olarak değiştir.
- `app.json` içine `"plugins": ["expo-router", "expo-sqlite"]` kalsın; `"userInterfaceStyle": "automatic"` yap.
- Kalıcı kurulum (Expo Go olmadan APK): `npm i -g eas-cli`, `eas login`, `eas build -p android --profile preview`
  (`eas.json` içinde preview profiline `"android": { "buildType": "apk" }` ekle).
- Bildirimleri gerçek APK'da test et; Expo Go'da kısıtlı olabilir.

## Dosya yapısı

```
app/
  _layout.tsx          kök: font, veritabanı, tema
  (tabs)/              Bugün, Panolar, Ayarlar + alt navigasyon
  board/new.tsx        yeni pano
  board/[id].tsx       pano detay (listeler, sürükle-sırala)
  card/[id].tsx        kart ekle/düzenle (id="new" → yeni)
src/
  theme.ts             renkler, yazı stilleri, boşluklar
  db/                  şema, sorgular, şablonlar, yedekleme
  notifications.ts     yerel bildirimler
  components/          Button, TaskCard, Chips, EmptyState …
```

## Henüz yapılmayanlar

- Kartı **listeler arası sürükleyip bırakma** (şimdilik kart düzenleme ekranından liste seçilir; aynı liste içinde sürükle-sırala çalışır).
- Takvim görünümü (Bugün ekranındaki takvim düğmesi "yakında" der).
