import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
  gold_reward: number;
  icon: string;
  rarity: string;
  created_at: string;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string | null;
  current_progress: number;
  completed: boolean;
}

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All', icon: 'grid' },
    { id: 'workout', name: 'Workouts', icon: 'fitness' },
    { id: 'quest', name: 'Quests', icon: 'trophy' },
    { id: 'level', name: 'Levels', icon: 'trending-up' },
    { id: 'exercise', name: 'Exercises', icon: 'barbell' },
    { id: 'streak', name: 'Streaks', icon: 'flame' },
  ];

  const fetchAchievements = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const [achievementsRes, userAchievementsRes] = await Promise.all([
        fetch(`${import.meta.env.REACT_APP_BACKEND_URL}/api/achievements`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.REACT_APP_BACKEND_URL}/api/achievements/user`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (achievementsRes.ok && userAchievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        const userAchievementsData = await userAchievementsRes.json();
        
        setAchievements(achievementsData);
        setUserAchievements(userAchievementsData);
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      Alert.alert('Error', 'Failed to load achievements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAchievements();
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#9c27b0';
      case 'epic': return '#673ab7';
      case 'rare': return '#2196f3';
      case 'common': return '#4caf50';
      default: return '#666';
    }
  };

  const getRarityGlow = (rarity: string) => {
    const color = getRarityColor(rarity);
    return {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
    };
  };

  const getIconForCategory = (category: string, icon: string) => {
    // Map achievement icons to Ionicons
    const iconMap: { [key: string]: string } = {
      footsteps: 'footsteps',
      fitness: 'fitness',
      walk: 'walk',
      trophy: 'trophy',
      flame: 'flame',
      medal: 'medal',
      shield: 'shield',
      star: 'star',
      flash: 'flash',
    };
    return iconMap[icon] || 'trophy';
  };

  const getAchievementProgress = (achievementId: string) => {
    return userAchievements.find(ua => ua.achievement_id === achievementId);
  };

  const getProgressPercentage = (achievement: Achievement) => {
    const userProgress = getAchievementProgress(achievement.id);
    if (!userProgress) return 0;
    return Math.min((userProgress.current_progress / achievement.requirement_value) * 100, 100);
  };

  const isCompleted = (achievement: Achievement) => {
    const userProgress = getAchievementProgress(achievement.id);
    return userProgress?.completed || false;
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const completedCount = achievements.filter(achievement => isCompleted(achievement)).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={styles.loadingText}>Loading Achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
    const progress = getAchievementProgress(achievement.id);
    const completed = isCompleted(achievement);
    const progressPercentage = getProgressPercentage(achievement);

    return (
      <TouchableOpacity
        style={[
          styles.achievementCard,
          completed && getRarityGlow(achievement.rarity),
          { 
            borderColor: completed ? getRarityColor(achievement.rarity) : 'rgba(255, 255, 255, 0.1)',
            opacity: completed ? 1 : 0.8 
          }
        ]}
        onPress={() => {
          const status = completed ? 'Completed!' : `Progress: ${progress?.current_progress || 0}/${achievement.requirement_value}`;
          Alert.alert(achievement.name, `${achievement.description}\n\n${status}\n\nRewards: ${achievement.xp_reward} XP, ${achievement.gold_reward} Gold`);
        }}
      >
        <View style={styles.achievementHeader}>
          <View style={[
            styles.achievementIcon,
            { backgroundColor: `${getRarityColor(achievement.rarity)}20` }
          ]}>
            <Ionicons 
              name={getIconForCategory(achievement.category, achievement.icon) as any}
              size={32} 
              color={completed ? getRarityColor(achievement.rarity) : '#666'} 
            />
          </View>
          
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(achievement.rarity) }]}>
            <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
          </View>

          {completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
            </View>
          )}
        </View>

        <View style={styles.achievementInfo}>
          <Text style={[styles.achievementName, completed && styles.completedText]}>
            {achievement.name}
          </Text>
          <Text style={styles.achievementDescription} numberOfLines={2}>
            {achievement.description}
          </Text>
          
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progressPercentage}%`,
                    backgroundColor: completed ? getRarityColor(achievement.rarity) : '#00d4ff'
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {progress?.current_progress || 0} / {achievement.requirement_value}
            </Text>
          </View>

          <View style={styles.achievementFooter}>
            <View style={styles.rewards}>
              <View style={styles.rewardItem}>
                <Ionicons name="star" size={16} color="#ffd700" />
                <Text style={styles.rewardText}>{achievement.xp_reward} XP</Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="diamond" size={16} color="#ffd700" />
                <Text style={styles.rewardText}>{achievement.gold_reward} Gold</Text>
              </View>
            </View>
            <Text style={styles.categoryText}>{achievement.category}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressHeaderText}>
            {completedCount} / {totalCount} Completed
          </Text>
          <View style={styles.overallProgressBar}>
            <View 
              style={[
                styles.overallProgressFill,
                { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView}>
        <View style={styles.categoryContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryTab,
                selectedCategory === category.id && styles.activeCategoryTab
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons 
                name={category.icon as any} 
                size={18} 
                color={selectedCategory === category.id ? '#000' : '#666'} 
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.activeCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Achievements List */}
      <ScrollView 
        style={styles.achievementsScrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#00d4ff"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredAchievements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={80} color="#666" />
            <Text style={styles.emptyText}>No achievements in this category</Text>
            <Text style={styles.emptySubtext}>Keep completing quests to unlock achievements!</Text>
          </View>
        ) : (
          <View style={styles.achievementsGrid}>
            {filteredAchievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </View>
        )}
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
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressHeaderText: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  overallProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#00d4ff',
    borderRadius: 4,
  },
  categoryScrollView: {
    maxHeight: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeCategoryTab: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  categoryText: {
    color: '#666',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  activeCategoryText: {
    color: '#000',
  },
  achievementsScrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  achievementsGrid: {
    gap: 16,
  },
  achievementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    position: 'relative',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rarityBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  completedBadge: {
    position: 'absolute',
    top: -8,
    left: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    padding: 2,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  completedText: {
    color: '#4caf50',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
    lineHeight: 18,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewards: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 11,
    color: '#999',
    textTransform: 'capitalize',
  },
});