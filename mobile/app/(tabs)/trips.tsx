import { View, StyleSheet } from 'react-native';
import { Text, Appbar , useTheme } from 'react-native-paper';
import { AppCard } from '@/components/ui/app-card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function TripsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={[]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <Appbar.Content title={t('bookings.title')} />
      </Appbar.Header>
      <View style={styles.outer}>
        <AppCard style={styles.card}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('bookings.empty')}
          </Text>
          <Text variant="bodyMedium" style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
            {t('bookings.emptyDesc')}
          </Text>
        </AppCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  outer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { padding: 32, alignItems: 'center', width: '100%' },
  sub: { marginTop: 8, textAlign: 'center' },
});
