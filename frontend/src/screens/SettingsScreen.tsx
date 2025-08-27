import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface UserSettings {
  notification_quest_reminders: boolean;
  notification_level_up: boolean;
  notification_achievement_unlock: boolean;
  privacy_profile_visible: boolean;
  privacy_stats_visible: boolean;
  app_theme: string;
  app_units: string;
  app_language: string;
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const settingsData = await response.json();
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updatedSettings: Partial<UserSettings>) => {
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        setSettings(prev => prev ? { ...prev, ...updatedSettings } : null);
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onPress, 
    type = 'toggle',
    options,
    rightComponent 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value?: any;
    onPress?: () => void;
    type?: 'toggle' | 'select' | 'button' | 'info';
    options?: { label: string; value: string }[];
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      style={styles.settingRow} 
      onPress={onPress}
      disabled={type === 'toggle' || type === 'info'}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={24} color="#00d4ff" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {type === 'toggle' && (
          <Switch
            value={value}
            onValueChange={onPress}
            trackColor={{ false: '#767577', true: '#00d4ff' }}
            thumbColor={value ? '#fff' : '#f4f3f4'}
            disabled={saving}
          />
        )}
        {type === 'select' && (
          <View style={styles.selectContainer}>
            <Text style={styles.selectValue}>{value}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        )}
        {type === 'button' && (
          <Ionicons name="chevron-forward" size={20} color="#666" />
        )}
        {type === 'info' && rightComponent}
      </View>
    </TouchableOpacity>
  );

  const showThemeSelector = () => {
    Alert.alert(
      'Select Theme',
      'Choose your preferred theme',
      [
        { text: 'Dark', onPress: () => updateSettings({ app_theme: 'dark' }) },
        { text: 'Light', onPress: () => updateSettings({ app_theme: 'light' }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const showUnitsSelector = () => {
    Alert.alert(
      'Select Units',
      'Choose your preferred measurement system',
      [
        { text: 'Metric', onPress: () => updateSettings({ app_units: 'metric' }) },
        { text: 'Imperial', onPress: () => updateSettings({ app_units: 'imperial' }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const showLanguageSelector = () => {
    Alert.alert(
      'Select Language',
      'Choose your preferred language',
      [
        { text: 'English', onPress: () => updateSettings({ app_language: 'en' }) },
        { text: 'Spanish', onPress: () => updateSettings({ app_language: 'es' }) },
        { text: 'French', onPress: () => updateSettings({ app_language: 'fr' }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={styles.loadingText}>Loading Settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <SettingRow
            icon="person"
            title="Username"
            subtitle={user?.username || 'Hunter'}
            type="info"
            rightComponent={<Text style={styles.infoValue}>{user?.username || 'Hunter'}</Text>}
          />
          
          <SettingRow
            icon="mail"
            title="Email"
            subtitle={user?.email || 'hunter@example.com'}
            type="info"
            rightComponent={<Text style={styles.infoValue}>{user?.email || 'hunter@example.com'}</Text>}
          />
          
          <SettingRow
            icon="trophy"
            title="Level"
            subtitle={`Level ${user?.level || 1} ${user?.avatar_tier || 'Bronze'} Hunter`}
            type="info"
            rightComponent={<Text style={styles.infoValue}>Level {user?.level || 1}</Text>}
          />
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <SettingRow
            icon="notifications"
            title="Quest Reminders"
            subtitle="Get notified about daily quests"
            type="toggle"
            value={settings.notification_quest_reminders}
            onPress={() => updateSettings({ 
              notification_quest_reminders: !settings.notification_quest_reminders 
            })}
          />
          
          <SettingRow
            icon="trending-up"
            title="Level Up Alerts"
            subtitle="Notifications when you level up"
            type="toggle"
            value={settings.notification_level_up}
            onPress={() => updateSettings({ 
              notification_level_up: !settings.notification_level_up 
            })}
          />
          
          <SettingRow
            icon="medal"
            title="Achievement Unlocks"
            subtitle="Get notified about new achievements"
            type="toggle"
            value={settings.notification_achievement_unlock}
            onPress={() => updateSettings({ 
              notification_achievement_unlock: !settings.notification_achievement_unlock 
            })}
          />
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <SettingRow
            icon="eye"
            title="Profile Visibility"
            subtitle="Allow others to see your profile"
            type="toggle"
            value={settings.privacy_profile_visible}
            onPress={() => updateSettings({ 
              privacy_profile_visible: !settings.privacy_profile_visible 
            })}
          />
          
          <SettingRow
            icon="stats-chart"
            title="Stats Visibility"
            subtitle="Show your stats to other hunters"
            type="toggle"
            value={settings.privacy_stats_visible}
            onPress={() => updateSettings({ 
              privacy_stats_visible: !settings.privacy_stats_visible 
            })}
          />
        </View>

        {/* App Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <SettingRow
            icon="color-palette"
            title="Theme"
            subtitle="Choose your preferred theme"
            type="select"
            value={settings.app_theme === 'dark' ? 'Dark' : 'Light'}
            onPress={showThemeSelector}
          />
          
          <SettingRow
            icon="resize"
            title="Units"
            subtitle="Measurement system"
            type="select"
            value={settings.app_units === 'metric' ? 'Metric' : 'Imperial'}
            onPress={showUnitsSelector}
          />
          
          <SettingRow
            icon="language"
            title="Language"
            subtitle="App language"
            type="select"
            value={settings.app_language === 'en' ? 'English' : settings.app_language === 'es' ? 'Spanish' : 'French'}
            onPress={showLanguageSelector}
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingRow
            icon="help-circle"
            title="Help & FAQ"
            subtitle="Get help and find answers"
            type="button"
            onPress={() => Alert.alert('Coming Soon', 'Help section coming in future updates!')}
          />
          
          <SettingRow
            icon="bug"
            title="Report a Bug"
            subtitle="Let us know about issues"
            type="button"
            onPress={() => Alert.alert('Coming Soon', 'Bug reporting coming soon!')}
          />
          
          <SettingRow
            icon="star"
            title="Rate the App"
            subtitle="Share your feedback"
            type="button"
            onPress={() => Alert.alert('Coming Soon', 'App rating coming soon!')}
          />
        </View>

        {/* Account Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={[styles.settingRow, styles.dangerRow]} onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, styles.dangerIcon]}>
                <Ionicons name="log-out" size={24} color="#ff6b6b" />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, styles.dangerText]}>Logout</Text>
                <Text style={styles.settingSubtitle}>Sign out of your account</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Saving Indicator */}
        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color="#00d4ff" />
            <Text style={styles.savingText}>Saving...</Text>
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    margin: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00d4ff',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  dangerText: {
    color: '#ff6b6b',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  settingRight: {
    alignItems: 'center',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectValue: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#00d4ff',
    fontWeight: '500',
  },
  dangerRow: {
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  savingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  savingText: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '500',
  },
});