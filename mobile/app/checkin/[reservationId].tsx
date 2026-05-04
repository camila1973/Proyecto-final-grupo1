import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAuth } from '@/hooks/useAuth';
import { syncReservations } from '@/services/bookings-cache';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type ScanState = 'scanning' | 'processing' | 'success' | 'error';

export default function CheckinScanScreen() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { token, user } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const scannedRef = useRef(false);

  useEffect(() => {
    scannedRef.current = false;
  }, []);

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scannedRef.current || scanState !== 'scanning') return;
    scannedRef.current = true;

    let checkInKey: string | null = null;
    try {
      const url = new URL(data);
      checkInKey = url.searchParams.get('key');
    } catch {
      setErrorMessage(t('checkin.errorInvalidKey'));
      setScanState('error');
      return;
    }

    if (!checkInKey) {
      setErrorMessage(t('checkin.errorInvalidKey'));
      setScanState('error');
      return;
    }

    setScanState('processing');

    try {
      const res = await fetch(
        `${API_BASE}/api/booking/reservations/${reservationId}/check-in`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ checkInKey, bookerId: user?.id }),
        },
      );

      if (res.ok) {
        if (token && user) {
          await syncReservations(token, user.id).catch(() => undefined);
        }
        setScanState('success');
      } else {
        const status = res.status;
        if (status === 401) {
          setErrorMessage(t('checkin.errorInvalidKey'));
        } else if (status === 400) {
          setErrorMessage(t('checkin.errorWindow'));
        } else {
          setErrorMessage(t('checkin.errorGeneric'));
        }
        setScanState('error');
      }
    } catch {
      setErrorMessage(t('checkin.errorGeneric'));
      setScanState('error');
    }
  }

  function handleRetry() {
    scannedRef.current = false;
    setScanState('scanning');
    setErrorMessage('');
  }

  if (!permission) {
    return (
      <>
        <Stack.Screen options={{ title: t('checkin.title') }} />
        <View style={styles.centered}>
          <ActivityIndicator animating />
        </View>
      </>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: t('checkin.title') }} />
        <View style={styles.centered}>
          <MaterialIcons name="no-photography" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={[styles.permissionText, { color: theme.colors.onSurface }]}>
            {t('checkin.permissionDenied')}
          </Text>
          <Button mode="contained" onPress={requestPermission} style={styles.btn}>
            {t('checkin.requestPermission')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (scanState === 'success') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: t('checkin.title') }} />
        <View style={styles.centered}>
          <MaterialIcons name="check-circle" size={72} color="#16a34a" />
          <Text variant="headlineSmall" style={[styles.resultTitle, { color: theme.colors.onSurface }]}>
            {t('checkin.success')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {t('checkin.successDesc')}
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(tabs)/trips')}
            style={styles.btn}
          >
            {t('checkin.done')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (scanState === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: t('checkin.title') }} />
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={72} color={theme.colors.error} />
          <Text variant="headlineSmall" style={[styles.resultTitle, { color: theme.colors.onSurface }]}>
            {t('checkin.errorTitle')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 24 }}>
            {errorMessage}
          </Text>
          <Button mode="outlined" onPress={handleRetry} style={styles.btn}>
            {t('search.retry')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Button
            textColor="#fff"
            onPress={() => router.back()}
            icon="close"
          >
            {''}
          </Button>
          <Text variant="titleMedium" style={styles.topTitle}>
            {t('checkin.title')}
          </Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.bottomHint}>
          {scanState === 'processing' ? (
            <ActivityIndicator animating color="#fff" />
          ) : (
            <Text variant="bodyMedium" style={styles.hintText}>
              {t('checkin.scanning')}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER = 28;
const CORNER_THICKNESS = 3;
const FRAME_SIZE = 240;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { textAlign: 'center', marginVertical: 8 },
  resultTitle: { fontWeight: '700', textAlign: 'center' },
  btn: { marginTop: 8, minWidth: 200 },

  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topTitle: { color: '#fff', fontWeight: '700' },

  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },

  bottomHint: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
  },
  hintText: { color: '#fff', textAlign: 'center' },
});
