import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Platform, FlatList } from 'react-native';
import {
  Appbar,
  Text,
  TextInput,
  Button,
  Chip,
  Card,
  ActivityIndicator,
  Surface,
  List,
  useTheme,
  Portal,
  Modal as PaperModal,
  IconButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { DrawerMenu } from '@/components/drawer-menu';
import { getFeatured, getCitySuggestions } from '@/services/search-api';
import type { PropertyResult, CitySuggestion } from '@/services/search-api';

// ─── Date helpers ──────────────────────────────────────────────────────────────

function toIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, day] = iso.split('-');
  return `${m}/${day}/${y}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CATEGORIES = ['Todos', 'Villas', 'Hoteles', 'Apartamentos'];

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
  const [localIn, setLocalIn] = useState(checkIn);
  const [localOut, setLocalOut] = useState(checkOut);
  const [selecting, setSelecting] = useState<'in' | 'out'>('in');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const today = toIso(new Date());

  useEffect(() => {
    setLocalIn(checkIn);
    setLocalOut(checkOut);
    setSelecting('in');
  }, [visible, checkIn, checkOut]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selecting === 'in') {
      setLocalIn(iso);
      if (!localOut || localOut <= iso) setLocalOut(addDays(iso, 1));
      setSelecting('out');
    } else {
      setLocalOut(iso <= localIn ? addDays(localIn, 1) : iso);
      setSelecting('in');
    }
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const cellIso = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const nights = localIn && localOut
    ? Math.max(0, Math.round((new Date(localOut).getTime() - new Date(localIn).getTime()) / 86400000))
    : 0;

  return (
    <Portal>
      <PaperModal visible={visible} onDismiss={onCancel} contentContainerStyle={dpStyles.container}>
        <Text variant="titleMedium" style={dpStyles.title}>Selecciona fechas</Text>

        {/* Check-in / Check-out tabs */}
        <View style={dpStyles.tabs}>
          {(['in', 'out'] as const).map((tab) => {
            const isActive = selecting === tab;
            const label = tab === 'in' ? 'Check-in' : 'Check-out';
            const value = tab === 'in' ? localIn : localOut;
            return (
              <Surface
                key={tab}
                style={[dpStyles.tab, isActive && { backgroundColor: theme.colors.primaryContainer }]}
                elevation={0}
                onTouchEnd={() => setSelecting(tab)}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
                <Text variant="bodyMedium" style={[dpStyles.tabDate, isActive && { color: theme.colors.primary, fontWeight: '700' }]}>
                  {value ? formatDisplay(value) : 'Seleccionar'}
                </Text>
              </Surface>
            );
          })}
        </View>

        {nights > 0 && (
          <Text variant="labelMedium" style={[dpStyles.nights, { color: theme.colors.onSurfaceVariant }]}>
            {nights} {nights === 1 ? 'noche' : 'noches'}
          </Text>
        )}

        {/* Month nav */}
        <View style={dpStyles.monthNav}>
          <IconButton icon="chevron-left" onPress={prevMonth} size={20} />
          <Text variant="titleSmall">{MONTHS[viewMonth]} {viewYear}</Text>
          <IconButton icon="chevron-right" onPress={nextMonth} size={20} />
        </View>

        {/* Day labels */}
        <View style={dpStyles.dayLabels}>
          {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
            <Text key={d} variant="labelSmall" style={[dpStyles.dayLabel, { color: theme.colors.onSurfaceVariant }]}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={dpStyles.grid}>
          {cells.map((day, i) => {
            if (day === null) return <View key={`e-${i}`} style={dpStyles.cell} />;
            const iso = cellIso(day);
            const past = iso < today;
            const selected = iso === localIn || iso === localOut;
            const inRange = localIn && localOut && iso > localIn && iso < localOut;
            return (
              <View
                key={day}
                style={[
                  dpStyles.cell,
                  inRange && { backgroundColor: theme.colors.primaryContainer },
                  selected && { backgroundColor: theme.colors.primary, borderRadius: 20 },
                ]}
              >
                <Text
                  onPress={() => !past && selectDay(day)}
                  variant="bodySmall"
                  style={[
                    dpStyles.cellText,
                    past && { color: theme.colors.outline },
                    selected && { color: theme.colors.onPrimary, fontWeight: '700' },
                  ]}
                >
                  {day}
                </Text>
              </View>
            );
          })}
        </View>

        <Divider style={{ marginVertical: 12 }} />

        <View style={dpStyles.actions}>
          <Button mode="text" onPress={onCancel}>Cancelar</Button>
          <Button
            mode="contained"
            onPress={() => localIn && localOut && onConfirm(localIn, localOut)}
            disabled={!localIn || !localOut}
          >
            OK
          </Button>
        </View>
      </PaperModal>
    </Portal>
  );
}

// ─── Guests Picker Modal ───────────────────────────────────────────────────────

interface GuestsPickerModalProps {
  visible: boolean;
  guests: number;
  rooms: number;
  onConfirm: (guests: number, rooms: number) => void;
  onCancel: () => void;
}

function GuestsPickerModal({ visible, guests, rooms, onConfirm, onCancel }: GuestsPickerModalProps) {
  const [localGuests, setLocalGuests] = useState(guests);
  const [localRooms, setLocalRooms] = useState(rooms);

  useEffect(() => {
    setLocalGuests(guests);
    setLocalRooms(rooms);
  }, [visible, guests, rooms]);

  return (
    <Portal>
      <PaperModal visible={visible} onDismiss={onCancel} contentContainerStyle={gpStyles.container}>
        <Text variant="titleMedium" style={gpStyles.title}>Viajeros y habitaciones</Text>

        {[
          { label: 'Viajeros', value: localGuests, set: setLocalGuests, min: 1, max: 20 },
          { label: 'Habitaciones', value: localRooms, set: setLocalRooms, min: 1, max: 10 },
        ].map(({ label, value, set, min, max }) => (
          <View key={label} style={gpStyles.row}>
            <Text variant="bodyLarge">{label}</Text>
            <View style={gpStyles.counter}>
              <IconButton icon="minus" mode="outlined" size={18} onPress={() => set(v => Math.max(min, v - 1))} />
              <Text variant="titleMedium" style={gpStyles.counterValue}>{value}</Text>
              <IconButton icon="plus" mode="outlined" size={18} onPress={() => set(v => Math.min(max, v + 1))} />
            </View>
          </View>
        ))}

        <Divider style={{ marginVertical: 8 }} />

        <View style={gpStyles.actions}>
          <Button mode="text" onPress={onCancel}>Cancelar</Button>
          <Button mode="contained" onPress={() => onConfirm(localGuests, localRooms)}>OK</Button>
        </View>
      </PaperModal>
    </Portal>
  );
}

// ─── Featured Card ─────────────────────────────────────────────────────────────

function FeaturedCard({ item }: { item: PropertyResult }) {
  const price = item.pricePerNight ?? item.totalPrice;
  return (
    <Card style={cardStyles.card} mode="elevated">
      <Image
        source={item.thumbnail_url || 'https://via.placeholder.com/140x100'}
        style={cardStyles.image}
        contentFit="cover"
      />
      {price != null && (
        <View style={cardStyles.badge}>
          <Text variant="labelSmall" style={cardStyles.badgeText}>${Math.round(price)}/n</Text>
        </View>
      )}
      <Card.Content style={cardStyles.content}>
        <Text variant="labelMedium" numberOfLines={1}>{item.property_name}</Text>
        <Text variant="labelSmall" numberOfLines={1} style={cardStyles.city}>{item.city}</Text>
        {item.stars > 0 && <Text style={cardStyles.stars}>{'★'.repeat(item.stars)}</Text>}
      </Card.Content>
    </Card>
  );
}

// ─── Home Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [featured, setFeatured] = useState<PropertyResult[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getFeatured(6)
      .then(r => setFeatured(r.results))
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, []);

  function onCityChange(text: string) {
    setCity(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      const s = await getCitySuggestions(text);
      setSuggestions(s);
      setShowSuggestions(s.length > 0);
    }, 300);
  }

  function selectSuggestion(s: CitySuggestion) {
    setCity(s.city);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function dateLabel() {
    if (checkIn && checkOut) return `${formatDisplay(checkIn)}  →  ${formatDisplay(checkOut)}`;
    return '';
  }

  function guestsLabel() {
    return `${guests} ${guests === 1 ? 'Viajero' : 'Viajeros'} · ${rooms} ${rooms === 1 ? 'Habitación' : 'Habitaciones'}`;
  }

  function handleSearch() {
    if (!city.trim()) return;
    router.push({
      pathname: '/search-results',
      params: { city: city.trim(), checkIn, checkOut, guests: String(guests) },
    });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* AppBar */}
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }} elevated>
        <Appbar.Action icon="menu" onPress={() => setDrawerOpen(true)} testID="btn-menu" />
        <Appbar.Content title="TravelHub" titleStyle={[styles.brandName, { color: theme.colors.primary }]} />
        <Appbar.Action icon="account-circle-outline" onPress={() => {}} />
      </Appbar.Header>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Featured */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Más Populares</Text>
          {featuredLoading ? (
            <ActivityIndicator animating style={{ marginVertical: 20 }} />
          ) : featured.length > 0 ? (
            <FlatList
              data={featured}
              keyExtractor={item => item.property_id}
              renderItem={({ item }) => <FeaturedCard item={item} />}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            />
          ) : (
            <Text variant="bodySmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No hay propiedades destacadas
            </Text>
          )}
        </View>

        {/* Category chips */}
        <View style={styles.section}>
          <View style={styles.tabsRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Recomendados</Text>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Ver todos</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {CATEGORIES.map((cat, i) => (
              <Chip
                key={cat}
                selected={activeCategory === i}
                onPress={() => setActiveCategory(i)}
                style={styles.chip}
                showSelectedOverlay
              >
                {cat}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Headline */}
        <View style={styles.headline}>
          <Text variant="headlineSmall" style={[styles.headlineTitle, { color: theme.colors.primary }]}>
            Encuentra el hotel perfecto para tus vacaciones.
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Explora entre más de 1200 opciones...
          </Text>
        </View>

        {/* Search form */}
        <Surface style={[styles.searchCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>

          {/* City */}
          <View style={styles.fieldWrapper}>
            <TextInput
              label="¿A dónde viajas?"
              value={city}
              onChangeText={onCityChange}
              mode="outlined"
              left={<TextInput.Icon icon="map-marker-outline" />}
              testID="input-city"
            />
            {showSuggestions && (
              <Surface style={styles.suggestions} elevation={3}>
                {suggestions.map(s => (
                  <List.Item
                    key={s.id}
                    title={`${s.city}, ${s.country}`}
                    onPress={() => selectSuggestion(s)}
                    left={props => <List.Icon {...props} icon="city" />}
                  />
                ))}
              </Surface>
            )}
          </View>

          {/* Dates */}
          <TextInput
            label="Fechas de estadía"
            value={dateLabel()}
            mode="outlined"
            editable={false}
            onPressIn={() => setShowDatePicker(true)}
            left={<TextInput.Icon icon="calendar-range" />}
            placeholder="Check-in  →  Check-out"
            testID="btn-date"
            style={styles.fieldWrapper}
          />

          {/* Guests */}
          <TextInput
            label="¿Quiénes viajan?"
            value={guestsLabel()}
            mode="outlined"
            editable={false}
            onPressIn={() => setShowGuestPicker(true)}
            left={<TextInput.Icon icon="account-group-outline" />}
            testID="btn-guests"
            style={styles.fieldWrapper}
          />

          {/* Search button */}
          <Button
            mode="contained"
            icon="magnify"
            onPress={handleSearch}
            disabled={!city.trim()}
            contentStyle={styles.searchBtnContent}
            style={styles.searchBtn}
            buttonColor={theme.colors.secondary}
            textColor={theme.colors.onSecondary}
            testID="btn-search"
          >
            Buscar
          </Button>
        </Surface>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Drawer */}
      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Date picker */}
      <DatePickerModal
        visible={showDatePicker}
        checkIn={checkIn}
        checkOut={checkOut}
        onConfirm={(ci, co) => { setCheckIn(ci); setCheckOut(co); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Guests picker */}
      <GuestsPickerModal
        visible={showGuestPicker}
        guests={guests}
        rooms={rooms}
        onConfirm={(g, r) => { setGuests(g); setRooms(r); setShowGuestPicker(false); }}
        onCancel={() => setShowGuestPicker(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  brandName: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  section: { marginTop: 20 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 12 },
  tabsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16, marginBottom: 12 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: { marginRight: 4 },
  emptyText: { paddingHorizontal: 16 },
  headline: { paddingHorizontal: 16, marginTop: 24, marginBottom: 8 },
  headlineTitle: { fontWeight: '800', marginBottom: 6, lineHeight: 30 },
  searchCard: { margin: 16, borderRadius: 16, padding: 16, gap: 4 },
  fieldWrapper: { marginBottom: 8, zIndex: 10 },
  suggestions: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 100,
    borderRadius: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchBtn: { marginTop: 8, borderRadius: 10 },
  searchBtnContent: { paddingVertical: 6 },
});

const cardStyles = StyleSheet.create({
  card: { width: 140, marginBottom: 4 },
  image: { width: 140, height: 100, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  badge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { color: '#fff' },
  content: { paddingHorizontal: 8, paddingVertical: 6 },
  city: { color: '#6b7280', marginTop: 1 },
  stars: { fontSize: 10, color: '#f59e0b', marginTop: 2 },
});

const dpStyles = StyleSheet.create({
  container: {
    margin: 20, backgroundColor: '#fff',
    borderRadius: 16, padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  title: { textAlign: 'center', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
  tabDate: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  nights: { textAlign: 'center', marginBottom: 4 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabels: { flexDirection: 'row', marginTop: 4, marginBottom: 2 },
  dayLabel: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellText: { textAlign: 'center', lineHeight: 28 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});

const gpStyles = StyleSheet.create({
  container: {
    margin: 20, backgroundColor: '#fff',
    borderRadius: 16, padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  title: { textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterValue: { minWidth: 32, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
