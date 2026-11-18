import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
require('../test-utils/expoIcons');
const PlaybackProgress = require('../src/components/player/PlaybackProgress.android').default;

const formatTime = (value) => String(Math.floor(value || 0));

describe('Android playback slider', () => {
  let renderer;
  const slider = () => renderer.root.findByType('ExpoComposeSlider');
  afterEach(async () => { if (renderer) await ReactTestRenderer.act(() => renderer.unmount()); renderer = null; });

  it('uses native slider slots with a round thumb and progress matching the preview', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaybackProgress trackId="a" currentTime={25} duration={100} onSeek={jest.fn()} formatTime={formatTime} />); });
    expect(slider().findByType('ExpoSliderThumb').findByType('ExpoComposeBox')).toBeTruthy();
    expect(slider().findByType('ExpoSliderTrack').findByType('ExpoLinearProgress').props.progress).toBe(0.25);
    await ReactTestRenderer.act(() => slider().props.onValueChange(70));
    expect(slider().findByType('ExpoLinearProgress').props.progress).toBe(0.7);
  });

  it('previews dragging and commits one bounded seek when released', async () => {
    const onSeek = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaybackProgress trackId="a" currentTime={10} duration={100} onSeek={onSeek} formatTime={formatTime} />); });
    await ReactTestRenderer.act(() => slider().props.onValueChange(150));
    expect(onSeek).not.toHaveBeenCalled();
    expect(slider().props.value).toBe(100);
    await ReactTestRenderer.act(() => slider().props.onValueChangeFinished());
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(100);
  });

  it('discards a pending seek when the track changes', async () => {
    const onSeek = jest.fn();
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaybackProgress trackId="a" currentTime={10} duration={100} onSeek={onSeek} formatTime={formatTime} />); });
    await ReactTestRenderer.act(() => slider().props.onValueChange(70));
    await ReactTestRenderer.act(() => renderer.update(<PlaybackProgress trackId="b" currentTime={2} duration={200} onSeek={onSeek} formatTime={formatTime} />));
    await ReactTestRenderer.act(() => slider().props.onValueChangeFinished());
    expect(onSeek).not.toHaveBeenCalled();
    expect(slider().props.value).toBe(2);
  });

  it('disables seeking without a known duration', async () => {
    await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<PlaybackProgress trackId="a" currentTime={0} duration={0} onSeek={jest.fn()} formatTime={formatTime} />); });
    expect(slider().props.enabled).toBe(false);
  });
});
