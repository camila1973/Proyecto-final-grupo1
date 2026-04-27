import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { usePaymentPolling } from '@/hooks/usePaymentPolling';

// ─── Processing State ─────────────────────────────────────────────────────────

function ProcessingState({ theme }: { theme: any }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={64} color={theme.colors.primary} />
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface, marginTop: 24 }]}>
        {t('confirmation.processing.title')}
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        {t('confirmation.processing.subtitle')}
      </Text>
    </View>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────

interface SuccessStateProps {
  reservationId: string;
  propertyName?: string;
  timedOut: boolean;
  theme: any;
  onGoToTrips: () => void;
  onGoHome: () => void;
}

function SuccessState({ 
  reservationId, 
  propertyName, 
  timedOut, 
  theme, 
  onGoToTrips, 
  onGoHome 
}: SuccessStateProps) {
  const { t } = useTranslation();
  const shortId = reservationId.slice(0, 6).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
        <MaterialIcons name="check-circle" size={52} color="#16a34a" />
      </View>

      {/* Title */}
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
        {timedOut ? t('confirmation.timeout.title') : t('confirmation.title')}
      </Text>

      {/* Property name */}
      {propertyName ? (
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {t('confirmation.subtitle', { propertyName })}
        </Text>
      ) : null}

      {/* Timeout warning */}
      {timedOut && (
        <View style={[styles.warningBox, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
          <MaterialIcons name="info-outline" size={20} color="#d97706" />
          <Text variant="bodySmall" style={{ color: '#78350f', flex: 1 }}>
            {t('confirmation.timeout.message')}
          </Text>
        </View>
      )}

      {/* Booking ID */}
      <View style={[styles.idBox, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('confirmation.bookingId')}
        </Text>
        <Text
          variant="titleMedium"
          style={{ 
            color: theme.colors.onSurface, 
            fontWeight: '700', 
            letterSpacing: 2, 
            fontFamily: 'monospace' 
          }}
        >
          #{shortId}
        </Text>
      </View>

      <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        {t('confirmation.hint')}
      </Text>

      {/* CTAs */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          style={styles.btn}
          contentStyle={styles.btnContent}
          onPress={onGoToTrips}
        >
          {t('confirmation.seeTrips')}
        </Button>
        <Button
          mode="outlined"
          style={styles.btn}
          contentStyle={styles.btnContent}
          onPress={onGoHome}
        >
          {t('confirmation.backHome')}
        </Button>
      </View>
    </View>
  );
}

// ─── Failed State ─────────────────────────────────────────────────────────────

interface FailedStateProps {
  failureReason?: string;
  theme: any;
  onGoHome: () => void;
}

function FailedState({ failureReason, theme, onGoHome }: FailedStateProps) {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
        <MaterialIcons name="error-outline" size={52} color="#dc2626" />
      </View>

      {/* Title */}
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.error }]}>
        {t('confirmation.failed.title')}
      </Text>

      {/* Message */}
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        {failureReason || t('confirmation.failed.subtitle')}
      </Text>

      {/* CTA */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          style={styles.btn}
          contentStyle={styles.btnContent}
          onPress={onGoHome}
        >
          {t('confirmation.failed.backHome')}
        </Button>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConfirmationScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { reservationId, propertyName } = useLocalSearchParams<{
    reservationId: string;
    propertyName: string;
  }>();

  const { status, failureReason, timedOut } = usePaymentPolling(reservationId ?? '');

  const handleGoToTrips = () => router.replace('/(tabs)/trips');
  const handleGoHome = () => router.replace('/(tabs)');

  // Estado de procesamiento (polling activo)
  if (status === 'pending' && !timedOut) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <ProcessingState theme={theme} />
      </SafeAreaView>
    );
  }

  // Estado de fallo
  if (status === 'failed') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <FailedState 
          failureReason={failureReason} 
          theme={theme} 
          onGoHome={handleGoHome} 
        />
      </SafeAreaView>
    );
  }

  // Estado de éxito (captured o timeout con pending)
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <SuccessState
        reservationId={reservationId ?? ''}
        propertyName={propertyName}
        timedOut={timedOut}
        theme={theme}
        onGoToTrips={handleGoToTrips}
        onGoHome={handleGoHome}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  idBox: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  hint: { textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  actions: { width: '100%', gap: 10, marginTop: 8 },
  btn: { borderRadius: 12 },
  btnContent: { paddingVertical: 4 },
});
