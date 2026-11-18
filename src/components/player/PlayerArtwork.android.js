import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Host } from '@expo/ui';
import { Card, RNHostView } from '@expo/ui/jetpack-compose';
import { fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';
import AppIcon from '../icons/AppIcon';

export default function PlayerArtwork({ artwork }) {
  const { width, height } = useWindowDimensions();
  const dimension = Math.max(1, Math.min(width - 48, height * 0.43, 430));
  return (
    <Host colorScheme="dark" style={{ width: dimension, height: dimension }} pointerEvents="none">
      <Card colors={{ containerColor: '#282828' }} modifiers={[fillMaxSize()]}>
        <RNHostView modifiers={[fillMaxSize()]}>
          {artwork ? <Image source={artwork} style={styles.image} /> : <View style={styles.placeholder}><AppIcon name="music" size={72} color="#B3B3B3" /></View>}
        </RNHostView>
      </Card>
    </Host>
  );
}
const styles = StyleSheet.create({
  image: { width: '100%', height: '100%', backgroundColor: '#282828' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#282828' },
});
