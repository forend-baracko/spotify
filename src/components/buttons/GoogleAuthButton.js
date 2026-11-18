import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
export default function GoogleAuthButton({ onPress, disabled = false, loading = false }) {
  const blocked = disabled || loading;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={loading ? 'Continuing with Google' : 'Continue with Google'} disabled={blocked} onPress={blocked ? undefined : onPress} style={styles.button}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.text}>Continue with Google</Text>}</TouchableOpacity>;
}
const styles = StyleSheet.create({ button: { width: '100%', minHeight: 48, borderRadius: 24, borderColor: '#777777', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, text: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' } });
