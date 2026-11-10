import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Host, Icon } from '@expo/ui';

const ICONS = {
  home: require('@expo/material-symbols/home.xml'),
  search: require('@expo/material-symbols/search.xml'),
  library: require('@expo/material-symbols/library_music.xml'),
  add: require('@expo/material-symbols/add.xml'),
  close: require('@expo/material-symbols/close.xml'),
  play: require('@expo/material-symbols/play_arrow.xml'),
  pause: require('@expo/material-symbols/pause.xml'),
  previous: require('@expo/material-symbols/skip_previous.xml'),
  next: require('@expo/material-symbols/skip_next.xml'),
  shuffle: require('@expo/material-symbols/shuffle.xml'),
  repeat: require('@expo/material-symbols/repeat.xml'),
  repeatOne: require('@expo/material-symbols/repeat_one.xml'),
  favorite: require('@expo/material-symbols/favorite.xml'),
  collapse: require('@expo/material-symbols/keyboard_arrow_down.xml'),
  more: require('@expo/material-symbols/more_horiz.xml'),
  queue: require('@expo/material-symbols/queue_music.xml'),
  playlistAdd: require('@expo/material-symbols/playlist_add.xml'),
  share: require('@expo/material-symbols/share.xml'),
  delete: require('@expo/material-symbols/delete.xml'),
  music: require('@expo/material-symbols/music_note.xml'),
  back: require('@expo/material-symbols/chevron_left.xml'),
  forward: require('@expo/material-symbols/chevron_right.xml'),
  check: require('@expo/material-symbols/check.xml'),
  person: require('@expo/material-symbols/person.xml'),
  settings: require('@expo/material-symbols/settings.xml'),
  history: require('@expo/material-symbols/history.xml'),
  stats: require('@expo/material-symbols/bar_chart.xml'),
  devices: require('@expo/material-symbols/devices.xml'),
  visibility: require('@expo/material-symbols/visibility.xml'),
  visibilityOff: require('@expo/material-symbols/visibility_off.xml'),
};

export default function AppIcon({ name, size = 20, color = '#B3B3B3', style }) {
  const frameSize = size < 20 ? size : Math.max(24, size);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.iconFrame, { width: frameSize, height: frameSize }, style]}
    >
      <Host matchContents style={{ width: frameSize, height: frameSize }}>
        <Icon name={ICONS[name]} size={size} color={color} />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  iconFrame: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
