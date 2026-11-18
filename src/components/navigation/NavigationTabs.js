import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SPACE } from '../../constants/theme';
import AppIcon from '../icons/AppIcon';

const tabs = [
  { id: 'Home', icon: 'home' },
  { id: 'Search', icon: 'search' },
  { id: 'Your Library', icon: 'library' },
  { id: 'Create', icon: 'add' },
];
export default function NavigationTabs({ activeTab, onSelectTab, isCreateModalOpen = false }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        const closing = isCreateModalOpen && tab.id === 'Create';
        return (
          <TouchableOpacity key={tab.id} style={styles.tab} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={closing ? 'Close Create' : tab.id}
            accessibilityState={{ selected }} onPress={() => onSelectTab?.(tab.id)}>
            {closing ? (
              <View style={styles.closeCircle}><AppIcon name="close" size={16} color="#000000" /></View>
            ) : (
              <><AppIcon name={tab.icon} size={20} color={selected ? '#FFFFFF' : '#B3B3B3'} />
                <Text style={[styles.label, selected && styles.active]} numberOfLines={1}>{tab.id}</Text></>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', height: 62, backgroundColor: '#000000', borderTopWidth: 0.5, borderTopColor: '#1A1A1A', paddingHorizontal: SPACE?.sm || 8, paddingBottom: 4, alignItems: 'center', justifyContent: 'space-around' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  label: { color: '#B3B3B3', fontSize: 10, fontWeight: '500' },
  active: { color: '#FFFFFF', fontWeight: 'bold' },
  closeCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
});
