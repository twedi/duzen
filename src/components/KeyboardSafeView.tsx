import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../useKeyboard';

/**
 * İçeriğin görünen alanını klavyenin üst kenarında bitirir.
 * İçindeki ScrollView'ın görünen bölgesi küçülür; böylece hiçbir alan klavyenin altına
 * kaydırılamaz ve Android odaklanan yazı alanını kendiliğinden görünür tutar.
 *
 * screenHasBottomInset: dış <Screen bottomInset> zaten alttaki gezinme çubuğu kadar boşluk
 * bırakıyorsa true (varsayılan); o kısım klavye boşluğundan düşülür.
 */
export function KeyboardSafeView({
  children,
  style,
  screenHasBottomInset = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  screenHasBottomInset?: boolean;
}) {
  const kb = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const pad = kb > 0 ? Math.max(0, kb - (screenHasBottomInset ? insets.bottom : 0)) : 0;
  return <View style={[{ flex: 1, paddingBottom: pad }, style]}>{children}</View>;
}
