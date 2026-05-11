import { useEffect, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Text, List, Divider, useTheme } from 'react-native-paper';
import { AppCard } from '@/components/ui/app-card';
import { AppHeader } from '@/components/ui/app-header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  data?: Record<string, string>;
}

function toItem(n: Notifications.Notification, index: number): NotificationItem {
  const content = n.request.content;
  const receivedAt = new Date(n.date);
  const now = Date.now();
  const diffMs = now - receivedAt.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  const time =
    diffH < 1
      ? 'Hace menos de 1h'
      : diffH < 24
      ? `Hace ${diffH}h`
      : 'Ayer';
  return {
    id: String(index),
    title: content.title ?? '',
    body: content.body ?? '',
    time,
    data: (content.data as Record<string, string>) ?? undefined,
  };
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    Notifications.getPresentedNotificationsAsync()
      .then((presented) => setItems(presented.map(toItem)))
      .catch(() => setItems([]));
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#f8f9ff' }]} edges={['bottom']}>
      <AppHeader title={t('notifications.title')} showBack />

      <AppCard style={styles.card}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('notifications.empty')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <List.Item
                title={item.title}
                description={item.body}
                right={() => (
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.onSurfaceVariant, alignSelf: 'center' }}
                  >
                    {item.time}
                  </Text>
                )}
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
