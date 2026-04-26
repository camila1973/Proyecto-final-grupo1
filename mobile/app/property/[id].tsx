import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { setCheckoutIntent } from '@/services/checkout-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const BRAND = '#2d3a8c';
const ACCENT = '#f5a524';
const BORDER = '#e5e7eb';

interface SearchRoom {
  roomId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  basePriceUsd: number;
  priceUsd: number | null;
  taxRatePct: number;
  partnerId: string;
  estimatedTotalUsd: number;
  hasFlatFees: boolean;
}

interface PropertyInfo {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  neighborhood: string | null;
  stars: number;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  imageUrls?: string[];
  description?: string;
  descriptionByLang?: Record<string, string>;
  amenities: string[];
}

interface PropertyRoomsResponse {
  property: PropertyInfo | null;
  rooms: SearchRoom[];
}

interface Review {
  id: string;
  reviewerName: string;
  reviewerCountry: string | null;
  rating: number;
  language: string;
  title: string | null;
  comment: string;
  createdAt: string;
}

interface ReviewsResponse {
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    averageRating: number;
  };
  reviews: Review[];
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  deluxe: 'Habitación Deluxe',
  suite: 'Suite',
  standard: 'Habitación Estándar',
  junior_suite: 'Junior Suite',
  penthouse: 'Penthouse',
};

const BED_TYPE_LABELS: Record<string, string> = {
  king: '1 cama king',
  queen: '1 cama queen',
  double: '1 cama doble',
  twin: '2 camas individuales',
};

const DESCRIPTION_PREVIEW = 260;

