import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const { t } = useTranslation();

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
          tabBarIcon: ({ color }) => <MaterialIcons name="event-available" size={26} color={color} />,
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
