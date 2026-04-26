import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useNetInfo } from '@/hooks/useNetInfo';

const BANNER_HEIGHT = 52;

/**
 * Slides in from the top when the device loses internet access and slides out
 * when connectivity is restored. Mount it once at screen level — it manages
 * its own visibility internally via useNetInfo.
 */
export function OfflineBanner() {
  const { isConnected, isLoading } = useNetInfo();
  const { t } = useTranslation();
  const theme = useTheme();

  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const visible = !isLoading && !isConnected;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -BANNER_HEIGHT,
      duration: visible ? 300 : 240,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.error, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.inner}>
        <MaterialIcons name="wifi-off" size={18} color={theme.colors.onError} />
        <View style={styles.textBlock}>
          <Text variant="labelLarge" style={[styles.title, { color: theme.colors.onError }]}>
            {t('offline.banner')}
          </Text>
          <Text variant="labelSmall" style={[styles.sub, { color: theme.colors.onError }]}>
            {t('offline.sub')}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    zIndex: 999,
    justifyContent: 'flex-end',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    lineHeight: 18,
  },
  sub: {
    opacity: 0.85,
    lineHeight: 14,
  },
});
