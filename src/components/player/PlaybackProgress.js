import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PlaybackProgress({ currentTime, duration, onSeek, formatTime }) {
  const percent = Math.min(100, Math.max(0, ((currentTime || 0) / (duration || 230)) * 100));
  return (
    <TouchableOpacity activeOpacity={1} style={styles.container} onPress={(event) => onSeek(Math.max(0, Math.min(1, event.nativeEvent.locationX / 320)) * duration)}>
      <View style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /><View style={[styles.knob, { left: `${percent}%` }]} /></View>
      <View style={styles.times}><Text style={styles.time}>{formatTime(currentTime)}</Text><Text style={styles.time}>-{formatTime(Math.max(0, duration - currentTime))}</Text></View>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: { marginBottom: 20, paddingVertical: 4 },
  track: { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 2, position: 'relative', marginBottom: 8 },
  fill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 2 },
  knob: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', marginLeft: -6 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: '#C0C7CE', fontSize: 12, fontWeight: '500' },
});
