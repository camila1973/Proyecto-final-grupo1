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
import { AppCard } from '@/components/ui/app-card';

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

function PropertyCard({
  item,
  nights,
  onPress,
}: {
  item: PropertyResult;
  nights: number;
  onPress: () => void;
}) {
  const pricePerNight = item.priceUsd ?? item.basePriceUsd ?? null;
  const totalPrice = nights > 0 ? item.estimatedTotalUsd : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
    <AppCard style={cardStyles.card}>
      <Image
        source="https://cf.bstatic.com/xdata/images/hotel/max1024x768/484083124.jpg?k=f129efcf29b69ac37463eb551c3fd79e43e3a66a223194e917d3844c721ee338&o="
        style={cardStyles.image}
        contentFit="cover"
      />

      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.name} numberOfLines={2}>{item.property.name}</Text>
          {item.property.stars > 0 && (
            <View style={cardStyles.starsBox}>
              <Text style={cardStyles.starsText}>{'★'.repeat(item.property.stars)}</Text>
            </View>
          )}
        </View>

        <Text style={cardStyles.location} numberOfLines={1}>
          {[item.property.neighborhood, item.property.city, item.property.countryCode].filter(Boolean).join(', ')}
        </Text>

        {item.property.reviewCount > 0 && (
          <Text style={cardStyles.rating}>
            {item.property.rating.toFixed(1)} ★  ({item.property.reviewCount} reseñas)
          </Text>
        )}

        <View style={cardStyles.footer}>
          <View>
            <Text style={cardStyles.roomType}>{item.roomType}</Text>
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
    </AppCard>
    </TouchableOpacity>
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Results bar with back + city info */}
      <View style={styles.resultsBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="btn-back">
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.resultsCenter}>
          <Text style={styles.headerCity} numberOfLines={1}>{city}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{buildSubtitle()}</Text>
          {!loading && data && (
            <Text style={styles.resultsCount}>
              {data.meta.total} {data.meta.total === 1 ? 'hospedaje' : 'hospedajes'} encontrados
            </Text>
          )}
        </View>
      </View>

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
          keyExtractor={item => item.roomId}
          renderItem={({ item }) => (
            <PropertyCard
              item={item}
              nights={nights}
              onPress={() =>
                router.push({
                  pathname: '/property/[id]',
                  params: {
                    id: item.property.id,
                    checkIn,
                    checkOut,
                    guests,
                  },
                })
              }
            />
          )}
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
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backText: {
    fontSize: 22,
    color: BRAND,
  },
  resultsCenter: {
    flex: 1,
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
  resultsCount: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
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
    backgroundColor: '#f8f9ff',
    flexGrow: 1,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    overflow: 'hidden',
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
