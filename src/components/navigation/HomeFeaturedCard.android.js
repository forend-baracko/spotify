import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Host } from '@expo/ui';
import { Card, RNHostView } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';

export default function HomeFeaturedCard({ image, title, onPress }) {
  return (
    <View style={styles.wrapper}>
      <Host colorScheme="dark" style={styles.imageHost} pointerEvents="none">
        <Card colors={{ containerColor: '#242424' }} modifiers={[fillMaxSize()]}>
          <RNHostView modifiers={[fillMaxSize()]}><Image source={{ uri: image }} style={styles.image} /></RNHostView>
        </Card>
      </Host>
      <Text style={styles.title} numberOfLines={2} importantForAccessibility="no">{title}</Text>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} accessibilityRole="button" accessibilityLabel={title} activeOpacity={0.8} />
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { width: 150, marginRight: 16 },
  imageHost: { width: 150, height: 150 },
  image: { width: '100%', height: '100%', backgroundColor: '#242424' },
  title: { color: '#B3B3B3', fontSize: 12, lineHeight: 17, marginTop: 8 },
});
