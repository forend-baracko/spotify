import React from 'react';
import { StyleSheet, Text } from 'react-native';

const LEGACY_GLYPHS = {
  home: '🏠',
  search: '🔍',
  library: '❙❙❚',
  add: '➕',
  close: '✕',
  play: '▶',
  pause: '⏸',
  previous: '⏮', next: '⏭', shuffle: '🔀', repeat: '🔁', repeatOne: '🔂',
  favorite: '♡', collapse: '⌵', more: '•••', queue: '≡',
  playlistAdd: '➕', share: '↗', delete: '🗑️', music: '♪', back: '‹', forward: '›',
  check: '✓', person: '👤', settings: '⚙', history: '◷', stats: '▥',
  visibility: 'Show', visibilityOff: 'Hide',
  devices: '📱',
};

export default function AppIcon({ name, color = '#B3B3B3' }) {
  const isClose = name === 'close';
  return (
    <Text style={[isClose ? styles.closeIcon : styles.tabIcon, { color }]}>
      {LEGACY_GLYPHS[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 18,
    marginBottom: 3,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
