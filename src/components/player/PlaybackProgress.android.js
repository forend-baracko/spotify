import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Host } from '@expo/ui';
import { Box, LinearProgressIndicator, Slider } from '@expo/ui/jetpack-compose';
import { background, clip, fillMaxWidth, height, semantics, Shapes, size } from '@expo/ui/jetpack-compose/modifiers';

export default function PlaybackProgress({ currentTime, duration, trackId, onSeek, formatTime }) {
  const [preview, setPreview] = useState(null);
  const pending = useRef(null);
  useEffect(() => { pending.current = null; setPreview(null); }, [trackId]);
  const maximum = Math.max(1, duration || 0);
  const shown = Math.max(0, Math.min(maximum, preview ?? currentTime ?? 0));
  return (
    <View style={styles.container}>
      <Host style={styles.host} colorScheme="dark">
        <Slider
          min={0}
          max={maximum}
          value={shown}
          enabled={duration > 0}
          colors={{ activeTrackColor: '#FFFFFF', inactiveTrackColor: '#777777', thumbColor: '#FFFFFF' }}
          modifiers={[semantics({ contentDescription: 'Seek playback' })]}
          onValueChange={(value) => { pending.current = value; setPreview(value); }}
          onValueChangeFinished={() => {
            const value = pending.current;
            pending.current = null;
            setPreview(null);
            if (value != null) onSeek(Math.max(0, Math.min(maximum, value)));
          }}
        >
          <Slider.Thumb>
            <Box modifiers={[size(12, 12), clip(Shapes.Circle), background('#FFFFFF')]} />
          </Slider.Thumb>
          <Slider.Track>
            <LinearProgressIndicator
              progress={shown / maximum}
              color="#FFFFFF"
              trackColor="#9C665F"
              strokeCap="round"
              gapSize={0}
              drawStopIndicator={{ stopSize: 0 }}
              modifiers={[fillMaxWidth(), height(4)]}
            />
          </Slider.Track>
        </Slider>
      </Host>
      <View style={styles.times}>
        <Text style={styles.time}>{formatTime(shown)}</Text>
        <Text style={styles.time}>-{formatTime(Math.max(0, duration - shown))}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 20 },
  host: { width: '100%', height: 44 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: '#B3B3B3', fontSize: 12 },
});
