import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, List, Divider, useTheme } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

interface MenuItem {
  label: string;
  icon: string;
  href: '/' | '/trips' | '/register';
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Inicio',       icon: 'home-outline',        href: '/' },
  { label: 'Reservas',     icon: 'calendar-check-outline', href: '/trips' },
  { label: 'Crear cuenta', icon: 'account-plus-outline', href: '/register' },
];

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: visible ? 280 : 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: visible ? 280 : 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slideAnim, fadeAnim]);

  function navigate(href: MenuItem['href']) {
    onClose();
    setTimeout(() => router.push(href), 200);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>

        {/* Header */}
        <View style={[styles.drawerHeader, { backgroundColor: theme.colors.primary }]}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>
            TravelHub
          </Text>
        </View>

        <Divider />

        {/* Navigation items */}
        <View style={styles.nav}>
          {MENU_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <List.Item
                key={item.href}
                title={item.label}
                titleStyle={[
                  styles.navLabel,
                  isActive && { color: theme.colors.primary, fontWeight: '700' },
                ]}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={item.icon}
                    color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                )}
                style={[
                  styles.navItem,
                  isActive && { backgroundColor: theme.colors.primaryContainer },
                ]}
                onPress={() => navigate(item.href)}
                testID={`drawer-item-${item.href.replace('/', '') || 'home'}`}
              />
            );
          })}
        </View>

        <Divider />

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>v1.0.0</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
  },
  nav: {
    paddingVertical: 8,
  },
  navItem: {
    paddingHorizontal: 8,
  },
  navLabel: {
    fontSize: 16,
    color: '#374151',
  },
  footer: {
    padding: 20,
    marginTop: 'auto',
  },
});
