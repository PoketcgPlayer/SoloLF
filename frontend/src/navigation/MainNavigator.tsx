import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QuestBoardScreen from '../screens/QuestBoardScreen';
import HunterProfileScreen from '../screens/HunterProfileScreen';
import InventoryScreen from '../screens/InventoryScreen';
import WorkoutDungeonScreen from '../screens/WorkoutDungeonScreen';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Quests') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'Hunter') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'Dungeon') {
              iconName = focused ? 'fitness' : 'fitness-outline';
            } else if (route.name === 'Inventory') {
              iconName = focused ? 'bag' : 'bag-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#00d4ff',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: {
            backgroundColor: '#111',
            borderTopWidth: 1,
            borderTopColor: 'rgba(0, 212, 255, 0.2)',
            paddingBottom: 8,
            paddingTop: 8,
            height: 70,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: '#111',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(0, 212, 255, 0.2)',
          },
          headerTitleStyle: {
            color: '#fff',
            fontSize: 20,
            fontWeight: 'bold',
          },
          headerTintColor: '#00d4ff',
        })}
      >
        <Tab.Screen 
          name="Quests" 
          component={QuestBoardScreen}
          options={{ headerTitle: 'Quest Board' }}
        />
        <Tab.Screen 
          name="Dungeon" 
          component={WorkoutDungeonScreen}
          options={{ headerTitle: 'Workout Dungeon' }}
        />
        <Tab.Screen 
          name="Hunter" 
          component={HunterProfileScreen}
          options={{ headerTitle: 'Hunter Profile' }}
        />
        <Tab.Screen 
          name="Inventory" 
          component={InventoryScreen}
          options={{ headerTitle: 'Inventory' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}