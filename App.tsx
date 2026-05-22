import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from '@/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MainTabs } from '@/navigation/MainTabs';
import { ModeEditorScreen } from '@/screens/ModeEditorScreen';
import { ModeDetailScreen } from '@/screens/ModeDetailScreen';
import { PairCubeScreen } from '@/screens/PairCubeScreen';
import { ScanScreen } from '@/screens/ScanScreen';
import { BlockPreviewScreen } from '@/screens/BlockPreviewScreen';
import type { RootStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function withBoundary<P extends object>(Comp: React.ComponentType<P>) {
  return function Wrapped(props: P) {
    return (
      <ErrorBoundary>
        <Comp {...props} />
      </ErrorBoundary>
    );
  };
}

const Tabs = withBoundary(MainTabs);
const ModeEditor = withBoundary(ModeEditorScreen);
const ModeDetail = withBoundary(ModeDetailScreen);
const PairCube = withBoundary(PairCubeScreen);
const Scan = withBoundary(ScanScreen);
const BlockPreview = withBoundary(BlockPreviewScreen);

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const pairedCube = useStore((s) => s.pairedCube);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: '#0F0F12' },
              headerTitleStyle: { color: '#FFFFFF', fontWeight: '600' },
              headerTintColor: '#FFFFFF',
              contentStyle: { backgroundColor: '#0F0F12' },
            }}
            initialRouteName={pairedCube ? 'MainTabs' : 'PairCube'}
          >
            <Stack.Screen name="MainTabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="ModeEditor" component={ModeEditor} options={{ title: 'Mode' }} />
            <Stack.Screen name="ModeDetail" component={ModeDetail} options={{ title: 'Mode' }} />
            <Stack.Screen name="PairCube" component={PairCube} options={{ title: 'Pair your cube' }} />
            <Stack.Screen name="Scan" component={Scan} options={{ title: 'Scan cube', presentation: 'modal' }} />
            <Stack.Screen
              name="BlockPreview"
              component={BlockPreview}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
