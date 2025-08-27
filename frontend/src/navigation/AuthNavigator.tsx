import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainNavigator from './MainNavigator';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </View>
    );
  }

  return isAuthenticated ? <MainNavigator /> : <AuthStack />;
};

export default function AuthNavigator() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}