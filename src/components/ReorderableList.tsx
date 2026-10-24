import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder, PanResponderInstance, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { impact, tap } from '../haptics';

/**
 * Tutamaktan sürüklenerek sıralanabilen dikey liste.
 *
 * Neden kütüphane değil: react-native-draggable-flatlist bu React Native / Reanimated
 * sürümünde kartları üst üste bindirip kaybettiriyordu. Bu bileşen yalnızca React Native'in
 * kendi PanResponder ve Animated API'lerini kullanır.
 *
 * Çalışma mantığı:
 *  - Her öğenin konumu (y, yükseklik) onLayout ile kaydedilir.
 *  - Her öğenin TEK bir kalıcı translateY değeri vardır. Sürüklenen öğede bu değer parmağı izler,
 *    diğerlerinde yer açmak için kayar. (Önceki sürümde sürüklenen öğe bırakılınca başka bir
 *    animasyon değerine bağlanıyordu; bu geçişte eski konumda takılı kalıp "kayboluyordu".)
 *  - Bırakınca öğe yeni yuvasına oturur, sıra state'e yazılır, ardından tüm kaydırmalar sıfırlanır.
 *  - Parmak ekranın üst/alt kenarına yaklaşınca liste kendiliğinden kayar.
 */

type Props<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, opts: { dragHandle?: Record<string, any>; active: boolean }) => React.ReactElement;
  onReorder: (data: T[]) => void;
  /** false ise tutamak verilmez (ör. otomatik sıralama açıkken) */
  enabled: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  ListEmptyComponent?: React.ReactElement | null;
  ListHeaderComponent?: React.ReactElement | null;
  /** Öğeler arası boşluk */
  gap?: number;
};

type Layout = { y: number; h: number };

const EDGE = 80; // otomatik kaydırma bölgesi (px)

