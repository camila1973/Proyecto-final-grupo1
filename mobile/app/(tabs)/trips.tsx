import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Chip,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppHeader } from '@/components/ui/app-header';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAuth } from '@/hooks/useAuth';
import { useNetInfo } from '@/hooks/useNetInfo';
import { OfflineBanner } from '@/components/OfflineBanner';
import {
  getCachedReservations,
  syncReservations,
  type Reservation,
  type ReservationStatus,
} from '@/services/bookings-cache';
import { rebuildIntent, setCheckoutIntent } from '@/services/checkout-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Status chip ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<ReservationStatus, string> = {
  confirmed:  '#16a34a',
  held:       '#d97706',
  submitted:  '#2563eb',
  checked_in: '#0369a1',
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
  const [y, m, d] = iso.slice(0, 10).split('-');
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

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(expiresAt: string | null): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(`${m}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return label;
}

// ─── Held Banner ──────────────────────────────────────────────────────────────

interface HeldBannerProps {
  reservation: Reservation;
  onCompletePayment: (item: Reservation) => void;
  theme: any; // MD3 theme from react-native-paper
}

function HeldBanner({ reservation, onCompletePayment, theme }: HeldBannerProps) {
  const { t } = useTranslation();
  const countdown = useCountdown(reservation.holdExpiresAt);
  const propertyName = reservation.snapshot?.propertyName ?? t('bookings.property');

  return (
    <View style={[styles.heldBanner, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
      <View style={styles.heldBannerIcon}>
        <MaterialIcons name="schedule" size={24} color="#d97706" />
      </View>
      <View style={styles.heldBannerContent}>
        <Text variant="titleSmall" style={{ color: '#78350f', fontWeight: '700' }}>
          {t('bookings.heldBanner.title')}
        </Text>
        <Text variant="bodySmall" style={{ color: '#78350f', marginTop: 2 }}>
          {t('bookings.heldBanner.subtitle', { propertyName })}
        </Text>
        {countdown && (
          <Text variant="labelSmall" style={{ color: '#d97706', marginTop: 4, fontWeight: '600' }}>
            {t('bookings.heldBanner.expires', { time: countdown })}
          </Text>
        )}
      </View>
      <Button
        mode="contained"
        compact
        onPress={() => onCompletePayment(reservation)}
        buttonColor={theme.colors.secondary}
        style={styles.heldBannerBtn}
        labelStyle={{ fontSize: 13, fontWeight: '700' }}
      >
        {t('bookings.completePayment')}
      </Button>
    </View>
  );
}

// ─── Reservation card ──────────────────────────────────────────────────────────

interface CardProps {
  item: Reservation;
  onCancel: (id: string) => void;
  onCompletePayment: (item: Reservation) => void;
  onCheckin: (id: string) => void;
  isOnline: boolean;
}

function ReservationCard({ item, onCancel, onCompletePayment, onCheckin, isOnline }: CardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const snap = item.snapshot;
  const nights = nightsBetween(item.checkIn, item.checkOut);
  const canCancel = isOnline && (item.status === 'confirmed' || item.status === 'held');
  const isHeld = item.status === 'held';
  const today = new Date().toISOString().slice(0, 10);
  const canCheckin = isOnline && item.status === 'confirmed' && today >= item.checkIn.slice(0, 10) && today < item.checkOut.slice(0, 10);

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
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('bookings.checkInTime')}
            </Text>
          </View>
          <Text style={{ color: theme.colors.outline }}>→</Text>
          <View style={styles.dateBlock}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('bookings.checkOut')}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              {formatDate(item.checkOut)}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('bookings.checkOutTime')}
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
          {isHeld && isOnline ? (
            <Button
              mode="contained"
              compact
              onPress={() => onCompletePayment(item)}
              buttonColor={theme.colors.secondary}
              style={styles.completeBtn}
              labelStyle={{ fontSize: 12 }}
            >
              {t('bookings.completePayment')}
            </Button>
          ) : canCheckin ? (
            <Button
              mode="contained"
              compact
              onPress={() => onCheckin(item.id)}
              style={styles.completeBtn}
              labelStyle={{ fontSize: 12 }}
            >
              {t('bookings.checkinBtn')}
            </Button>
          ) : canCancel ? (
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
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ─── Trips screen ──────────────────────────────────────────────────────────────

export default function TripsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
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

  const handleCheckin = useCallback(
    (id: string) => {
      router.push(`/booking/${id}/check-in`);
    },
    [router],
  );

  /**
   * Permite al usuario retomar el flujo de checkout para completar el pago
   * de una reserva "held" o reintentar una reserva "failed".
   */
  const handleCompletePayment = useCallback(
    (reservation: Reservation) => {
      const intent = rebuildIntent(reservation);
      
      if (!intent) {
        Alert.alert(
          t('bookings.errorTitle'),
          t('bookings.errorRebuildIntent'),
        );
        return;
      }

      setCheckoutIntent(intent);
      router.push('/booking/checkout');
    },
    [router, t],
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

    // Buscar la primera reserva "held" para mostrar el banner
    const heldReservation = reservations.find(r => r.status === 'held');

    // Separar reservas en activas y pasadas
    const ACTIVE_STATUSES: ReservationStatus[] = ['held', 'submitted', 'confirmed'];
    const PAST_STATUSES: ReservationStatus[] = ['cancelled', 'expired', 'failed'];
    
    const activeReservations = reservations.filter(r => ACTIVE_STATUSES.includes(r.status));
    const pastReservations = reservations.filter(r => PAST_STATUSES.includes(r.status));

    // Crear secciones solo si existen reservas en cada categoría
    const sections = [
      ...(activeReservations.length > 0 ? [{ title: t('bookings.sections.active'), data: activeReservations }] : []),
      ...(pastReservations.length > 0 ? [{ title: t('bookings.sections.past'), data: pastReservations }] : []),
    ];

    return (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          heldReservation ? (
            <HeldBanner 
              reservation={heldReservation} 
              onCompletePayment={handleCompletePayment}
              theme={theme}
            />
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ReservationCard
            item={item}
            onCancel={handleCancel}
            onCompletePayment={handleCompletePayment}
            onCheckin={handleCheckin}
            isOnline={isConnected}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 20 }} />}
        stickySectionHeadersEnabled={false}
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
      <AppHeader title={t('bookings.title')} />

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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12 },
  emptyDesc: { marginTop: 8, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

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
  completeBtn: { borderRadius: 8 },

  // Status chip
  chip: { alignSelf: 'flex-start' },
  chipText: { fontSize: 11, fontWeight: '700' },

  // Held banner
  heldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  heldBannerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heldBannerContent: {
    flex: 1,
  },
  heldBannerBtn: {
    borderRadius: 8,
  },
});
