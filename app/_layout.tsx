import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import { getDb } from '../src/db';
import { syncNotifications } from '../src/notifications';
import { ToastProvider } from '../src/components/Toast';

SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
        animationDuration: 260,
      }}
    >
      {/* Form ekranları alttan açılır, diğerleri sağdan kayar */}
      <Stack.Screen name="card/[id]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="board/new" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="templates/[id]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="focus/[id]" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="checklist/edit" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="search" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDb()
      .then(() => setDbReady(true))
      .catch((e) => console.warn('Veritabanı açılamadı', e));
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) {
      SplashScreen.hideAsync();
      syncNotifications(false);
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) return <View style={{ flex: 1 }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <Navigator />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
