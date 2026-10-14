import React, { memo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { Colors } from '../../constants/theme';

type TabIcon = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ITEMS: { name: string; title: string; icon: TabIcon; iconFocused: TabIcon }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'belajar', title: 'Belajar', icon: 'book-outline', iconFocused: 'book' },
  { name: 'riyadhoh', title: 'Riyadhoh', icon: 'checkmark-circle-outline', iconFocused: 'checkmark-circle' },
  { name: 'event', title: 'Event', icon: 'calendar-outline', iconFocused: 'calendar' },
  { name: 'profile', title: 'Profil', icon: 'person-outline', iconFocused: 'person' },
];

function TabsLayout() {
  const theme = useAppStore((s) => s.theme);
  const colors = Colors[theme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme === 'dark' ? '#7DD3FC' : '#0077B6',
        tabBarInactiveTintColor: theme === 'dark' ? '#8BC9E8' : '#4A90B8',
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === 'ios' ? 72 : 48}
            tint={theme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          backgroundColor: theme === 'dark' ? 'rgba(23, 35, 38, 0.62)' : 'rgba(255, 255, 255, 0.62)',
          borderRadius: 24,
          borderTopColor: colors.border,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.9)',
          overflow: 'hidden',
          height: Platform.OS === 'ios' ? 108 : 80,
          paddingBottom: Platform.OS === 'ios' ? 22 : 6,
          paddingHorizontal: 6,
          paddingTop: 6,
          shadowColor: theme === 'dark' ? '#000' : '#6B8792',
          shadowOpacity: theme === 'dark' ? 0.3 : 0.2,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        },
        tabBarItemStyle: {
          flex: 1,
          marginVertical: 3,
          marginHorizontal: 3,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme === 'dark' ? 'rgba(125, 211, 252, 0.28)' : 'rgba(0, 119, 182, 0.24)',
          transform: [{ translateY: 8 }],
        },
        tabBarActiveBackgroundColor: theme === 'dark' ? 'rgba(125, 211, 252, 0.16)' : 'rgba(255, 255, 255, 0.58)',
        tabBarIconStyle: { marginTop: 1 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', lineHeight: 12, marginBottom: 1 },
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
      {/* Hide old tabs that are now sub-screens */}
      <Tabs.Screen name="quran" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
    </Tabs>
  );
}

export default memo(TabsLayout);
