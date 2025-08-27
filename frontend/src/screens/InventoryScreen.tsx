import React, { useState } from 'react';
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

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'potion' | 'equipment' | 'boost' | 'cosmetic';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  icon: string;
  color: string;
}

export default function InventoryScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock inventory items - in a real app, this would come from API
  const inventoryItems: InventoryItem[] = [
    {
      id: '1',
      name: 'Protein Potion',
      description: 'Increases strength gain by 20% for next workout',
      type: 'potion',
      rarity: 'common',
      quantity: 5,
      icon: 'fitness',
      color: '#ff6b6b'
    },
    {
      id: '2', 
      name: 'Energy Drink',
      description: 'Restores stamina and provides temporary agility boost',
      type: 'potion',
      rarity: 'rare',
      quantity: 3,
      icon: 'flash',
      color: '#4ecdc4'
    },
    {
      id: '3',
      name: 'Hunter Badge',
      description: 'Shows your dedication to the hunter lifestyle',
      type: 'cosmetic',
      rarity: 'epic',
      quantity: 1,
      icon: 'medal',
      color: '#ffd700'
    },
    {
      id: '4',
      name: 'Shadow Aura',
      description: 'Unlocks at level 50 - Ultimate hunter prestige',
      type: 'cosmetic', 
      rarity: 'legendary',
      quantity: user?.level && user.level >= 50 ? 1 : 0,
      icon: 'flash',
      color: '#9c27b0'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Items', icon: 'grid' },
    { id: 'potion', name: 'Potions', icon: 'flask' },
    { id: 'equipment', name: 'Equipment', icon: 'shield' },
    { id: 'boost', name: 'Boosts', icon: 'trending-up' },
    { id: 'cosmetic', name: 'Cosmetics', icon: 'sparkles' },
  ];

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
      shadowOpacity: 0.6,
      shadowRadius: 8,
    };
  };

  const filteredItems = selectedCategory === 'all' 
    ? inventoryItems.filter(item => item.quantity > 0)
    : inventoryItems.filter(item => item.type === selectedCategory && item.quantity > 0);

  const useItem = (item: InventoryItem) => {
    if (item.type === 'cosmetic') {
      Alert.alert('Cosmetic Item', `${item.name} is equipped and active!`);
    } else {
      Alert.alert('Coming Soon', 'Item usage will be implemented in future updates!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hunter's Inventory</Text>
        <View style={styles.goldContainer}>
          <Ionicons name="diamond" size={16} color="#ffd700" />
          <Text style={styles.goldText}>999 Gold</Text>
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
                size={20} 
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

      {/* Inventory Grid */}
      <ScrollView style={styles.inventoryScrollView} showsVerticalScrollIndicator={false}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bag-outline" size={80} color="#666" />
            <Text style={styles.emptyText}>No items in this category</Text>
            <Text style={styles.emptySubtext}>Complete quests to earn rewards!</Text>
          </View>
        ) : (
          <View style={styles.inventoryGrid}>
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  getRarityGlow(item.rarity),
                  { borderColor: getRarityColor(item.rarity) }
                ]}
                onPress={() => useItem(item)}
              >
                <View style={[styles.itemIconContainer, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon as any} size={32} color={item.color} />
                </View>
                
                <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
                  <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.itemFooter}>
                    <View style={styles.quantityContainer}>
                      <Text style={styles.quantityText}>×{item.quantity}</Text>
                    </View>
                    <Text style={styles.itemType}>{item.type}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Coming Soon Banner */}
      <View style={styles.comingSoonBanner}>
        <Ionicons name="construct" size={20} color="#ff9500" />
        <Text style={styles.comingSoonText}>
          Item crafting & trading system coming soon!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  goldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goldText: {
    color: '#ffd700',
    fontWeight: 'bold',
    marginLeft: 4,
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
  inventoryScrollView: {
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
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    position: 'relative',
  },
  itemIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  itemDescription: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quantityText: {
    color: '#00d4ff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemType: {
    fontSize: 11,
    color: '#999',
    textTransform: 'capitalize',
  },
  comingSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    padding: 12,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  comingSoonText: {
    color: '#ff9500',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
});