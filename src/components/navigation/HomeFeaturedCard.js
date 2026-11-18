import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function HomeFeaturedCard({ image, title, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={title}>
      <Image source={{ uri: image }} style={styles.image} />
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  card: { width: 150, marginRight: 16 },
  image: { width: '100%', height: 150, borderRadius: 6, backgroundColor: '#242424' },
  title: { color: '#B3B3B3', fontSize: 12, lineHeight: 17, marginTop: 8 },
});
