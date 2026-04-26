import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  ActivityIndicator,
  Button,
  Chip,
  Text,
  useTheme,
} from 'react-native-paper';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hooks/useAuth';
import { useNetInfo } from '@/hooks/useNetInfo';
import { OfflineBanner } from '@/components/OfflineBanner';
import {
  getCachedReservations,
  syncReservations,
  type Reservation,
  type ReservationStatus,
} from '@/services/bookings-cache';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Status chip ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<ReservationStatus, string> = {
  confirmed:  '#16a34a',
  held:       '#d97706',
  submitted:  '#2563eb',
  cancelled:  '#6b7280',
  expired:    '#6b7280',
  failed:     '#dc2626',
};

function StatusChip({ status, t }: { status: ReservationStatus; t: (k: string) => string }) {
  const color = STATUS_COLOR[status] ?? '#6b7280';
  return (
    <Chip
      compact
      style={[styles.chip, { backgroundColor: color + '1a' }]}
      textStyle={[styles.chipText, { color }]}
    >
      {t(`bookings.status.${status}`)}
    </Chip>
  );
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(
    0,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
    ),
  );
}

// ─── Reservation card ──────────────────────────────────────────────────────────

interface CardProps {
  item: Reservation;
  onCancel: (id: string) => void;
  isOnline: boolean;
}

function ReservationCard({ item, onCancel, isOnline }: CardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const snap = item.snapshot;
  const nights = nightsBetween(item.checkIn, item.checkOut);
  const canCancel = isOnline && (item.status === 'confirmed' || item.status === 'held');

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {/* Thumbnail */}
      {snap?.propertyThumbnailUrl ? (
        <Image
          source={snap.propertyThumbnailUrl}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]} />
      )}

      {/* Content */}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitles}>
            <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
              {snap?.propertyName ?? '—'}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {snap?.propertyCity ?? ''}{snap?.propertyNeighborhood ? ` · ${snap.propertyNeighborhood}` : ''}
            </Text>
          </View>
          <StatusChip status={item.status} t={t} />
        </View>

        <Text variant="labelSmall" style={[styles.roomType, { color: theme.colors.onSurfaceVariant }]}>
          {snap?.roomType ?? ''}
        </Text>

        {/* Dates row */}
        <View style={styles.datesRow}>
          <View style={styles.dateBlock}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('bookings.checkIn')}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              {formatDate(item.checkIn)}
            </Text>
          </View>
          <Text style={{ color: theme.colors.outline }}>→</Text>
          <View style={styles.dateBlock}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('bookings.checkOut')}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              {formatDate(item.checkOut)}
            </Text>
          </View>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 'auto' }}>
            {t('bookings.nights', { count: nights })}
          </Text>
        </View>

        {/* Footer row */}
        <View style={styles.cardFooter}>
          {item.grandTotalUsd != null && (
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {t('bookings.total', { amount: item.grandTotalUsd.toFixed(2) })}
            </Text>
          )}
          {canCancel && (
            <Button
              mode="outlined"
              compact
              onPress={() => onCancel(item.id)}
              textColor={theme.colors.error}
              style={[styles.cancelBtn, { borderColor: theme.colors.error }]}
              labelStyle={{ fontSize: 12 }}
            >
              {t('bookings.cancel')}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Trips screen ──────────────────────────────────────────────────────────────

export default function TripsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { token, user } = useAuth();
  const { isConnected } = useNetInfo();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from cache immediately, then sync from API if online
  const loadData = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      setError(null);
      try {
        // Always show cache first for instant perceived performance
        const cached = await getCachedReservations();
        setReservations(cached);

        if (isConnected && token && user) {
          const fresh = await syncReservations(token, user.id);
          setReservations(fresh);
        }
      } catch {
        setError(t('bookings.errorLoad'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isConnected, token, user, t],
  );

  // Initial load
  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when tab comes into focus (covers post-login navigation)
  useFocusEffect(
    useCallback(() => {
      loadData({ silent: true });
    }, [loadData]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData({ silent: true });
  }, [loadData]);

  const handleCancel = useCallback(
    (id: string) => {
      Alert.alert(
        t('bookings.cancelTitle'),
        t('bookings.cancelMessage'),
        [
          { text: t('bookings.cancelAbort'), style: 'cancel' },
          {
            text: t('bookings.cancelConfirm'),
            style: 'destructive',
            onPress: async () => {
              try {
                await fetch(`${API_BASE}/api/booking/reservations/${id}/cancel`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ reason: 'user_cancelled' }),
                });
                // Re-sync after cancel
                await loadData({ silent: true });
              } catch {
                Alert.alert(t('bookings.errorLoad'));
              }
            },
          },
        ],
      );
    },
    [t, token, loadData],
  );

  // ─── Render states ────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (!user) {
      return (
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {t('bookings.signInPrompt')}
          </Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
          <Text variant="bodySmall" style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            {t('bookings.loading')}
          </Text>
        </View>
      );
    }

    if (error && reservations.length === 0) {
      return (
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={{ color: theme.colors.error, textAlign: 'center', paddingHorizontal: 32 }}>
            {error}
          </Text>
        </View>
      );
    }

    if (reservations.length === 0) {
      return (
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t('bookings.empty')}</Text>
          <Text variant="bodySmall" style={[styles.emptyDesc, { color: theme.colors.onSurfaceVariant }]}>
            {t('bookings.emptyDesc')}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={reservations}
        keyExtractor={r => r.id}
        renderItem={({ item }) => (
          <ReservationCard item={item} onCancel={handleCancel} isOnline={isConnected} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={[]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.outline }}>
        <Appbar.Content title={t('bookings.title')} titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <View style={styles.flex}>
        {renderContent()}
      </View>

      {/* Offline banner overlays the content from the top */}
      <OfflineBanner />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  appbarTitle: { fontWeight: '700', fontSize: 18 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12 },
  emptyDesc: { marginTop: 8, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32 },

  // Card
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  thumbnail: { width: '100%', height: 140 },
  thumbnailPlaceholder: {},
  cardBody: { padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitles: { flex: 1 },
  roomType: { marginTop: 4 },
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dateBlock: { gap: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  cancelBtn: { borderRadius: 8 },

  // Status chip
  chip: { alignSelf: 'flex-start' },
  chipText: { fontSize: 11, fontWeight: '700' },
});
