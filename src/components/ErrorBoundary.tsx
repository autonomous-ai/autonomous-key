import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something broke</Text>
        <Text style={styles.message}>{this.state.error.message}</Text>
        <ScrollView style={styles.stackBox} contentContainerStyle={styles.stackInner}>
          <Text style={styles.stack}>{this.state.error.stack ?? '(no stack)'}</Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    paddingTop: 64,
  },
  title: { color: colors.danger, fontSize: 22, fontWeight: '700', marginBottom: spacing.md },
  message: { color: colors.text, fontSize: 16, marginBottom: spacing.lg, lineHeight: 22 },
  stackBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  stackInner: { padding: spacing.md },
  stack: { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
});
