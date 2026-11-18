import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Host, Icon, Text } from '@expo/ui';
import { NavigationBar, NavigationBarItem } from '@expo/ui/jetpack-compose';

const TABS = [
  { id: 'Home', icon: require('@expo/material-symbols/home.xml') },
  { id: 'Search', icon: require('@expo/material-symbols/search.xml') },
  { id: 'Your Library', icon: require('@expo/material-symbols/library_music.xml') },
  { id: 'Create', icon: require('@expo/material-symbols/add.xml') },
];
const close = require('@expo/material-symbols/close.xml');
const colors = { selectedIconColor: '#FFFFFF', selectedTextColor: '#FFFFFF', selectedIndicatorColor: '#333333', unselectedIconColor: '#B3B3B3', unselectedTextColor: '#B3B3B3' };

export default function NavigationTabs({ activeTab, onSelectTab, isCreateModalOpen = false }) {
  const { width, fontScale } = useWindowDimensions();
  const labelStyle = width <= 340 && fontScale >= 1.2 ? styles.compactLabel : styles.label;
  return (
    <Host colorScheme="dark" style={styles.host}>
      <NavigationBar containerColor="#000000" contentColor="#FFFFFF" tonalElevation={0}>
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          const closing = isCreateModalOpen && tab.id === 'Create';
          return (
            <NavigationBarItem key={tab.id} selected={selected} colors={colors} onClick={() => onSelectTab?.(tab.id)}>
              <NavigationBarItem.Icon><Icon name={closing ? close : tab.icon} size={24} color={selected ? '#FFFFFF' : '#B3B3B3'} /></NavigationBarItem.Icon>
              <NavigationBarItem.Label><Text numberOfLines={1} textStyle={labelStyle}>{closing ? 'Close Create' : tab.id}</Text></NavigationBarItem.Label>
            </NavigationBarItem>
          );
        })}
      </NavigationBar>
    </Host>
  );
}
const styles = StyleSheet.create({ host: { width: '100%', height: 80 }, label: { fontSize: 12 }, compactLabel: { fontSize: 10 } });
