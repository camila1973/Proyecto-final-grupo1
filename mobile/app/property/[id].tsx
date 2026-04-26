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
  RefreshControl,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import {
  Portal,
  Modal as PaperModal,
  Button,
  Divider,
  useTheme,
} from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { setCheckoutIntent } from '@/services/checkout-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const BRAND = '#2d3a8c';
const ACCENT = '#f5a524';
const BORDER = '#e5e7eb';

// ─── Date helpers ──────────────────────────────────────────────────────────────

function toIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, day] = iso.split('-');
  return `${day}/${m}/${y}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}

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

// ─── Skeleton Loading Component ────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ width: '100%', height: 240, backgroundColor: '#e5e7eb' }} />
      <View style={{ padding: 16, gap: 12 }}>
        {/* Title skeleton */}
        <View style={{ height: 28, backgroundColor: '#e5e7eb', borderRadius: 6, width: '80%' }} />
        <View style={{ height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, width: '60%', marginTop: 4 }} />
        
        {/* Description skeleton */}
        <View style={{ marginTop: 16, gap: 8 }}>
          <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 4 }} />
          <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 4 }} />
          <View style={{ height: 14, backgroundColor: '#e5e7eb', borderRadius: 4, width: '70%' }} />
        </View>
        
        {/* Date cards skeleton */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <View style={{ flex: 1, height: 64, backgroundColor: '#e5e7eb', borderRadius: 12 }} />
          <View style={{ flex: 1, height: 64, backgroundColor: '#e5e7eb', borderRadius: 12 }} />
        </View>
        
        {/* Room cards skeleton */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {[1, 2].map((i) => (
            <View key={i} style={{ width: '47%', borderRadius: 12, overflow: 'hidden' }}>
              <View style={{ height: 110, backgroundColor: '#e5e7eb' }} />
              <View style={{ padding: 12, gap: 8 }}>
                <View style={{ height: 12, backgroundColor: '#e5e7eb', borderRadius: 4, width: '60%' }} />
                <View style={{ height: 16, backgroundColor: '#e5e7eb', borderRadius: 4, width: '80%' }} />
                <View style={{ height: 12, backgroundColor: '#e5e7eb', borderRadius: 4, width: '50%' }} />
                <View style={{ height: 36, backgroundColor: '#e5e7eb', borderRadius: 8, marginTop: 4 }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Date Picker Modal ─────────────────────────────────────────────────────────

interface DatePickerModalProps {
  visible: boolean;
  checkIn: string;
  checkOut: string;
  onConfirm: (checkIn: string, checkOut: string) => void;
  onCancel: () => void;
}

function DatePickerModal({ visible, checkIn, checkOut, onConfirm, onCancel }: DatePickerModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [localIn, setLocalIn] = useState(checkIn);
  const [localOut, setLocalOut] = useState(checkOut);
  const [selecting, setSelecting] = useState<'in' | 'out'>('in');
  const today = toIso(new Date());

  useEffect(() => {
    setLocalIn(checkIn);
    setLocalOut(checkOut);
    setSelecting('in');
  }, [visible, checkIn, checkOut]);

  function handleDayPress(day: { dateString: string }) {
    const iso = day.dateString;
    if (selecting === 'in') {
      setLocalIn(iso);
      if (!localOut || localOut <= iso) setLocalOut(addDays(iso, 1));
      setSelecting('out');
    } else {
      setLocalOut(iso <= localIn ? addDays(localIn, 1) : iso);
      setSelecting('in');
    }
  }

  const markedDates = useMemo(() => {
    if (!localIn) return {};
    const marks: Record<string, { startingDay?: boolean; endingDay?: boolean; color: string; textColor: string }> = {};
    const primary = theme.colors.primary;
    const light = theme.colors.primaryContainer;
    const onPrimary = theme.colors.onPrimary;
    const onLight = theme.colors.onPrimaryContainer;

    if (!localOut || localIn === localOut) {
      marks[localIn] = { startingDay: true, endingDay: true, color: primary, textColor: onPrimary };
      return marks;
    }

    let cursor = localIn;
    while (cursor <= localOut) {
      const isStart = cursor === localIn;
      const isEnd = cursor === localOut;
      marks[cursor] = {
        ...(isStart && { startingDay: true }),
        ...(isEnd && { endingDay: true }),
        color: isStart || isEnd ? primary : light,
        textColor: isStart || isEnd ? onPrimary : onLight,
      };
      cursor = addDays(cursor, 1);
    }
    return marks;
  }, [localIn, localOut, theme]);

  const nights = localIn && localOut
    ? Math.max(0, Math.round((new Date(localOut + 'T00:00:00').getTime() - new Date(localIn + 'T00:00:00').getTime()) / 86400000))
    : 0;

  return (
    <Portal>
      <PaperModal visible={visible} onDismiss={onCancel} contentContainerStyle={[dpStyles.container, { backgroundColor: theme.colors.surface }]}>
        <Text style={dpStyles.title}>Selecciona las fechas</Text>

        {/* Check-in / Check-out tabs */}
        <View style={dpStyles.tabs}>
          {(['in', 'out'] as const).map((tab) => {
            const isActive = selecting === tab;
            const label = tab === 'in' ? 'Check-in' : 'Check-out';
            const value = tab === 'in' ? localIn : localOut;
            return (
              <Pressable
                key={tab}
                style={[dpStyles.tab, isActive && { backgroundColor: theme.colors.primaryContainer }]}
                onPress={() => setSelecting(tab)}
              >
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '600' }}>{label}</Text>
                <Text style={[dpStyles.tabDate, isActive && { color: theme.colors.primary, fontWeight: '700' }]}>
                  {value ? formatDisplay(value) : 'Selecciona'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {nights > 0 && (
          <Text style={[dpStyles.nights, { color: theme.colors.onSurfaceVariant }]}>
            {nights} {nights === 1 ? 'noche' : 'noches'}
          </Text>
        )}

        <Calendar
          markingType="period"
          markedDates={markedDates}
          onDayPress={handleDayPress}
          minDate={today}
          theme={{
            todayTextColor: theme.colors.primary,
            arrowColor: theme.colors.primary,
          }}
          style={dpStyles.calendar}
        />

        <Divider style={{ marginVertical: 8 }} />

        <View style={dpStyles.actions}>
          <Button mode="text" onPress={onCancel}>Cancelar</Button>
          <Button
            mode="contained"
            onPress={() => localIn && localOut && onConfirm(localIn, localOut)}
            disabled={!localIn || !localOut}
          >
            Confirmar
          </Button>
        </View>
      </PaperModal>
    </Portal>
  );
}

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
  const [showDatePicker, setShowDatePicker] = useState(false);

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDetail = useCallback(async (
    isManualRefresh = false,
    overrideCheckIn?: string,
    overrideCheckOut?: string
  ) => {
    if (!id) return;
    
    // Cancel previous request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const isRefresh = loadedOnce.current || isManualRefresh;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const effectiveCheckIn = overrideCheckIn ?? checkIn;
      const effectiveCheckOut = overrideCheckOut ?? checkOut;
      
      if (effectiveCheckIn) params.set('checkIn', effectiveCheckIn);
      if (effectiveCheckOut) params.set('checkOut', effectiveCheckOut);
      if (guests) params.set('guests', String(guests));
      params.set('lang', 'es');
      const res = await fetch(
        `${API_BASE}/api/search/properties/${id}/rooms?${params.toString()}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as PropertyRoomsResponse;
      setData(json);
      loadedOnce.current = true;
    } catch (e: any) {
      // Don't set error if request was aborted (race condition prevention)
      if (e.name !== 'AbortError') {
        setError(String(e));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
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

  // Initial load only
  useEffect(() => {
    void fetchDetail();
    void fetchReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only re-fetch when property ID changes

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  if (loading && !data) {
    return <SkeletonLoader />;
  }

  if (error || !property) {
    return (
      <View style={[styles.center, isDark && styles.darkBg]}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
        <Text style={[styles.errorText]}>
          No se pudieron cargar los detalles del hospedaje.
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => void fetchDetail(true)}
        >
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { rooms } = data!;

  const handleRefresh = () => {
    void fetchDetail(true);
    setReviewPage(1);
    void fetchReviews(1);
  };

  // Update URL params when dates change (deep linking support)
  const handleDateChange = (newCheckIn: string, newCheckOut: string) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    setShowDatePicker(false);
    
    // Update URL params for deep linking
    router.setParams({
      checkIn: newCheckIn,
      checkOut: newCheckOut,
    });
    
    // Manual refresh with new dates
    void fetchDetail(true, newCheckIn, newCheckOut);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, isDark && styles.darkBg]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      >
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
              label="Check-in"
              value={checkIn}
              placeholder="Selecciona"
              onPress={() => setShowDatePicker(true)}
            />
            <DateField
              label="Check-out"
              value={checkOut}
              placeholder="Selecciona"
              onPress={() => setShowDatePicker(true)}
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

      {/* Header flotante */}
      <SafeAreaView edges={['top']} style={styles.floatingHeader}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Volver"
          >
            <View style={styles.backIconCircle}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareBtn}
            accessibilityLabel="Compartir"
          >
            <View style={styles.shareIconCircle}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        checkIn={checkIn}
        checkOut={checkOut}
        onConfirm={handleDateChange}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
}

function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const width = Dimensions.get('window').width;

  if (images.length === 0) {
    return (
      <View style={[styles.carouselEmpty, { width }]}>
        <Ionicons name="image-outline" size={48} color="#9ca3af" />
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
          <ExpoImage
            source={{ uri: item }}
            style={{ width, height: width * 0.6 }}
            contentFit="cover"
            transition={200}
            priority={i === 0 ? 'high' : 'normal'}
            cachePolicy="memory-disk"
            accessibilityLabel={`Imagen ${i + 1} de ${images.length}`}
          />
        )}
        onScroll={onScroll}
        scrollEventThrottle={32}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={3}
        windowSize={5}
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
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.dateCard} onPress={onPress}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{value ? formatDisplay(value) : placeholder}</Text>
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

  // Header flotante
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  backIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  shareBtn: { padding: 4 },
  shareIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },

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
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  address: { color: '#64748b', fontSize: 13, marginTop: 4 },
  link: { color: BRAND, fontWeight: '600', textDecorationLine: 'underline' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  paragraph: { color: '#334155', fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '700', color: '#0f172a' },
  roomsHeadline: { color: '#334155', fontSize: 14, marginTop: 8 },

  dateRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  dateCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND,
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dateLabel: { color: BRAND, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dateValue: { color: '#0f172a', fontSize: 15, fontWeight: '600', marginTop: 4 },

  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  roomCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  roomImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#eee',
  },
  roomCardBody: { padding: 12, gap: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStar: { color: ACCENT, fontSize: 16 },
  ratingValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  ratingCount: { color: '#6b7280', fontSize: 12 },
  roomName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  roomMeta: { color: '#64748b', fontSize: 12 },
  roomPrice: { fontSize: 16, fontWeight: '800', color: BRAND, marginTop: 4 },
  roomPriceSuffix: { fontSize: 12, fontWeight: '400', color: '#64748b' },
  selectBtn: {
    marginTop: 8,
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  selectBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  reviewsBlock: { marginTop: 24 },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewsSummary: { color: '#0f172a', fontSize: 13, fontWeight: '600' },
  reviewCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fafbfc',
  },
  reviewerName: { fontWeight: '700', color: '#0f172a', fontSize: 13 },
  reviewTitle: { fontWeight: '600', color: '#0f172a', fontSize: 13, marginTop: 2 },
  reviewRating: { color: ACCENT, marginTop: 2, fontSize: 14 },
  reviewComment: { color: '#334155', fontSize: 13, lineHeight: 19, marginTop: 4 },
  loadMoreBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BRAND,
    backgroundColor: '#fff',
  },
  loadMoreText: { color: BRAND, fontWeight: '700' },
});

// Date Picker Modal Styles
const dpStyles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabDate: {
    marginTop: 4,
    fontSize: 14,
  },
  nights: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  calendar: {
    borderRadius: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});