export default function PropertyDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id, checkIn: qIn, checkOut: qOut, guests: qGuests } =
    useLocalSearchParams<{
      id: string;
      checkIn?: string;
      checkOut?: string;
      guests?: string;
    }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [checkIn, setCheckIn] = useState<string>(qIn ?? '');
  const [checkOut, setCheckOut] = useState<string>(qOut ?? '');
  const [guests] = useState<number>(qGuests ? Math.max(1, Number(qGuests)) : 2);

  const [data, setData] = useState<PropertyRoomsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsMeta, setReviewsMeta] = useState<ReviewsResponse['meta'] | null>(
    null,
  );
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);

  const loadedOnce = useRef(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const isRefresh = loadedOnce.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (checkIn) params.set('checkIn', checkIn);
      if (checkOut) params.set('checkOut', checkOut);
      if (guests) params.set('guests', String(guests));
      params.set('lang', 'es');
      const res = await fetch(
        `${API_BASE}/api/search/properties/${id}/rooms?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as PropertyRoomsResponse;
      setData(json);
      loadedOnce.current = true;
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, checkIn, checkOut, guests]);

  const fetchReviews = useCallback(
    async (page: number) => {
      if (!id) return;
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await fetch(
          `${API_BASE}/api/search/properties/${id}/reviews?page=${page}&limit=5`,
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as ReviewsResponse;
        setReviewsMeta(json.meta);
        setReviews((prev) => (page === 1 ? json.reviews : [...prev, ...json.reviews]));
      } catch (e) {
        setReviewsError(String(e));
      } finally {
        setReviewsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    void fetchReviews(1);
  }, [fetchReviews]);

  const openMaps = () => {
    if (!data?.property) return;
    const q = encodeURIComponent(
      `${data.property.name} ${data.property.city} ${data.property.countryCode}`,
    );
    const url = Platform.select({
      ios: `maps:0,0?q=${q}`,
      android: `geo:0,0?q=${q}`,
      default: `https://www.google.com/maps/search/?api=1&query=${q}`,
    });
    if (url) void Linking.openURL(url);
  };

  const description = useMemo(() => {
    if (!data?.property) return '';
    if (data.property.description) return data.property.description;
    const map = data.property.descriptionByLang ?? {};
    return map.es ?? map.en ?? Object.values(map)[0] ?? '';
  }, [data]);

  const property = data?.property;
  const images =
    property?.imageUrls && property.imageUrls.length > 0
      ? property.imageUrls
      : property?.thumbnailUrl
        ? [property.thumbnailUrl]
        : [];

  const handleBook = useCallback(
    (room: SearchRoom) => {
      if (!checkIn || !checkOut) {
        Alert.alert(t('property.selectDatesTitle'), t('property.selectDatesMsg'));
        return;
      }
      if (!user) {
        router.push('/(tabs)/account');
        return;
      }
      if (!property) return;
      setCheckoutIntent({
        propertyId: property.id,
        propertyName: property.name,
        propertyCity: property.city,
        propertyThumbnailUrl: images[0] ?? property.thumbnailUrl ?? null,
        roomId: room.roomId,
        roomType: ROOM_TYPE_LABELS[room.roomType] ?? room.roomType,
        partnerId: room.partnerId,
        checkIn,
        checkOut,
        guests,
        estimatedTotalUsd: room.estimatedTotalUsd,
      });
      router.push('/booking/checkout');
    },
    [checkIn, checkOut, user, property, images, guests, router, t],
  );

  const showDescPreview = description.length > DESCRIPTION_PREVIEW && !descExpanded;
  const displayedDescription = showDescPreview
    ? description.slice(0, DESCRIPTION_PREVIEW).trimEnd() + '…'
    : description;

  if (loading) {
    return (
      <View style={[styles.center, isDark && styles.darkBg]}>
        <ActivityIndicator color={BRAND} />
        <Text style={[styles.mutedText, isDark && styles.textLight]}>
          Cargando hospedaje…
        </Text>
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={[styles.center, isDark && styles.darkBg]}>
        <Text style={[styles.errorText]}>
          No se pudieron cargar los detalles del hospedaje.
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => void fetchDetail()}
        >
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { rooms } = data!;

  return (
    <ScrollView
      style={[styles.container, isDark && styles.darkBg]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Volver"
        >
          <Text style={styles.backBtnText}>← TravelHub</Text>
        </TouchableOpacity>
        {refreshing ? (
          <ActivityIndicator size="small" color={BRAND} />
        ) : (
          <Text style={styles.liveBadge}>● Disponibilidad en vivo</Text>
        )}
      </View>

      <ImageCarousel images={images} />

      <View style={styles.body}>
        <Text style={[styles.title, isDark && styles.textLight]}>
          {property.name.toUpperCase()}
        </Text>
        <Text style={[styles.address, isDark && styles.textLight]}>
          {[property.neighborhood, property.city, property.countryCode]
            .filter(Boolean)
            .join(', ')}{' '}
          <Text style={styles.link} onPress={openMaps}>
            Ver en Mapas.
          </Text>
        </Text>

        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
          Acerca del hotel
        </Text>
        {description ? (
          <Text style={[styles.paragraph, isDark && styles.textLight]}>
            {displayedDescription}
            {description.length > DESCRIPTION_PREVIEW && (
              <Text
                style={styles.link}
                onPress={() => setDescExpanded((v) => !v)}
              >
                {' '}
                {descExpanded ? 'Leer menos' : 'Leer más'}
              </Text>
            )}
          </Text>
        ) : (
          <Text style={styles.mutedText}>Descripción no disponible.</Text>
        )}

        <Text style={[styles.roomsHeadline, isDark && styles.textLight]}>
          <Text style={styles.bold}>
            {rooms.length} {rooms.length === 1 ? 'habitación' : 'habitaciones'}
          </Text>{' '}
          disponibles encontradas
        </Text>

        <View style={styles.dateRow}>
          <DateField
            label="Check - In"
            value={checkIn}
            placeholder="Selecciona"
            onChangeText={setCheckIn}
          />
          <DateField
            label="Check - Out"
            value={checkOut}
            placeholder="Selecciona"
            onChangeText={setCheckOut}
          />
        </View>

        <View style={styles.roomsGrid}>
          {rooms.length === 0 ? (
            <Text style={styles.mutedText}>
              No hay habitaciones disponibles para estas fechas.
            </Text>
          ) : (
            rooms.map((room) => (
              <RoomCard
                key={room.roomId}
                room={room}
                heroImage={images[0] ?? property.thumbnailUrl}
                property={property}
                onBook={handleBook}
              />
            ))
          )}
        </View>

        <ReviewsBlock
          reviews={reviews}
          meta={reviewsMeta}
          loading={reviewsLoading}
          error={reviewsError}
          fallbackRating={property.rating}
          fallbackCount={property.reviewCount}
          onLoadMore={() => {
            const next = reviewPage + 1;
            setReviewPage(next);
            void fetchReviews(next);
          }}
        />
      </View>
    </ScrollView>
  );
}

function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const width = Dimensions.get('window').width;

  if (images.length === 0) {
    return (
      <View style={[styles.carouselEmpty, { width }]}>
        <Text style={styles.mutedText}>Sin imágenes</Text>
      </View>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={images}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        renderItem={({ item, index: i }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height: width * 0.6 }}
            resizeMode="cover"
            // RN does not honour loading="lazy"; ranges are loaded as the user
            // scrolls which keeps initial paint fast.
            fadeDuration={150}
            accessibilityLabel={`Imagen ${i + 1} de ${images.length}`}
          />
        )}
        onScroll={onScroll}
        scrollEventThrottle={32}
      />
      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function DateField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
}) {
  // Tap-to-cycle prompt; full date picker is intentionally left to the
  // native platform dialog in a follow-up integration.
  return (
    <Pressable
      style={styles.dateCard}
      onPress={() => {
        // Minimal fallback: focus via TextInput behaviour not needed for
        // the mockup; parent owns state and sync with query string.
        onChangeText(value);
      }}
    >
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{value || placeholder}</Text>
    </Pressable>
  );
}

