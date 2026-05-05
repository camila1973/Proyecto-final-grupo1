import { FlatList, View, StyleSheet } from 'react-native';
import { Text, List, Divider , useTheme } from 'react-native-paper';
import { AppCard } from '@/components/ui/app-card';
import { AppHeader } from '@/components/ui/app-header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Reserva confirmada', body: 'Tu reserva en Hotel Grand Palace ha sido confirmada.', time: 'Hace 2h' },
  { id: '2', title: 'Check-in mañana', body: 'Recuerda tu check-in mañana a las 3:00 PM.', time: 'Hace 5h' },
  { id: '3', title: 'Oferta especial', body: '20% de descuento en hoteles de Ciudad de México este fin de semana.', time: 'Ayer' },
];

export default function NotificationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={['bottom']}>
      <AppHeader title={t('notifications.title')} showBack />

      <AppCard style={styles.card}>
        {MOCK_NOTIFICATIONS.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('notifications.empty')}</Text>
          </View>
        ) : (
          <FlatList
            data={MOCK_NOTIFICATIONS}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <List.Item
                title={item.title}
                description={item.body}
                right={() => <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, alignSelf: 'center' }}>{item.time}</Text>}
                titleStyle={{ fontWeight: '600' }}
              />
            )}
          />
        )}
      </AppCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  card: { margin: 16, overflow: 'hidden', flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
