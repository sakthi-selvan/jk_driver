import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useAuthStore } from '../src/store/authStore';
import { Colors } from '../src/constants/theme';

export const unstable_settings = {
  initialRouteName: '(auth)/login',
};

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadDriver } = useAuthStore();

  useEffect(() => {
    loadDriver();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="rides-enhanced" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="ride-details" />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
