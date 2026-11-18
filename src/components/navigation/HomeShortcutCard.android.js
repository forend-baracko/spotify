import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Host } from '@expo/ui';
import { Card, RNHostView } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';

export default function HomeShortcutCard({ title, image, onPress }) {
  return (
    <View style={styles.wrapper}>
    <Host colorScheme="dark" style={styles.host} pointerEvents="none">
      <Card colors={{ containerColor: '#292929' }} modifiers={[fillMaxSize()]}>
        <RNHostView modifiers={[fillMaxSize()]}>
          <View style={styles.content} importantForAccessibility="no-hide-descendants">
            {image ? <Image source={image} style={styles.image} /> : <View style={[styles.image, styles.fallback]}><Text style={styles.note}>♫</Text></View>}
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
          </View>
        </RNHostView>
      </Card>
    </Host>
    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onPress} accessibilityRole="button" accessibilityLabel={title} activeOpacity={0.8} />
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { width: '49%', height: 48, marginBottom: 8 },
  host: { width: '100%', height: '100%' },
  content: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'center' },
  image: { width: 48, height: 48, backgroundColor: '#333333' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  note: { color: '#1ED760', fontSize: 24, fontWeight: 'bold' },
  title: { flex: 1, color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '600', paddingHorizontal: 8 },
});
