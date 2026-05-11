import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { usePendingReservation } from '@/hooks/usePendingReservation';

export default function TabLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const hasPending = usePendingReservation();
  const showTripsDot = hasPending && !!user;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors['light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color }) => <MaterialIcons name="search" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: ({ color }) => (
            <View>
              <MaterialIcons name="event-available" size={26} color={color} />
              {showTripsDot && (
                <View
                  style={styles.pendingDot}
                  accessibilityLabel={t('tabs.pendingReservation')}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color }) => <MaterialIcons name="account-circle" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pendingDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
