import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function PlayerArtwork({ artwork }) {
  return artwork ? (
    <Image source={artwork} style={styles.image} />
  ) : (
    <View style={[styles.image, styles.placeholder]}><Text style={styles.symbol}>♪</Text></View>
  );
}
const styles = StyleSheet.create({
  image: { width: 310, height: 310, borderRadius: 8, backgroundColor: '#282828' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  symbol: { color: '#B3B3B3', fontSize: 72 },
});
