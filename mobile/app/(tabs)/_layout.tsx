import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useAuth } from '../../src/store/AuthStore'
import { Ionicons } from '@expo/vector-icons'

function TabIcon({ icon, focused }: { icon: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <Ionicons
      name={icon}
      size={22}
      color={focused ? '#059669' : '#94a3b8'}
      style={{ opacity: focused ? 1 : 0.7 }}
    />
  )
}

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  )
}

export default function TabLayout() {
  const { usuario, listarPendentes } = useAuth()
  const isAdmin = usuario?.perfil === 'ADMIN'
  const pendentes = listarPendentes()
  const pendentesCount = pendentes.length

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: '#f0fdf4' },
        headerTintColor: '#065f46',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Painel',
          tabBarIcon: ({ focused }) => <TabIcon icon="stats-chart-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => <TabIcon icon="map-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="comercios"
        options={{
          title: 'Comércios',
          tabBarIcon: ({ focused }) => <TabIcon icon="storefront-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="freelancers"
        options={{
          title: 'Freelancers',
          tabBarIcon: ({ focused }) => <TabIcon icon="people-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="casas"
        options={{
          title: 'Casas',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon icon="home-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="familias"
        options={{
          title: 'Famílias',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon icon="heart-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="aprovacoes"
        options={{
          title: 'Aprovações',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon icon="checkmark-circle-outline" focused={focused} />
              <TabBadge count={pendentesCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="busca"
        options={{
          title: 'Censo',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon icon="search-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused }) => <TabIcon icon="settings-outline" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
})
