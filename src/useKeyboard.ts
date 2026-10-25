import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, KeyboardEvent, Platform, ScrollView } from 'react-native';

/**
 * Klavyenin ekranın altından itibaren kapladığı yükseklik (kapalıyken 0).
 *
 * Neden gerekli: Expo'nun yeni sürümlerinde Android uygulaması ekranın tamamına çizilir
 * (edge-to-edge). Klavye açılınca ekran kendiliğinden küçülmez, klavye alttaki alanların
 * üstüne biner.
 *
 * Neden "height" değil: Android'in bildirdiği klavye yüksekliği birçok cihazda alttaki
 * gezinme çubuğunu içermiyor; o kadar alan yine klavyenin altında kalıyordu. Bunun yerine
 * klavyenin üst kenarının ekrandaki konumunu (screenY) ölçüp ekran yüksekliğinden çıkarıyoruz.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const measure = (e: KeyboardEvent) => {
      const screenH = Dimensions.get('screen').height;
      const reported = e.endCoordinates.height;
      const fromTop = e.endCoordinates.screenY > 0 ? screenH - e.endCoordinates.screenY : 0;
      // İkisinden büyüğü güvenli tarafta kalır; saçma büyük değerlere karşı sınırla
      const overlap = Math.min(Math.max(reported, fromTop), screenH * 0.75);
      setHeight(Math.max(0, Math.round(overlap)));
    };
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, measure);
    // Klavye yüksekliği değişebilir (öneri çubuğu açılıp kapanınca)
    const f = Keyboard.addListener('keyboardDidChangeFrame', (e) => {
      if (e.endCoordinates.height > 0) measure(e);
    });
    const h = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      s.remove();
      f.remove();
      h.remove();
    };
  }, []);
  return height;
}

/**
 * Kaydırılabilir formlarda, odaklanan alanı klavyenin üstünde görünür tutmak için yardımcı.
 * Kullanım: <ScrollView ref={ref}> ... <View onLayout={track('etiket')} /> ...
 *           <TextInput onFocus={() => reveal('etiket')} />
 */
export function useRevealOnFocus() {
  const ref = useRef<ScrollView>(null);
  const positions = useRef(new Map<string, number>());

  const track = (key: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    positions.current.set(key, e.nativeEvent.layout.y);
  };

  /** Klavye açıldıktan sonra alanı görünen bölgenin üst kısmına getirir */
  const reveal = (key: string, offset = 140) => {
    setTimeout(() => {
      const y = positions.current.get(key);
      if (y === undefined) return;
      ref.current?.scrollTo({ y: Math.max(0, y - offset), animated: true });
    }, 350);
  };

  const revealEnd = () => setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 350);

  return { ref, track, reveal, revealEnd, positions };
}