function RoomCard({
  room,
  heroImage,
  property,
  onBook,
}: {
  room: SearchRoom;
  heroImage: string | null;
  property: PropertyInfo;
  onBook: (room: SearchRoom) => void;
}) {
  const roomLabel = ROOM_TYPE_LABELS[room.roomType] ?? room.roomType;
  const bedLabel = BED_TYPE_LABELS[room.bedType] ?? room.bedType;
  const price = room.priceUsd ?? room.basePriceUsd;
  return (
    <View style={styles.roomCard}>
      {heroImage ? (
        <Image source={{ uri: heroImage }} style={styles.roomImage} />
      ) : (
        <View style={[styles.roomImage, styles.carouselEmpty]} />
      )}
      <View style={styles.roomCardBody}>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingStar}>★</Text>
          <Text style={styles.ratingValue}>{property.rating.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({property.reviewCount})</Text>
        </View>
        <Text style={styles.roomName}>{roomLabel}</Text>
        <Text style={styles.roomMeta}>Capacidad {room.capacity} huéspedes</Text>
        <Text style={styles.roomMeta}>{bedLabel}</Text>
        <Text style={styles.roomPrice}>
          ${price.toFixed(0)}{' '}
          <Text style={styles.roomPriceSuffix}>Por noche</Text>
        </Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => onBook(room)}>
          <Text style={styles.selectBtnText}>Seleccionar habitación</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReviewsBlock({
  reviews,
  meta,
  loading,
  error,
  fallbackRating,
  fallbackCount,
  onLoadMore,
}: {
  reviews: Review[];
  meta: ReviewsResponse['meta'] | null;
  loading: boolean;
  error: string | null;
  fallbackRating: number;
  fallbackCount: number;
  onLoadMore: () => void;
}) {
  const avg = meta?.averageRating ?? fallbackRating;
  const total = meta?.total ?? fallbackCount;
  const hasMore = meta ? meta.page < meta.totalPages : false;

  return (
    <View style={styles.reviewsBlock}>
      <View style={styles.reviewsHeader}>
        <Text style={styles.sectionTitle}>Reseñas</Text>
        <Text style={styles.reviewsSummary}>
          ★ {avg.toFixed(1)} · {total} reseña{total === 1 ? '' : 's'}
        </Text>
      </View>

      {reviews.length === 0 && !loading && !error && (
        <Text style={styles.mutedText}>
          Aún no hay reseñas para esta propiedad.
        </Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {reviews.map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <Text style={styles.reviewerName}>
            {r.reviewerName}
            {r.reviewerCountry ? ` · ${r.reviewerCountry}` : ''}
          </Text>
          {r.title ? <Text style={styles.reviewTitle}>{r.title}</Text> : null}
          <Text style={styles.reviewRating}>
            {'★'.repeat(r.rating)}
            {'☆'.repeat(5 - r.rating)}
          </Text>
          <Text style={styles.reviewComment}>{r.comment}</Text>
        </View>
      ))}

      {hasMore && (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          disabled={loading}
          onPress={onLoadMore}
        >
          <Text style={styles.loadMoreText}>
            {loading ? 'Cargando…' : 'Cargar más reseñas'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  darkBg: { backgroundColor: '#111' },
  scrollContent: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  mutedText: { color: '#6b7280', fontSize: 14 },
  textLight: { color: '#f3f4f6' },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: BRAND,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eef0f8',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  backBtnText: { color: BRAND, fontWeight: '600', fontSize: 16 },
  liveBadge: { color: '#16a34a', fontSize: 11, fontWeight: '600' },

  carouselEmpty: {
    height: 220,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },

  body: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  address: { color: '#64748b', fontSize: 13 },
  link: { color: BRAND, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 12 },
  paragraph: { color: '#334155', fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '700', color: '#0f172a' },
  roomsHeadline: { color: '#334155', fontSize: 14, marginTop: 8 },

  dateRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  dateCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#eef0f8',
    borderRadius: 10,
    padding: 10,
    minHeight: 56,
  },
  dateLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  dateValue: { color: '#0f172a', fontSize: 14, marginTop: 2 },

  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  roomCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
  },
  roomImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#eee',
  },
  roomCardBody: { padding: 10, gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStar: { color: ACCENT, fontSize: 14 },
  ratingValue: { fontSize: 12, fontWeight: '600' },
  ratingCount: { color: '#6b7280', fontSize: 12 },
  roomName: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  roomMeta: { color: '#64748b', fontSize: 12 },
  roomPrice: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  roomPriceSuffix: { fontSize: 12, fontWeight: '400', color: '#64748b' },
  selectBtn: {
    marginTop: 6,
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  selectBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  reviewsBlock: { marginTop: 20 },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewsSummary: { color: '#0f172a', fontSize: 13, fontWeight: '600' },
  reviewCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
  },
  reviewerName: { fontWeight: '700', color: '#0f172a', fontSize: 13 },
  reviewTitle: { fontWeight: '600', color: '#0f172a', fontSize: 13, marginTop: 2 },
  reviewRating: { color: ACCENT, marginTop: 2 },
  reviewComment: { color: '#334155', fontSize: 13, lineHeight: 18, marginTop: 4 },
  loadMoreBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND,
  },
  loadMoreText: { color: BRAND, fontWeight: '600' },
});