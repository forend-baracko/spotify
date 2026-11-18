import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Host } from '@expo/ui';
import { Card, RNHostView } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';

export default function SearchCategoryCard({ title, color, image, onPress }) {
  return (
    <View style={styles.wrapper}>
      <Host colorScheme="dark" style={styles.host} pointerEvents="none">
        <Card colors={{ containerColor: color }} modifiers={[fillMaxSize()]}>
          <RNHostView modifiers={[fillMaxSize()]}>
            <View style={styles.content} importantForAccessibility="no-hide-descendants">
              <Text style={styles.title}>{title}</Text>
              <Image source={{ uri: image }} style={styles.image} />
            </View>
          </RNHostView>
        </Card>
      </Host>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Browse ${title}`} activeOpacity={0.8} />
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { width: '48%', height: 90, marginBottom: 12 },
  host: { width: '100%', height: '100%' },
  content: { flex: 1, width: '100%', padding: 10, overflow: 'hidden' },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', width: '70%' },
  image: { width: 60, height: 60, position: 'absolute', bottom: -5, right: -10, transform: [{ rotate: '25deg' }], borderRadius: 4 },
});
