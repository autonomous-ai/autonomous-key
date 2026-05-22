import React from 'react';
import { Platform, ViewStyle } from 'react-native';

type Props = {
  token: string;
  style?: ViewStyle;
};

declare const require: (id: string) => any;

let NativeView: React.ComponentType<Props> | null = null;
if (Platform.OS === 'ios') {
  try {
    const { requireNativeViewManager } = require('expo-modules-core');
    NativeView = requireNativeViewManager('InstalledApps');
  } catch {
    NativeView = null;
  }
}

/**
 * Renders the apps + categories in a FamilyActivitySelection using Apple's
 * SwiftUI `Label(token)`. Available only on iOS; on Android / web this
 * returns null (callers should provide an Android fallback).
 */
export function SelectionLabel({ token, style }: Props) {
  if (!NativeView) return null;
  return <NativeView token={token} style={style} />;
}

export const isSelectionLabelAvailable = NativeView !== null;
