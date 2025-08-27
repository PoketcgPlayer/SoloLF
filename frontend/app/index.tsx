import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AuthNavigator from '../src/navigation/AuthNavigator';

export default function Index() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0a0a0a" />
      <AuthNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});