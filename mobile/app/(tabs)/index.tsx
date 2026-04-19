import { useState, useEffect, useRef, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import {
  Appbar,
  Text,
  TextInput,
  Button,
  Chip,
  ActivityIndicator,
  Surface,
  List,
  useTheme,
  Portal,
  Modal as PaperModal,
  IconButton,
  Divider,
} from 'react-native-paper';
import { AppCard } from '@/components/ui/app-card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Calendar } from 'react-native-calendars';

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
        <Text variant="titleMedium" style={dpStyles.title}>{t('datePicker.title')}</Text>

        {/* Check-in / Check-out tabs */}
        <View style={dpStyles.tabs}>
          {(['in', 'out'] as const).map((tab) => {
            const isActive = selecting === tab;
            const label = tab === 'in' ? t('datePicker.checkin') : t('datePicker.checkout');
            const value = tab === 'in' ? localIn : localOut;
            return (
              <Pressable
                key={tab}
                style={[dpStyles.tab, isActive && { backgroundColor: theme.colors.primaryContainer }]}
                onPress={() => setSelecting(tab)}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
                <Text variant="bodyMedium" style={[dpStyles.tabDate, isActive && { color: theme.colors.primary, fontWeight: '700' }]}>
                  {value ? formatDisplay(value) : t('datePicker.select')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {nights > 0 && (
          <Text variant="labelMedium" style={[dpStyles.nights, { color: theme.colors.onSurfaceVariant }]}>
            {t('datePicker.night', { count: nights })}
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
          <Button mode="text" onPress={onCancel}>{t('datePicker.cancel')}</Button>
          <Button
            mode="contained"
            onPress={() => localIn && localOut && onConfirm(localIn, localOut)}
            disabled={!localIn || !localOut}
          >
            {t('datePicker.ok')}
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
  const theme = useTheme();
  const { t } = useTranslation();
  const [localGuests, setLocalGuests] = useState(guests);
  const [localRooms, setLocalRooms] = useState(rooms);

  useEffect(() => {
    setLocalGuests(guests);
    setLocalRooms(rooms);
  }, [visible, guests, rooms]);

  return (
    <Portal>
      <PaperModal visible={visible} onDismiss={onCancel} contentContainerStyle={[gpStyles.container, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleMedium" style={gpStyles.title}>{t('guestPicker.title')}</Text>

        {[
          { label: t('guestPicker.travelers'), value: localGuests, set: setLocalGuests, min: 1, max: 20 },
          { label: t('guestPicker.rooms'), value: localRooms, set: setLocalRooms, min: 1, max: 10 },
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
          <Button mode="text" onPress={onCancel}>{t('guestPicker.cancel')}</Button>
          <Button mode="contained" onPress={() => onConfirm(localGuests, localRooms)}>{t('guestPicker.ok')}</Button>
        </View>
      </PaperModal>
    </Portal>
  );
}

// ─── Featured Card ─────────────────────────────────────────────────────────────

function FeaturedCard({ item }: { item: PropertyResult }) {
  const price = item.priceUsd ?? item.basePriceUsd;
  return (
    <AppCard style={cardStyles.card}>
      <Image
        source={item.property.thumbnailUrl || 'https://via.placeholder.com/140x100'}
        style={cardStyles.image}
        contentFit="cover"
      />
      {price != null && (
        <View style={cardStyles.badge}>
          <Text variant="labelSmall" style={cardStyles.badgeText}>${Math.round(price)}/n</Text>
        </View>
      )}
      <View style={cardStyles.content}>
        <Text variant="labelMedium" numberOfLines={1}>{item.property.name}</Text>
        <Text variant="labelSmall" numberOfLines={1} style={cardStyles.city}>{item.property.city}</Text>
        {item.property.stars > 0 && <Text style={cardStyles.stars}>{'★'.repeat(item.property.stars)}</Text>}
      </View>
    </AppCard>
  );
}

// ─── Home Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();

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
    return `${t('home.travelers', { count: guests })} · ${t('home.room', { count: rooms })}`;
  }

  function handleSearch() {
    if (!city.trim()) return;
    router.push({
      pathname: '/search-results',
      params: { city: city.trim(), checkIn, checkOut, guests: String(guests) },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      {/* AppBar */}
      <Appbar.Header style={{ backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <Appbar.Content title={t('home.title')} titleStyle={[styles.brandName, { color: theme.colors.primary }]} />
        <Appbar.Action icon="bell-outline" onPress={() => router.push('/notifications')} />
      </Appbar.Header>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
          <Text variant="headlineSmall" style={styles.headlineTitle}>
            {t('home.headline')}
          </Text>
          <Text variant="bodyMedium" style={styles.headlineSub}>
            {t('home.subheadline')}
          </Text>

          {/* Search form */}
          <AppCard style={styles.searchCard}>

            {/* City */}
            <View style={[styles.fieldWrapper, { zIndex: 10 }]}>
              <TextInput
                label={t('home.searchCity')}
                value={city}
                onChangeText={onCityChange}
                mode="outlined"
                left={<TextInput.Icon icon="map-marker-outline" />}
                style={styles.fieldInput}
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
            <Pressable onPress={() => setShowDatePicker(true)} testID="btn-date" style={styles.fieldWrapper}>
              <TextInput
                label={t('home.searchDates')}
                value={dateLabel()}
                mode="outlined"
                editable={false}
                pointerEvents="none"
                left={<TextInput.Icon icon="calendar-range" />}
                placeholder={t('home.checkinPlaceholder')}
                style={styles.fieldInput}
              />
            </Pressable>

            {/* Guests */}
            <Pressable onPress={() => setShowGuestPicker(true)} testID="btn-guests" style={styles.fieldWrapper}>
              <TextInput
                label={t('home.searchGuests')}
                value={guestsLabel()}
                mode="outlined"
                editable={false}
                pointerEvents="none"
                left={<TextInput.Icon icon="account-group-outline" />}
                style={styles.fieldInput}
              />
            </Pressable>

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
              {t('home.searchBtn')}
            </Button>
          </AppCard>
        </View>

        {/* Recommended */}
        <View style={styles.section}>
          <View style={styles.tabsRow}>
            <Text variant="titleMedium">{t('home.recommended')}</Text>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>{t('home.seeAll')}</Text>
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
          <View style={styles.cardsRow}>
            {featuredLoading ? (
              <ActivityIndicator animating style={{ marginVertical: 20 }} />
            ) : featured.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              >
                {featured.map(item => <FeaturedCard key={item.roomId} item={item} />)}
              </ScrollView>
            ) : (
              <Text variant="bodySmall" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                {t('home.noFeatured')}
              </Text>
            )}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

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
  safeArea: { flex: 1, backgroundColor: '#f8f9ff' },
  brandName: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  section: { marginTop: 20 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 12 },
  tabsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: { marginRight: 4 },
  cardsRow: { marginTop: 16 },
  emptyText: { paddingHorizontal: 16 },
  hero: { paddingTop: 28, paddingBottom: 32, paddingHorizontal: 16, zIndex: 1 },
  headlineTitle: { fontWeight: '800', color: '#fff', lineHeight: 30, marginBottom: 6 },
  headlineSub: { color: 'rgba(255,255,255,0.75)', marginBottom: 20 },
  searchCard: { padding: 16, gap: 4, overflow: 'visible', zIndex: 1 },
  fieldWrapper: { marginBottom: 8 },
  fieldInput: { backgroundColor: '#fff' },
  suggestions: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 100,
    borderRadius: 8,
    maxHeight: 200,
  },
  searchBtn: { marginTop: 8, borderRadius: 10 },
  searchBtnContent: { paddingVertical: 6 },
});

const cardStyles = StyleSheet.create({
  card: { width: 140, marginBottom: 4, overflow: 'hidden' },
  image: { width: 140, height: 100 },
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
    margin: 20,
    borderRadius: 16, padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  title: { textAlign: 'center', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10 },
  tabDate: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  nights: { textAlign: 'center', marginBottom: 4 },
  calendar: { borderRadius: 8, marginBottom: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});

const gpStyles = StyleSheet.create({
  container: {
    margin: 20,
    borderRadius: 16, padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  title: { textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterValue: { minWidth: 32, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
