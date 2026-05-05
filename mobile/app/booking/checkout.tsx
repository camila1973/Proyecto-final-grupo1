import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { AppHeader } from '@/components/ui/app-header';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@/services/stripe-wrapper';

import { useAuth } from '@/hooks/useAuth';
import { getCheckoutIntent, clearCheckoutIntent } from '@/services/checkout-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FareBreakdown {
  nights: number;
  roomRateUsd: number;
  subtotalUsd: number;
  taxes: { name: string; amountUsd: number }[];
  fees: { name: string; totalUsd: number }[];
  taxTotalUsd: number;
  feeTotalUsd: number;
  totalUsd: number;
}

interface Reservation {
  id: string;
  grandTotalUsd: number;
  holdExpiresAt: string;
  fareBreakdown: FareBreakdown;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

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

// ─── Fare row ─────────────────────────────────────────────────────────────────

function FareRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.fareRow}>
      <Text
        variant={bold ? 'titleSmall' : 'bodySmall'}
        style={{ color: bold ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}
      >
        {label}
      </Text>
      <Text
        variant={bold ? 'titleSmall' : 'bodySmall'}
        style={{ color: bold ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: bold ? '700' : '400' }}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const intent = useRef(getCheckoutIntent()).current;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loadingReservation, setLoadingReservation] = useState(true);
  const [reservationError, setReservationError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [paying, setPaying] = useState(false);
  
  // Prevent multiple reservation creation
  const reservationCreatedRef = useRef(false);

  const countdown = useCountdown(reservation?.holdExpiresAt ?? null);

  // ─── Create reservation (hold) on mount ──────────────────────────────────────

  const createReservation = useCallback(async () => {
    if (!intent || !token || !user || reservationCreatedRef.current) return;
    
    reservationCreatedRef.current = true;
    setLoadingReservation(true);
    setReservationError(null);
    try {
      const payload = {
        propertyId: intent.propertyId,
        roomId: intent.roomId,
        partnerId: intent.partnerId,
        bookerId: user.id,
        checkIn: intent.checkIn,
        checkOut: intent.checkOut,
      };
      
      console.log('[Checkout] Creating reservation with:', payload);
      console.log('[Checkout] Property:', intent.propertyName);
      console.log('[Checkout] Room type:', intent.roomType);
      console.log('[Checkout] Dates:', intent.checkIn, 'to', intent.checkOut);
      console.log('[Checkout] API endpoint:', `${API_BASE}/api/booking/reservations`);
      
      const res = await fetch(`${API_BASE}/api/booking/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Checkout] Reservation creation failed:', res.status, errorText);
        
        // Extraer mensaje específico del backend
        let backendMessage = t('checkout.errorHold');
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            console.error('[Checkout] Backend error details:', errorJson.message);
            backendMessage = errorJson.message; // Usar mensaje real del backend
          } else if (errorJson.error) {
            backendMessage = errorJson.error;
          }
        } catch {
          // No es JSON, usar el texto plano si existe
          if (errorText && errorText.length < 200) {
            backendMessage = errorText;
          }
        }
        throw new Error(backendMessage);
      }
      
      const data = (await res.json()) as Reservation;
      console.log('[Checkout] Reservation created successfully:', data.id);
      setReservation(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('checkout.errorHold');
      console.error('[Checkout] Error:', errorMsg);
      
      // En desarrollo, mostrar detalles del error
      if (__DEV__) {
        console.error('[Checkout] Full error details:', err);
        Alert.alert(
          'Error de Reserva (DEV)',
          `${errorMsg}\n\nRevisa la consola para más detalles.`,
          [{ text: 'OK' }]
        );
      }
      
      setReservationError(errorMsg);
      reservationCreatedRef.current = false; // Allow retry
    } finally {
      setLoadingReservation(false);
    }
  }, [intent, token, user, t]);

  useEffect(() => {
    if (!token || !user) {
      router.replace('/(tabs)/account');
      return;
    }
    if (!intent) {
      router.back();
      return;
    }
    void createReservation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Validate guest fields ────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = t('checkout.errors.firstName');
    if (!lastName.trim()) errs.lastName = t('checkout.errors.lastName');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('checkout.errors.email');
    if (!phone.trim()) errs.phone = t('checkout.errors.phone');
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Payment ─────────────────────────────────────────────────────────────────

  const handlePay = async () => {
    if (!reservation || !validate()) return;
    setPaying(true);

    try {
      // 1. Save guest info
      console.log('[Checkout] Saving guest info for reservation:', reservation.id);
      const guestRes = await fetch(
        `${API_BASE}/api/booking/reservations/${reservation.id}/guest-info`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, phone }),
        },
      );
      
      if (!guestRes.ok) {
        const errorText = await guestRes.text();
        console.error('[Checkout] Guest info update failed:', guestRes.status, errorText);
        throw new Error('guest_info');
      }
      
      console.log('[Checkout] Guest info saved successfully');

      // 2. Initiate payment → get clientSecret
      console.log('[Checkout] Initiating payment for reservation:', reservation.id);
      const payRes = await fetch(`${API_BASE}/api/payment/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: reservation.id,
          amountUsd: reservation.grandTotalUsd,
          currency: 'usd',
          guestEmail: email,
        }),
      });
      
      if (!payRes.ok) {
        const errorText = await payRes.text();
        console.error('[Checkout] Payment initiation failed:', payRes.status, errorText);
        
        // Extraer mensaje específico del backend
        let errorMessage = 'initiate';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            console.error('[Checkout] Payment backend error:', errorJson.message);
            errorMessage = errorJson.message;
          }
        } catch {
          if (errorText && errorText.length < 200) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }
      
      const paymentData = await payRes.json();
      const clientSecret = paymentData.clientSecret;
      console.log('[Checkout] Payment client secret received');

      // 3. Init PaymentSheet
      console.log('[Checkout] Initializing Stripe PaymentSheet');
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'TravelHub',
        defaultBillingDetails: {
          name: `${firstName} ${lastName}`,
          email,
        },
        appearance: {
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            componentBackground: theme.colors.surface,
          },
        },
      });
      
      if (initError) {
        console.error('[Checkout] PaymentSheet init error:', initError);
        throw new Error(initError.message);
      }
      
      console.log('[Checkout] PaymentSheet initialized, presenting to user');

      // 4. Present PaymentSheet
      const { error: presentError } = await presentPaymentSheet();
      
      if (presentError) {
        console.error('[Checkout] PaymentSheet present error:', presentError);
        if (presentError.code !== 'Canceled') {
          Alert.alert(t('checkout.errorPayment'), presentError.message);
        } else {
          console.log('[Checkout] User canceled payment');
        }
        setPaying(false);
        return;
      }

      // 5. Success
      console.log('[Checkout] Payment completed successfully');
      clearCheckoutIntent();
      router.replace({
        pathname: '/booking/confirmation',
        params: { reservationId: reservation.id, propertyName: intent?.propertyName ?? '' },
      });
    } catch (err: unknown) {
      console.error('[Checkout] Payment flow error:', err);
      const msg = err instanceof Error ? err.message : 'unknown';
      
      // Mensajes específicos conocidos
      if (msg === 'guest_info') {
        Alert.alert(t('checkout.errorGuestInfo'));
      } else if (msg === 'initiate') {
        Alert.alert(t('checkout.errorInitiate'));
      } else {
        // Mostrar el mensaje real del backend o un mensaje genérico
        const displayMsg = msg !== 'unknown' && msg.length < 200 
          ? msg 
          : t('checkout.errorPayment');
        Alert.alert(
          t('checkout.errorPayment'), 
          displayMsg
        );
      }
      setPaying(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (!intent) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <AppHeader title={t('checkout.title')} showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Property summary ── */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.propertyRow}>
              {intent.propertyThumbnailUrl ? (
                <Image
                  source={intent.propertyThumbnailUrl}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.thumbnail, { backgroundColor: theme.colors.surfaceVariant }]} />
              )}
              <View style={styles.propertyInfo}>
                <Text variant="titleSmall" numberOfLines={2} style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {intent.propertyName}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {intent.propertyCity}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {intent.roomType}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

            {/* Dates */}
            <View style={styles.datesRow}>
              <View style={styles.dateBlock}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('bookings.checkIn')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  {formatDate(intent.checkIn)}
                </Text>
              </View>
              <Text style={{ color: theme.colors.outline }}>→</Text>
              <View style={styles.dateBlock}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('bookings.checkOut')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  {formatDate(intent.checkOut)}
                </Text>
              </View>
            </View>
          </Surface>

          {/* ── Fare breakdown ── */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {t('checkout.fareTitle')}
            </Text>

            {loadingReservation ? (
              <View style={styles.fareLoading}>
                <ActivityIndicator animating size="small" color={theme.colors.primary} />
              </View>
            ) : reservationError ? (
              <View>
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>{reservationError}</Text>
                <Button mode="outlined" compact onPress={() => void createReservation()}>{t('checkout.retry')}</Button>
              </View>
            ) : reservation ? (
              <>
                <FareRow
                  label={t('checkout.fareNights', {
                    count: reservation.fareBreakdown.nights,
                    rate: usd(reservation.fareBreakdown.roomRateUsd),
                  })}
                  value={usd(reservation.fareBreakdown.subtotalUsd)}
                />
                {reservation.fareBreakdown.taxes.map((tax) => (
                  <FareRow key={tax.name} label={tax.name} value={usd(tax.amountUsd)} />
                ))}
                {reservation.fareBreakdown.fees.map((fee) => (
                  <FareRow key={fee.name} label={fee.name} value={usd(fee.totalUsd)} />
                ))}
                <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant, marginVertical: 8 }]} />
                <FareRow label={t('checkout.total')} value={usd(reservation.grandTotalUsd)} bold />

                {countdown ? (
                  <Text variant="labelSmall" style={[styles.holdTimer, { color: theme.colors.error }]}>
                    {t('checkout.holdExpires', { time: countdown })}
                  </Text>
                ) : null}
              </>
            ) : null}
          </Surface>

          {/* ── Guest info ── */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {t('checkout.guestTitle')}
            </Text>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.half]}
                mode="outlined"
                label={t('checkout.firstName')}
                value={firstName}
                onChangeText={(v) => { setFirstName(v); setFieldErrors((p) => ({ ...p, firstName: '' })); }}
                error={!!fieldErrors.firstName}
                dense
              />
              <TextInput
                style={[styles.input, styles.half]}
                mode="outlined"
                label={t('checkout.lastName')}
                value={lastName}
                onChangeText={(v) => { setLastName(v); setFieldErrors((p) => ({ ...p, lastName: '' })); }}
                error={!!fieldErrors.lastName}
                dense
              />
            </View>
            {(fieldErrors.firstName || fieldErrors.lastName) ? (
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginBottom: 4 }}>
                {fieldErrors.firstName || fieldErrors.lastName}
              </Text>
            ) : null}

            <TextInput
              style={styles.input}
              mode="outlined"
              label={t('checkout.email')}
              value={email}
              onChangeText={(v) => { setEmail(v); setFieldErrors((p) => ({ ...p, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!fieldErrors.email}
              dense
            />
            {fieldErrors.email ? (
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginBottom: 4 }}>{fieldErrors.email}</Text>
            ) : null}

            <TextInput
              style={styles.input}
              mode="outlined"
              label={t('checkout.phone')}
              value={phone}
              onChangeText={(v) => { setPhone(v); setFieldErrors((p) => ({ ...p, phone: '' })); }}
              keyboardType="phone-pad"
              error={!!fieldErrors.phone}
              dense
            />
            {fieldErrors.phone ? (
              <Text variant="labelSmall" style={{ color: theme.colors.error }}>{fieldErrors.phone}</Text>
            ) : null}
          </Surface>

          {/* ── Pay button ── */}
          <Button
            mode="contained"
            onPress={() => void handlePay()}
            loading={paying}
            disabled={paying || loadingReservation || !!reservationError || !reservation}
            style={styles.payBtn}
            contentStyle={styles.payBtnContent}
            labelStyle={{ fontSize: 16, fontWeight: '700' }}
          >
            {paying ? t('checkout.processing') : t('checkout.payBtn', { amount: usd(reservation?.grandTotalUsd ?? intent.estimatedTotalUsd) })}
          </Button>

          <Text variant="labelSmall" style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}>
            {t('checkout.disclaimer')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  card: { borderRadius: 14, padding: 16, overflow: 'hidden' },
  sectionTitle: { fontWeight: '700', marginBottom: 12 },
  divider: { height: 1, marginVertical: 12 },

  propertyRow: { flexDirection: 'row', gap: 12 },
  thumbnail: { width: 80, height: 80, borderRadius: 10 },
  propertyInfo: { flex: 1, justifyContent: 'center' },

  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBlock: { gap: 2 },

  fareLoading: { height: 60, alignItems: 'center', justifyContent: 'center' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  holdTimer: { marginTop: 10, textAlign: 'center', fontWeight: '600' },

  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  input: { marginBottom: 8 },

  payBtn: { borderRadius: 12, marginTop: 8 },
  payBtnContent: { paddingVertical: 6 },
  disclaimer: { textAlign: 'center', marginTop: 4, lineHeight: 16 },
});
