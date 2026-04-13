import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { searchProperties } from '@/services/search-api';
import type { PropertyResult, SearchResponse } from '@/services/search-api';

const BRAND = '#2d3a8c';
const ACCENT = '#f5e642';

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  return Math.max(
    0,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );
}

// ─── Property Card ─────────────────────────────────────────────────────────────

function PropertyCard({ item, nights }: { item: PropertyResult; nights: number }) {
  const pricePerNight = item.pricePerNight ?? item.totalPrice ?? null;
  const totalPrice = nights > 0 && pricePerNight != null ? pricePerNight * nights : null;

  return (
    <View style={cardStyles.card}>
      <Image
        source={item.thumbnail_url || 'https://via.placeholder.com/360x180'}
        style={cardStyles.image}
        contentFit="cover"
      />

      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.name} numberOfLines={2}>{item.property_name}</Text>
          {item.stars > 0 && (
            <View style={cardStyles.starsBox}>
              <Text style={cardStyles.starsText}>{'★'.repeat(item.stars)}</Text>
            </View>
          )}
        </View>

        <Text style={cardStyles.location} numberOfLines={1}>
          {[item.neighborhood, item.city, item.country].filter(Boolean).join(', ')}
        </Text>

        {item.review_count > 0 && (
          <Text style={cardStyles.rating}>
            {item.rating.toFixed(1)} ★  ({item.review_count} reseñas)
          </Text>
        )}

        <View style={cardStyles.footer}>
          <View>
            <Text style={cardStyles.roomType}>{item.room_type}</Text>
            <Text style={cardStyles.capacity}>Hasta {item.capacity} personas</Text>
          </View>
          {pricePerNight != null && (
            <View style={cardStyles.priceBox}>
              <Text style={cardStyles.pricePerNight}>${Math.round(pricePerNight)}<Text style={cardStyles.perNightLabel}>/noche</Text></Text>
              {totalPrice != null && nights > 0 && (
                <Text style={cardStyles.totalPrice}>${Math.round(totalPrice)} total ({nights}n)</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ city }: { city: string }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>🏨</Text>
      <Text style={emptyStyles.title}>Sin resultados</Text>
      <Text style={emptyStyles.subtitle}>
        No encontramos hospedajes disponibles en {city} con los criterios seleccionados.
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    city: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>();

  const city = params.city ?? '';
  const checkIn = params.checkIn ?? '';
  const checkOut = params.checkOut ?? '';
  const guests = parseInt(params.guests ?? '1', 10);

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const nights = nightsBetween(checkIn, checkOut);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        const res = await searchProperties({ city, checkIn, checkOut, guests, page: pageNum });
        setData(prev =>
          append && prev
            ? { ...res, results: [...prev.results, ...res.results] }
            : res,
        );
        setError(null);
      } catch {
        setError('No se pudieron cargar los resultados. Verifica tu conexión.');
      }
    },
    [city, checkIn, checkOut, guests],
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    loadPage(1, false).finally(() => setLoading(false));
  }, [loadPage]);

  function handleLoadMore() {
    if (!data || page >= data.meta.totalPages || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    loadPage(nextPage, true).finally(() => setLoadingMore(false));
  }

  // ── Search summary label ─────────────────────────────────────────────────────
  function buildSubtitle() {
    const parts: string[] = [];
    if (checkIn && checkOut) parts.push(`${formatDate(checkIn)} - ${formatDate(checkOut)}`);
    parts.push(`${guests} ${guests === 1 ? 'viajero' : 'viajeros'}`);
    return parts.join('  ·  ');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="btn-back">
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerCity} numberOfLines={1}>{city}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{buildSubtitle()}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Results count */}
      {!loading && data && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsCount}>
            {data.meta.total} {data.meta.total === 1 ? 'hospedaje' : 'hospedajes'} encontrados
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadingText}>Buscando hospedajes...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadPage(1, false).finally(() => setLoading(false)); }}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : data?.results.length === 0 ? (
        <EmptyState city={city} />
      ) : (
        <FlatList
          data={data?.results ?? []}
          keyExtractor={item => item.property_id}
          renderItem={({ item }) => <PropertyCard item={item} nights={nights} />}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={BRAND} style={{ marginVertical: 16 }} /> : null
          }
          testID="list-results"
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 22,
    color: BRAND,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerCity: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  resultsCount: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    padding: 16,
    gap: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 180,
  },
  body: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  starsBox: {},
  starsText: {
    fontSize: 12,
    color: '#f59e0b',
  },
  location: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  rating: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  roomType: {
    fontSize: 13,
    color: BRAND,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  capacity: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  pricePerNight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  perNightLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  totalPrice: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
