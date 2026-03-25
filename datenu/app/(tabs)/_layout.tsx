import { Tabs } from 'expo-router';
import { Heart, Calendar, User } from 'phosphor-react-native';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="dates"
        options={{
          title: 'Dates',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} weight="fill" />,
        }}
      />
    </Tabs>
  );
}
