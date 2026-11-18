import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeShortcutCard({ title, image, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {image ? <Image source={image} style={styles.image} /> : <View style={[styles.image, styles.fallback]}><Text style={styles.note}>♫</Text></View>}
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  card: { width: '49%', minHeight: 43, flexDirection: 'row', alignItems: 'center', backgroundColor: '#292929', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  image: { width: 43, height: 43, backgroundColor: '#333333' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  note: { color: '#1ED760', fontSize: 24, fontWeight: 'bold' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '600', paddingHorizontal: 8 },
});
