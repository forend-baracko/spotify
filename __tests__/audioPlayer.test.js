jest.mock('react-native-sound', () => {
  const Sound = jest.fn();
  Sound.setCategory = jest.fn();

  return {
    __esModule: true,
    default: Sound,
  };
});

import Sound from 'react-native-sound';
import audioPlayer from '../src/services/audioPlayer';
import { MOCK_TRACKS } from '../src/assets/tracks/mockData';

const track = { id: 'track-1', title: 'Test track', audioUrl: 'track.mp3' };

describe('audioPlayer playback requests', () => {
  let pendingLoads;
  let soundInstances;
  let playCallbacks;

  beforeEach(() => {
    pendingLoads = [];
    soundInstances = [];
    playCallbacks = [];
    Sound.mockImplementation((uri, basePath, onLoad) => {
      const sound = {
        stop: jest.fn((callback) => callback?.()),
        release: jest.fn(),
        getDuration: jest.fn(() => 180),
        play: jest.fn((callback) => playCallbacks.push(callback)),
      };

      soundInstances.push(sound);
      pendingLoads.push(onLoad);
      return sound;
    });
  });

  afterEach(async () => {
    await audioPlayer.stop();
    Sound.mockReset();
    jest.restoreAllMocks();
  });

  it('starts only the latest request when taps happen before loading finishes', () => {
    audioPlayer.playTrack(track);
    audioPlayer.playTrack(track);

    pendingLoads[0](null);
    pendingLoads[1](null);

    expect(soundInstances[0].play).not.toHaveBeenCalled();
    expect(soundInstances[1].play).toHaveBeenCalledTimes(1);
  });

  it('does not start a pending track after playback is stopped', async () => {
    audioPlayer.playTrack(track);
    await audioPlayer.stop();

    pendingLoads[0](null);

    expect(soundInstances[0].play).not.toHaveBeenCalled();
  });

  it('passes bundled audio resource names to react-native-sound as strings', async () => {
    await audioPlayer.playTrack(MOCK_TRACKS[0]);

    expect(Sound).toHaveBeenCalledWith(
      'mariah_deborah_na_para_bang',
      null,
      expect.any(Function)
    );
    pendingLoads[0](null);
    expect(soundInstances[0].play).toHaveBeenCalledTimes(1);
  });

  it('retries an Audius proxy failure using the direct stream URL', async () => {
    const audiusTrack = {
      id: 'audius-track-1',
      title: 'Audius track',
      source: 'audius',
      stream_url: 'http://10.0.2.2:3001/api/audio/tracks/track-1',
      fallback_stream_url:
        'https://discoveryprovider.audius.co/v1/tracks/track-1/stream?app_name=Spotibai',
    };

    await audioPlayer.playTrack(audiusTrack);
    pendingLoads[0](new Error('proxy offline'));

    expect(Sound).toHaveBeenNthCalledWith(
      2,
      audiusTrack.fallback_stream_url,
      null,
      expect.any(Function)
    );
    pendingLoads[1](null);
    expect(soundInstances[1].play).toHaveBeenCalledTimes(1);
  });

  it('reports an error when the native player fails after loading audio', async () => {
    const onError = jest.fn();
    const removeListener = audioPlayer.addListener(onError);

    await audioPlayer.playTrack(track);
    pendingLoads[0](null);
    playCallbacks[0](false);

    expect(onError).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Playback failed for "Test track".' }),
      })
    );
    removeListener();
  });

  it('emits an error when playback cannot load the track', async () => {
    const onError = jest.fn();
    const removeListener = audioPlayer.addListener(onError);

    await audioPlayer.playTrack(track);
    pendingLoads[0](new Error('audio unavailable'));

    expect(onError).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'audio unavailable' }),
      })
    );
    removeListener();
  });

  it('queues every track once with the selected track first and randomizes the rest', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const selectedTrack = MOCK_TRACKS[4];

    audioPlayer.setQueueForTrack(selectedTrack, MOCK_TRACKS, true);

    const queue = audioPlayer.getQueue();
    expect(queue[0]).toBe(selectedTrack);
    expect(queue).toHaveLength(MOCK_TRACKS.length);
    expect(queue.map(({ id }) => id).sort()).toEqual(
      MOCK_TRACKS.map(({ id }) => id).sort()
    );
    expect(audioPlayer.getCurrentIndex()).toBe(0);
    expect(queue.slice(1).map(({ id }) => id)).not.toEqual(
      MOCK_TRACKS.filter(({ id }) => id !== selectedTrack.id).map(({ id }) => id)
    );

    randomSpy.mockRestore();
  });

  it('preserves context order and selects the requested track by default', () => {
    const selectedTrack = MOCK_TRACKS[4];

    audioPlayer.setQueueForTrack(selectedTrack, MOCK_TRACKS);

    expect(audioPlayer.getQueue()).toEqual(MOCK_TRACKS);
    expect(audioPlayer.getCurrentIndex()).toBe(4);
    expect(audioPlayer.getQueue()[audioPlayer.getCurrentIndex()]).toBe(selectedTrack);
  });

  it('shuffles upcoming tracks and cycles repeat modes', () => {
    audioPlayer.setQueueForTrack(MOCK_TRACKS[0], MOCK_TRACKS);
    const currentTrack = audioPlayer.getQueue()[0];
    const beforeShuffle = audioPlayer.getQueue().slice(1).map(({ id }) => id);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    expect(audioPlayer.toggleShuffle()).toBe(true);
    expect(audioPlayer.getQueue()[0]).toBe(currentTrack);
    expect(audioPlayer.getQueue().slice(1).map(({ id }) => id)).not.toEqual(beforeShuffle);
    expect(audioPlayer.toggleShuffle()).toBe(false);

    expect(audioPlayer.toggleRepeat()).toBe('ALL');
    expect(audioPlayer.toggleRepeat()).toBe('ONE');
    expect(audioPlayer.toggleRepeat()).toBe('OFF');
  });
});
