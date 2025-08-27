import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
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
        const SecureStore = require('expo-secure-store');
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

export default function WorkoutDungeonScreen() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [workoutValue, setWorkoutValue] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      const token = await StorageUtils.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/quests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const questData = await response.json();
        setQuests(questData.filter((quest: Quest) => quest.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = (quest: Quest) => {
    setSelectedQuest(quest);
    setWorkoutValue('');
    setWorkoutNotes('');
    setIsModalVisible(true);
  };

  const submitWorkout = async () => {
    if (!selectedQuest || !workoutValue) {
      Alert.alert('Error', 'Please enter a workout value');
      return;
    }

    const value = parseInt(workoutValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/workouts/log?quest_id=${selectedQuest.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exercise_type: selectedQuest.exercise_type,
          value: value,
          notes: workoutNotes || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        setIsModalVisible(false);
        
        if (result.quest_completed) {
          Alert.alert(
            '🎉 Quest Completed!',
            `Congratulations! You've earned ${selectedQuest.xp_reward} XP and ${selectedQuest.gold_reward} gold!`,
            [{ text: 'Awesome!', onPress: () => {} }]
          );
        } else {
          Alert.alert(
            'Workout Logged!',
            `Progress: ${result.new_progress}/${result.target}`,
            [{ text: 'Keep Going!', onPress: () => {} }]
          );
        }
        
        // Refresh data
        await fetchQuests();
        await refreshUser();
      } else {
        Alert.alert('Error', 'Failed to log workout');
      }
    } catch (error) {
      console.error('Failed to log workout:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getExerciseUnit = (exerciseType: string) => {
    switch (exerciseType) {
      case 'push_ups':
      case 'sit_ups': return 'reps';
      case 'running': return 'miles';
      case 'water_intake': return 'glasses';
      case 'gym_session': return 'minutes';
      default: return 'units';
    }
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
        <Text style={styles.loadingText}>Loading dungeon...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚔️ Battle Arena</Text>
          <Text style={styles.headerSubtitle}>Select your quest and begin the battle!</Text>
        </View>

        {quests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={80} color="#666" />
            <Text style={styles.emptyText}>No active quests</Text>
            <Text style={styles.emptySubtext}>Visit the Quest Board to get started!</Text>
          </View>
        ) : (
          <View style={styles.questList}>
            {quests.map((quest) => (
              <View key={quest.id} style={styles.questCard}>
                <View style={styles.questHeader}>
                  <View style={[styles.questIcon, { backgroundColor: `${getQuestColor(quest.exercise_type)}20` }]}>
                    <Ionicons name={getQuestIcon(quest.exercise_type)} size={28} color={getQuestColor(quest.exercise_type)} />
                  </View>
                  <View style={styles.questInfo}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Text style={styles.questDescription}>{quest.description}</Text>
                    <View style={styles.questMeta}>
                      <Text style={styles.questProgress}>
                        {quest.current_progress} / {quest.target_value} {getExerciseUnit(quest.exercise_type)}
                      </Text>
                      <View style={styles.rewards}>
                        <Text style={styles.xpReward}>+{quest.xp_reward} XP</Text>
                        <Text style={styles.goldReward}>+{quest.gold_reward} Gold</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${Math.min((quest.current_progress / quest.target_value) * 100, 100)}%`,
                          backgroundColor: getQuestColor(quest.exercise_type)
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressPercent}>
                    {Math.round((quest.current_progress / quest.target_value) * 100)}%
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.startButton,
                    { backgroundColor: getQuestColor(quest.exercise_type) },
                    quest.current_progress >= quest.target_value && styles.completedButton
                  ]}
                  onPress={() => startWorkout(quest)}
                  disabled={quest.current_progress >= quest.target_value}
                >
                  <Ionicons 
                    name={quest.current_progress >= quest.target_value ? "checkmark-circle" : "play"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.startButtonText}>
                    {quest.current_progress >= quest.target_value ? 'Completed' : 'Start Battle'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Workout Logging Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Workout</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedQuest && (
              <>
                <View style={styles.modalQuestInfo}>
                  <Text style={styles.modalQuestTitle}>{selectedQuest.title}</Text>
                  <Text style={styles.modalQuestDescription}>
                    Target: {selectedQuest.target_value} {getExerciseUnit(selectedQuest.exercise_type)}
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    How many {getExerciseUnit(selectedQuest.exercise_type)} did you complete?
                  </Text>
                  <TextInput
                    style={styles.workoutInput}
                    value={workoutValue}
                    onChangeText={setWorkoutValue}
                    placeholder={`Enter ${getExerciseUnit(selectedQuest.exercise_type)}`}
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.workoutInput, styles.notesInput]}
                    value={workoutNotes}
                    onChangeText={setWorkoutNotes}
                    placeholder="How did it feel? Any observations..."
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.submitButton, submitting && styles.disabledButton]}
                  onPress={submitWorkout}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Log Workout</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    marginTop: 16,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  questList: {
    padding: 16,
  },
  questCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  questIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  questDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  questMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questProgress: {
    fontSize: 14,
    color: '#00d4ff',
    fontWeight: 'bold',
  },
  rewards: {
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 14,
    color: '#00d4ff',
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalQuestInfo: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  modalQuestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  modalQuestDescription: {
    fontSize: 14,
    color: '#00d4ff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  workoutInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#00d4ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});