import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function HunterProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getAvatarColor = (tier: string) => {
    switch (tier) {
      case 'Shadow': return '#9c27b0';
      case 'Diamond': return '#00d4ff';
      case 'Gold': return '#ffd700';
      case 'Silver': return '#c0c0c0';
      default: return '#cd7f32';
    }
  };

  const getAvatarIcon = (tier: string) => {
    switch (tier) {
      case 'Shadow': return 'flash';
      case 'Diamond': return 'diamond';
      case 'Gold': return 'star';
      case 'Silver': return 'medal';
      default: return 'person';
    }
  };

  const StatCard = ({ icon, label, value, color = '#00d4ff' }: {
    icon: string;
    label: string;
    value: number | string;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { borderColor: getAvatarColor(user?.avatar_tier || 'Bronze') }]}>
            <Ionicons 
              name={getAvatarIcon(user?.avatar_tier || 'Bronze')} 
              size={60} 
              color={getAvatarColor(user?.avatar_tier || 'Bronze')} 
            />
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.hunterRank}>{user?.avatar_tier} Rank Hunter</Text>
          <View style={styles.levelContainer}>
            <Text style={styles.levelText}>Level {user?.level}</Text>
          </View>
        </View>

        {/* XP Progress */}
        <View style={styles.xpSection}>
          <Text style={styles.sectionTitle}>Experience Points</Text>
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>
              {user?.xp || 0} / {(user?.xp || 0) + (user?.xp_to_next_level || 100)} XP
            </Text>
            <View style={styles.xpBar}>
              <View 
                style={[
                  styles.xpProgress, 
                  { width: `${((user?.xp || 0) / ((user?.xp || 0) + (user?.xp_to_next_level || 100))) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.xpToNext}>
              {user?.xp_to_next_level} XP to next level
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Hunter Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="fitness" 
              label="Strength" 
              value={user?.strength || 10}
              color="#ff6b6b"
            />
            <StatCard 
              icon="flash" 
              label="Agility" 
              value={user?.agility || 10}
              color="#4ecdc4"
            />
            <StatCard 
              icon="heart" 
              label="Stamina" 
              value={user?.stamina || 10}
              color="#45b7d1"
            />
            <StatCard 
              icon="shield" 
              label="Vitality" 
              value={user?.vitality || 10}
              color="#96ceb4"
            />
          </View>
        </View>

        {/* Progress Stats */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.progressStats}>
            <View style={styles.progressItem}>
              <Ionicons name="trophy" size={24} color="#ffd700" />
              <View style={styles.progressInfo}>
                <Text style={styles.progressValue}>{user?.total_quests_completed || 0}</Text>
                <Text style={styles.progressLabel}>Quests Completed</Text>
              </View>
            </View>
            
            <View style={styles.progressItem}>
              <Ionicons name="barbell" size={24} color="#ff6b6b" />
              <View style={styles.progressInfo}>
                <Text style={styles.progressValue}>{user?.total_workouts || 0}</Text>
                <Text style={styles.progressLabel}>Workouts Logged</Text>
              </View>
            </View>
            
            <View style={styles.progressItem}>
              <Ionicons name="flame" size={24} color="#ff9500" />
              <View style={styles.progressInfo}>
                <Text style={styles.progressValue}>{user?.current_streak || 0}</Text>
                <Text style={styles.progressLabel}>Day Streak</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Settings feature coming soon!')}>
            <Ionicons name="settings" size={20} color="#00d4ff" />
            <Text style={styles.actionButtonText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Achievements feature coming soon!')}>
            <Ionicons name="medal" size={20} color="#00d4ff" />
            <Text style={styles.actionButtonText}>Achievements</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#ff6b6b" />
            <Text style={[styles.actionButtonText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 16,
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  hunterRank: {
    fontSize: 16,
    color: '#00d4ff',
    marginBottom: 12,
  },
  levelContainer: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  xpSection: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  xpContainer: {
    alignItems: 'center',
  },
  xpText: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 12,
  },
  xpBar: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpProgress: {
    height: '100%',
    backgroundColor: '#00d4ff',
    borderRadius: 6,
  },
  xpToNext: {
    fontSize: 14,
    color: '#666',
  },
  statsSection: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressSection: {
    padding: 20,
  },
  progressStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressInfo: {
    marginLeft: 16,
    flex: 1,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  actionsSection: {
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    borderColor: 'rgba(255, 107, 107, 0.3)',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  logoutText: {
    color: '#ff6b6b',
  },
});