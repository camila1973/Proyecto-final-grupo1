import { View, StyleSheet } from 'react-native';
import type { ViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';

export function AppCard({ style, children, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});
