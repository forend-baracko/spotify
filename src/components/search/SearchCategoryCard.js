import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function SearchCategoryCard({ title, color, image, onPress }) {
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: color }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Browse ${title}`}>
      <Text style={styles.title}>{title}</Text>
      <Image source={{ uri: image }} style={styles.image} />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  card: { width: '48%', height: 90, borderRadius: 4, padding: 10, marginBottom: 12, overflow: 'hidden', position: 'relative' },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', width: '70%' },
  image: { width: 60, height: 60, position: 'absolute', bottom: -5, right: -10, transform: [{ rotate: '25deg' }], borderRadius: 4 },
});
