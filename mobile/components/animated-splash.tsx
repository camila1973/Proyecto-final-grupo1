import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const BRAND_BLUE = '#056DEB';
const LOGO_SIZE = 160;

interface Props {
  appReady: boolean;
  onAnimationEnd: () => void;
}

export function AnimatedSplash({ appReady, onAnimationEnd }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  // Pulse loop while loading
  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, scale]);

  // Exit animation when app is ready
  useEffect(() => {
    if (!appReady) return;
    scale.value = withTiming(1.08, { duration: 400, easing: Easing.in(Easing.ease) });
    opacity.value = withTiming(
      0,
      { duration: 400, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(onAnimationEnd)();
      },
    );
  }, [appReady, onAnimationEnd, opacity, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={logoStyle}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
