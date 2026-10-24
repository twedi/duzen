import React, { useRef } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../ThemeContext';
import { impact } from '../haptics';

type Props = {
  children: React.ReactNode;
  /** Sağa kaydırınca (ör. tamamla / geri al) */
  onSwipeRight?: () => void;
  rightLabel?: string;
  /** Sola kaydırınca (ör. sil) */
  onSwipeLeft?: () => void;
  leftLabel?: string;
};

const THRESHOLD = 0.32;

/**
 * Kartı yana kaydırarak hızlı işlem: sağa = tamamla, sola = sil.
 * Dikey kaydırmayla karışmasın diye yalnızca belirgin yatay harekette devreye girer.
 */
export function SwipeRow({ children, onSwipeRight, rightLabel = 'Tamamla', onSwipeLeft, leftLabel = 'Sil' }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const x = useRef(new Animated.Value(0)).current;
  const width = useRef(1);
  const passed = useRef(false);
  const p = useRef({ onSwipeRight, onSwipeLeft });
  p.current = { onSwipeRight, onSwipeLeft };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        passed.current = false;
      },
      onPanResponderMove: (_e, g) => {
        let dx = g.dx;
        if (dx > 0 && !p.current.onSwipeRight) dx *= 0.15;
        if (dx < 0 && !p.current.onSwipeLeft) dx *= 0.15;
        x.setValue(dx);
        const over = Math.abs(dx) > width.current * THRESHOLD;
        if (over !== passed.current) {
          passed.current = over;
          if (over) impact();
        }
      },
      onPanResponderRelease: (_e, g) => {
        const w = width.current;
        if (g.dx > w * THRESHOLD && p.current.onSwipeRight) {
          Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
          p.current.onSwipeRight();
        } else if (g.dx < -w * THRESHOLD && p.current.onSwipeLeft) {
          Animated.timing(x, { toValue: -w, duration: 160, useNativeDriver: false }).start(() => {
            p.current.onSwipeLeft?.();
            setTimeout(() => x.setValue(0), 400);
          });
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 8 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  const rightOpacity = x.interpolate({ inputRange: [0, 40, 120], outputRange: [0, 0.6, 1], extrapolate: 'clamp' });
  const leftOpacity = x.interpolate({ inputRange: [-120, -40, 0], outputRange: [1, 0.6, 0], extrapolate: 'clamp' });

  return (
    <View onLayout={(e) => (width.current = Math.max(1, e.nativeEvent.layout.width))}>
      {/* Arka plan: sağa kaydırınca yeşil, sola kaydırınca kırmızı */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16, overflow: 'hidden' }}>
        {onSwipeRight ? (
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              right: 0,
              backgroundColor: c.priority.low.bg,
              opacity: rightOpacity,
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 20,
              gap: 8,
            }}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={24} color={c.priority.low.fg} />
            <AppText variant="body" color={c.priority.low.fg}>
              {rightLabel}
            </AppText>
          </Animated.View>
        ) : null}
        {onSwipeLeft ? (
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              right: 0,
              backgroundColor: c.dangerContainer,
              opacity: leftOpacity,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 20,
              gap: 8,
            }}
          >
            <AppText variant="body" color="danger">
              {leftLabel}
            </AppText>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={c.danger} />
          </Animated.View>
        ) : null}
      </View>
      <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