export function ReorderableList<T>(props: Props<T>) {
  const { data, renderItem, enabled, contentContainerStyle, ListEmptyComponent, ListHeaderComponent, gap = 10 } = props;
  const propsRef = useRef(props);
  propsRef.current = props;
  const keyOf = (item: T) => propsRef.current.keyExtractor(item);

  const [items, setItems] = useState<T[]>(data);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const dragging = useRef(false);
  const pendingReset = useRef(false);

  const layouts = useRef(new Map<string, Layout>()).current;
  const offsets = useRef(new Map<string, Animated.Value>()).current;
  const responders = useRef(new Map<string, PanResponderInstance>()).current;

  const containerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const contentH = useRef(0);
  const viewport = useRef({ top: 0, height: 0 });
  const drag = useRef({ key: '', index: -1, target: -1, startScroll: 0, dy: 0, fingerY: 0 });
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dışarıdan veri değişince (sürükleme yokken) eşitle
  useEffect(() => {
    if (!dragging.current) setItems(data);
  }, [data]);

  // Yeni sıra ekrana basıldıktan hemen sonra kaydırmaları sıfırla
  useLayoutEffect(() => {
    if (pendingReset.current) {
      pendingReset.current = false;
      offsets.forEach((v) => {
        v.stopAnimation();
        v.setValue(0);
      });
    }
  }, [items, offsets]);

  useEffect(
    () => () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    },
    []
  );

  const offsetOf = (key: string) => {
    let v = offsets.get(key);
    if (!v) {
      v = new Animated.Value(0);
      offsets.set(key, v);
    }
    return v;
  };

  const updatePosition = () => {
    const d = drag.current;
    const list = itemsRef.current;
    if (d.index < 0 || d.index >= list.length) return;
    const a = layouts.get(d.key);
    if (!a) return;
    const offset = d.dy + (scrollY.current - d.startScroll);
    offsetOf(d.key).setValue(offset);

    const center = a.y + a.h / 2 + offset;
    let t = 0;
    list.forEach((it, i) => {
      if (i === d.index) return;
      const l = layouts.get(keyOf(it));
      if (l && l.y + l.h / 2 < center) t++;
    });

    if (t !== d.target) {
      d.target = t;
      tap();
      list.forEach((it, i) => {
        if (i === d.index) return;
        let s = 0;
        if (d.index < t && i > d.index && i <= t) s = -a.h;
        else if (t < d.index && i >= t && i < d.index) s = a.h;
        Animated.timing(offsetOf(keyOf(it)), { toValue: s, duration: 150, useNativeDriver: false }).start();
      });
    }
  };

  const autoStep = () => {
    const d = drag.current;
    const vp = viewport.current;
    if (!vp.height) return;
    const rel = d.fingerY - vp.top;
    let speed = 0;
    if (rel < EDGE) speed = -Math.ceil((EDGE - rel) / 5);
    else if (rel > vp.height - EDGE) speed = Math.ceil((rel - (vp.height - EDGE)) / 5);
    if (!speed) return;
    const max = Math.max(0, contentH.current - vp.height);
    const next = Math.max(0, Math.min(max, scrollY.current + speed));
    if (next === scrollY.current) return;
    scrollY.current = next;
    scrollRef.current?.scrollTo({ y: next, animated: false });
    updatePosition();
  };

  const stopAuto = () => {
    if (autoTimer.current) {
      clearInterval(autoTimer.current);
      autoTimer.current = null;
    }
  };

  const finish = () => {
    if (!dragging.current) return;
    stopAuto();
    const d = drag.current;
    const list = itemsRef.current;
    const moved = d.target !== d.index && d.target >= 0;
    const own = offsetOf(d.key);

    if (!moved) {
      Animated.timing(own, { toValue: 0, duration: 140, useNativeDriver: false }).start(() => {
        dragging.current = false;
        setActiveKey(null);
        setScrollEnabled(true);
      });
      return;
    }

    // Sürüklenen öğeyi yeni yuvasına oturt, sonra sırayı yaz
    let slot = 0;
    if (d.target > d.index) {
      for (let i = d.index + 1; i <= d.target; i++) slot += layouts.get(keyOf(list[i]))?.h ?? 0;
    } else {
      for (let i = d.target; i < d.index; i++) slot -= layouts.get(keyOf(list[i]))?.h ?? 0;
    }
    Animated.timing(own, { toValue: slot, duration: 120, useNativeDriver: false }).start(() => {
      const next = [...list];
      const [it] = next.splice(d.index, 1);
      next.splice(d.target, 0, it);
      pendingReset.current = true;
      dragging.current = false;
      setItems(next);
      setActiveKey(null);
      setScrollEnabled(true);
      propsRef.current.onReorder(next);
    });
  };

  const responderFor = (key: string) => {
    let r = responders.get(key);
    if (r) return r;
    r = PanResponder.create({
      onStartShouldSetPanResponder: () => propsRef.current.enabled && !dragging.current,
      onMoveShouldSetPanResponder: () => propsRef.current.enabled && !dragging.current,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (_e, g) => {
        const index = itemsRef.current.findIndex((it) => keyOf(it) === key);
        if (index < 0) return;
        // Önceki animasyonlardan kalan değerleri temizle
        offsets.forEach((v) => {
          v.stopAnimation();
          v.setValue(0);
        });
        dragging.current = true;
        drag.current = { key, index, target: index, startScroll: scrollY.current, dy: 0, fingerY: g.y0 };
        setActiveKey(key);
        setScrollEnabled(false);
        impact();
        containerRef.current?.measureInWindow((_x, y, _w, h) => {
          viewport.current = { top: y, height: h };
        });
        stopAuto();
        autoTimer.current = setInterval(autoStep, 16);
      },
      onPanResponderMove: (_e, g) => {
        if (!dragging.current) return;
        drag.current.dy = g.dy;
        drag.current.fingerY = g.moveY;
        updatePosition();
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
    responders.set(key, r);
    return r;
  };

  return (
    <View ref={containerRef} style={{ flex: 1 }} collapsable={false}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={scrollEnabled}
        onScroll={(e) => {
          if (!dragging.current) scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, h) => {
          contentH.current = h;
        }}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {ListHeaderComponent ?? null}
        {items.length === 0 ? ListEmptyComponent ?? null : null}
        <View>
          {items.map((item) => {
            const key = keyOf(item);
            const active = key === activeKey;
            return (
              <Animated.View
                key={key}
                onLayout={(e) => {
                  const { y, height } = e.nativeEvent.layout;
                  layouts.set(key, { y, h: height });
                }}
                style={{
                  paddingBottom: gap,
                  zIndex: active ? 10 : 1,
                  elevation: active ? 12 : 0,
                  transform: [{ translateY: offsetOf(key) }],
                  opacity: activeKey && !active ? 0.92 : 1,
                }}
              >
                {renderItem(item, { dragHandle: enabled ? responderFor(key).panHandlers : undefined, active })}
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
