import React, { useEffect } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Ortak animasyon parçaları (react-native-reanimated).
 * Tüm ekranlar aynı süre ve yay ayarlarını kullansın diye burada toplandı.
 */

export const SPRING = { damping: 18, stiffness: 220, mass: 0.8 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Basılınca hafifçe küçülen dokunma alanı (stil doğrudan bu öğeye uygulanır: flex, margin vb. çalışır) */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  ...rest
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number; children?: React.ReactNode }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, SPRING);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        rest.onPressOut?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Liste öğesi: ilk görünüşte aşağıdan yumuşakça gelir (sıralı gecikmeyle),
 * kaldırılınca söner, diğer öğeler yeni yerlerine kayarak geçer.
 */
export function ListItem({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}
      exiting={FadeOut.duration(180)}
      layout={LinearTransition.springify().damping(20).stiffness(180)}
    >
      {children}
    </Animated.View>
  );
}

/** Ekran bölümlerinin girişte yumuşakça belirmesi */
export function FadeInUp({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View style={style} entering={FadeInDown.duration(380).delay(delay)}>
      {children}
    </Animated.View>
  );
}

/** Yavaşça yukarı aşağı süzülme (boş durum simgeleri) */
export function Floating({ children, distance = 6, style }: { children: React.ReactNode; distance?: number; style?: StyleProp<ViewStyle> }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(-distance, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [distance, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Değer değişince küçük bir "zıplama" (sayaçlar, onay işaretleri) */
export function usePop(trigger: unknown) {
  const s = useSharedValue(1);
  const first = React.useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    s.value = withSequence(withTiming(0.82, { duration: 80 }), withSpring(1.12, SPRING), withSpring(1, SPRING));
  }, [trigger, s]);
  return useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
}
