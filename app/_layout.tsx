import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  const { isAuthenticated, isInitializing, accessToken, accountStatus, loadDriver } = useAuthStore();

  useEffect(() => {
    loadDriver();
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (isAuthenticated) {
      router.replace('/');
      return;
    }
    // OTP verified but signup/approval still open — keep auth stack
    if (accessToken && (accountStatus === 'incomplete' || accountStatus === 'pending')) {
      return;
    }
    router.replace('/(auth)/login');
  }, [isAuthenticated, isInitializing, accessToken, accountStatus]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
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
        <Stack.Screen name="profile" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="help-center" />
        <Stack.Screen name="contact-support" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="rides-enhanced" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="ride-details" />
        <Stack.Screen name="ride-ui-preview" />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
