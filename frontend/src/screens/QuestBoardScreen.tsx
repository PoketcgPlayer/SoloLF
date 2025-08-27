import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Cross-platform storage utilities
const StorageUtils = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('localStorage not available:', error);
        return null;
      }
    } else {
      try {
        const * as SecureStore from 'expo-secure-store';
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.warn('SecureStore not available:', error);
        return null;
      }
    }
  }
};

interface Quest {
  id: string;
  title: string;
  description: string;
  exercise_type: string;
  target_value: number;
  current_progress: number;
  xp_reward: number;
  gold_reward: number;
  status: string;
}

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function QuestBoardScreen() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/quests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const questData = await response.json();
        setQuests(questData);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateDailyQuests = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/quests/daily/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'New daily quests generated!');
        fetchQuests();
      } else {
        Alert.alert('Error', 'Failed to generate quests');
      }
    } catch (error) {
      console.error('Failed to generate quests:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuests();
  };

  const getProgressBarWidth = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getQuestIcon = (exerciseType: string) => {
    switch (exerciseType) {
      case 'push_ups': return 'fitness';
      case 'running': return 'walk';
      case 'water_intake': return 'water';
      case 'sit_ups': return 'body';
      case 'gym_session': return 'barbell';
      default: return 'checkmark-circle';
    }
  };

  const getQuestColor = (exerciseType: string) => {
    switch (exerciseType) {
      case 'push_ups': return '#ff6b6b';
      case 'running': return '#4ecdc4';
      case 'water_intake': return '#45b7d1';
      case 'sit_ups': return '#96ceb4';
      case 'gym_session': return '#feca57';
      default: return '#00d4ff';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d4ff" />
        <Text style={styles.loadingText}>Loading quests...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back, {user?.username}!</Text>
          <Text style={styles.levelText}>Level {user?.level} Hunter</Text>
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>{user?.xp || 0} / {(user?.xp || 0) + (user?.xp_to_next_level || 100)} XP</Text>
            <View style={styles.xpBar}>
              <View 
                style={[
                  styles.xpProgress, 
                  { width: `${((user?.xp || 0) / ((user?.xp || 0) + (user?.xp_to_next_level || 100))) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        <View style={styles.questSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Quests</Text>
            <TouchableOpacity onPress={generateDailyQuests} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color="#00d4ff" />
            </TouchableOpacity>
          </View>

          {quests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={60} color="#666" />
              <Text style={styles.emptyText}>No active quests</Text>
              <TouchableOpacity onPress={generateDailyQuests} style={styles.generateButton}>
                <Text style={styles.generateButtonText}>Generate Daily Quests</Text>
              </TouchableOpacity>
            </View>
          ) : (
            quests.map((quest) => (
              <View key={quest.id} style={styles.questCard}>
                <View style={styles.questHeader}>
                  <View style={[styles.questIcon, { backgroundColor: `${getQuestColor(quest.exercise_type)}20` }]}>
                    <Ionicons name={getQuestIcon(quest.exercise_type)} size={24} color={getQuestColor(quest.exercise_type)} />
                  </View>
                  <View style={styles.questInfo}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Text style={styles.questDescription}>{quest.description}</Text>
                  </View>
                  <View style={styles.questRewards}>
                    <Text style={styles.xpReward}>+{quest.xp_reward} XP</Text>
                    <Text style={styles.goldReward}>+{quest.gold_reward} Gold</Text>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressText}>
                      {quest.current_progress} / {quest.target_value}
                    </Text>
                    <Text style={styles.progressPercent}>
                      {Math.round((quest.current_progress / quest.target_value) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${getProgressBarWidth(quest.current_progress, quest.target_value)}%`,
                          backgroundColor: getQuestColor(quest.exercise_type)
                        }
                      ]} 
                    />
                  </View>
                </View>

                {quest.current_progress >= quest.target_value && (
                  <View style={styles.completedBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.completedText}>Quest Completed!</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  levelText: {
    fontSize: 16,
    color: '#00d4ff',
    marginBottom: 12,
  },
  xpContainer: {
    marginTop: 8,
  },
  xpText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  xpBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpProgress: {
    height: '100%',
    backgroundColor: '#00d4ff',
    borderRadius: 4,
  },
  questSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  questCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  questIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questInfo: {
    flex: 1,
    marginRight: 12,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  questDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  questRewards: {
    alignItems: 'flex-end',
  },
  xpReward: {
    fontSize: 12,
    color: '#00d4ff',
    fontWeight: 'bold',
  },
  goldReward: {
    fontSize: 12,
    color: '#ffd700',
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#ccc',
  },
  progressPercent: {
    fontSize: 14,
    color: '#00d4ff',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});