import Sound from 'react-native-sound';

Sound.setCategory('Playback');

export const REPEAT_MODE = {
  OFF: 'OFF',
  ALL: 'ALL',
  ONE: 'ONE',
};

class AudioPlayerService {
  constructor() {
    this.soundObj = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.queue = [];
    this.currentIndex = 0;
    this.currentTime = 0;
    this.duration = 230;
    this.isShuffle = false;
    this.repeatMode = REPEAT_MODE.OFF;
    this.listeners = new Set();
    this.progressTimer = null;
    this.isTransitioning = false;
    this.playbackRequestId = 0;
    this.userQueueCount = 0;
    this.catalogProvider = null;
  }

  // --- Listener System ---
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  emit(event, data = {}) {
    this.listeners.forEach((callback) => {
      try {
        callback(event, {
          event,
          track: this.currentTrack,
          isPlaying: this.isPlaying,
          isShuffle: this.isShuffle,
          repeatMode: this.repeatMode,
          currentTime: this.currentTime,
          duration: this.duration,
          ...data,
        });
      } catch (err) {
        console.warn('AudioPlayer listener error:', err);
      }
    });
  }

  // --- Queue State & Helpers ---
  setCatalogProvider(provider) {
    this.catalogProvider = provider;
  }

  setQueue(tracks = [], startIndex = 0) {
    this.queue = Array.isArray(tracks) ? [...tracks] : [];
    this.currentIndex = Math.max(0, Math.min(startIndex, this.queue.length - 1));
    this.userQueueCount = 0;
    this.emit('queue', { queue: this.queue });
  }

  // Play an entire playlist in exact order from specified startIndex
  playPlaylist(tracks = [], startIndex = 0) {
    if (!Array.isArray(tracks) || tracks.length === 0) return;
    const validIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    this.setQueue(tracks, validIndex);
    const targetTrack = tracks[validIndex];
    if (targetTrack) {
      this.playTrack(targetTrack);
    }
  }

  // Add a track into the queue to be played NEXT
  addToQueueNext(track) {
    if (!track) return;
    const insertIndex = this.currentIndex + 1 + (this.userQueueCount || 0);
    this.queue.splice(insertIndex, 0, track);
    this.userQueueCount = (this.userQueueCount || 0) + 1;
    this.emit('queue', { queue: this.queue });
  }

  // Queue tracks preserving original context order unless shuffle is requested
  setQueueForTrack(track, tracks = [], shouldShuffle = false) {
    if (!track) return;
    this.userQueueCount = 0;
    const trackList = Array.isArray(tracks) && tracks.length > 0 ? [...tracks] : [track];
    const targetIndex = trackList.findIndex((t) => t?.id === track.id);

    if (shouldShuffle || this.isShuffle) {
      const remainingTracks = trackList.filter((t) => t?.id !== track.id);
      for (let index = remainingTracks.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [remainingTracks[index], remainingTracks[randomIndex]] = [
          remainingTracks[randomIndex],
          remainingTracks[index],
        ];
      }
      this.setQueue([track, ...remainingTracks], 0);
    } else {
      // PRESERVE PLAYLIST / CONTEXT ORDER
      if (targetIndex !== -1) {
        this.setQueue(trackList, targetIndex);
      } else {
        this.setQueue([track, ...trackList], 0);
      }
    }
  }

  // If there is only 1 or fewer songs left upcoming in the queue, add 10 more songs automatically
  checkAndReplenishQueue() {
    const upcomingRemaining = this.queue.length - (this.currentIndex + 1);
    if (upcomingRemaining <= 1) {
      this.replenishQueue(10);
    }
  }

  replenishQueue(count = 10) {
    let pool = [];
    if (typeof this.catalogProvider === 'function') {
      try {
        pool = this.catalogProvider() || [];
      } catch (err) {
        console.warn('Error fetching catalog for replenishment:', err);
      }
    }
    if (!pool || pool.length === 0) {
      pool = this.queue.length > 0 ? this.queue : [];
    }
    if (pool.length === 0) return;

    const currentTrackId = this.currentTrack?.id;
    const candidates = pool.filter((t) => t && t.id !== currentTrackId);
    const sourcePool = candidates.length > 0 ? candidates : pool;

    const newTracks = [];
    const shuffled = [...sourcePool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i += 1) {
      newTracks.push(shuffled[i % shuffled.length]);
    }

    this.queue = [...this.queue, ...newTracks];
    this.emit('queue', { queue: this.queue });
  }

  shuffleUpcomingTracks() {
    if (this.queue.length < 3 || this.currentIndex >= this.queue.length - 1) {
      return;
    }

    const upcomingTracks = this.queue.slice(this.currentIndex + 1);
    for (let index = upcomingTracks.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [upcomingTracks[index], upcomingTracks[randomIndex]] = [
        upcomingTracks[randomIndex],
        upcomingTracks[index],
      ];
    }

    this.queue = [
      ...this.queue.slice(0, this.currentIndex + 1),
      ...upcomingTracks,
    ];
    this.emit('queue', { queue: this.queue });
  }

  getQueue() {
    return this.queue || [];
  }

  getCurrentIndex() {
    return this.currentIndex || 0;
  }

  getCurrentTrack() {
    return this.currentTrack;
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  getIsShuffle() {
    return this.isShuffle;
  }

  getRepeatMode() {
    return this.repeatMode;
  }

  async jumpToQueueIndex(index) {
    if (!this.queue || index < 0 || index >= this.queue.length) return;
    this.currentIndex = index;
    const targetTrack = this.queue[index];
    if (targetTrack) {
      await this.playTrack(targetTrack);
    }
  }

  removeFromQueue(index) {
    if (!this.queue || index < 0 || index >= this.queue.length) return;
    if (index === this.currentIndex) return;

    this.queue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex -= 1;
    }
    this.emit('queue', { queue: this.queue });
  }

  clearQueue() {
    if (!this.queue || this.queue.length === 0) return;
    const current = this.currentTrack;
    this.queue = current ? [current] : [];
    this.currentIndex = 0;
    this.emit('queue', { queue: this.queue });
  }

  // --- Guaranteed Native Sound Cleanup ---
  hardStopPreviousSound() {
    this.playbackRequestId += 1;

    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }

    if (this.soundObj) {
      const activeSound = this.soundObj;
      this.soundObj = null;
      try {
        activeSound.stop(() => {
          try {
            activeSound.release();
          } catch (e) {}
        });
      } catch (e) {
        try {
          activeSound.release();
        } catch (err) {}
      }
    }
  }

  // --- Core Playback ---
  async playTrack(track) {
    if (!track) return;

    this.hardStopPreviousSound();
    const playbackRequestId = ++this.playbackRequestId;

    this.isTransitioning = false;
    this.currentTrack = track;
    this.currentTime = 0;
    this.isPlaying = true;

    if (track.duration) {
      if (typeof track.duration === 'string' && track.duration.includes(':')) {
        const parts = track.duration.split(':');
        this.duration = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) || 230;
      } else if (typeof track.duration === 'number') {
        this.duration = track.duration;
      }
    }

    const foundIdx = this.queue.findIndex((t) => t.id === track.id);
    if (foundIdx !== -1) {
      this.currentIndex = foundIdx;
    }

    this.emit('status');

    let audioUri = track.stream_url || track.url || track.audioUrl;
    const isValidMp3 =
      typeof track.stream_url === 'string' ||
      (typeof audioUri === 'string' &&
        (audioUri.endsWith('.mp3') || audioUri.includes('.mp3?')));

    if (!isValidMp3) {
      audioUri = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    }

    let attemptedFallback = false;
    const loadSound = (uri) => {
      let sound;
      try {
        sound = new Sound(uri, null, (error) => {
          if (playbackRequestId !== this.playbackRequestId) {
            try {
              sound.stop();
              sound.release();
            } catch (cleanupError) {}
            return;
          }

          if (error) {
            if (
              !attemptedFallback &&
              track.fallback_stream_url &&
              track.fallback_stream_url !== uri
            ) {
              attemptedFallback = true;
              sound.release();
              loadSound(track.fallback_stream_url);
              return;
            }

            console.warn('Failed to load sound:', error);
            this.isPlaying = false;
            this.emit('status');
            this.emit('error', {
              error: error instanceof Error ? error : new Error(String(error)),
            });
            return;
          }

          const realDuration = Math.floor(sound.getDuration());
          if (realDuration && realDuration > 0) {
            this.duration = realDuration;
          }

          this.soundObj = sound;
          this.isPlaying = true;

          sound.play((success) => {
            if (
              success &&
              playbackRequestId === this.playbackRequestId &&
              this.soundObj === sound
            ) {
              this._handleTrackCompletion();
            } else if (playbackRequestId === this.playbackRequestId) {
              const playbackError = new Error(`Playback failed for "${track.title}".`);
              console.warn('Playback error or interrupted:', playbackError);
              this.isPlaying = false;
              this.emit('status');
              this.emit('error', { error: playbackError });
            }
          });

          this._startProgressTimer();
          this.emit('status');
        });
      } catch (error) {
        console.warn('Failed to initialize track audio:', error);
        if (
          !attemptedFallback &&
          track.fallback_stream_url &&
          track.fallback_stream_url !== uri
        ) {
          attemptedFallback = true;
          loadSound(track.fallback_stream_url);
          return;
        }
        if (playbackRequestId === this.playbackRequestId) {
          this.isPlaying = false;
          this.emit('status');
          this.emit('error', { error });
        }
      }
    };

    loadSound(track.audio || audioUri);
  }

  _handleTrackCompletion() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.hardStopPreviousSound();

    if (this.repeatMode === REPEAT_MODE.ONE) {
      this.playTrack(this.currentTrack);
    } else {
      this.checkAndReplenishQueue();
      this.playNext();
    }
  }

  _startProgressTimer() {
    if (this.progressTimer) clearInterval(this.progressTimer);

    this.progressTimer = setInterval(() => {
      if (this.soundObj && this.isPlaying) {
        this.soundObj.getCurrentTime((seconds) => {
          this.currentTime = Math.floor(seconds);
          this.emit('progress', {
            currentTime: this.currentTime,
            duration: this.duration,
          });
        });
      }
    }, 1000);
  }

  // --- Controls ---
  async togglePlay(track = null) {
    if (track && this.currentTrack?.id !== track.id) {
      await this.playTrack(track);
      return;
    }

    if (!this.soundObj) {
      if (track || this.currentTrack) {
        await this.playTrack(track || this.currentTrack);
      }
      return;
    }

    if (this.isPlaying) {
      this.soundObj.pause();
      this.isPlaying = false;
    } else {
      this.soundObj.play((success) => {
        if (success) {
          this._handleTrackCompletion();
        }
      });
      this.isPlaying = true;
    }
    this.emit('status');
  }

  async stop() {
    this.hardStopPreviousSound();
    this.isPlaying = false;
    this.currentTime = 0;
    this.emit('status');
  }

  async playPrevious() {
    if (!this.queue || this.queue.length === 0) return;

    if (this.currentTime > 3) {
      this.seekTo(0);
      return;
    }

    let prevIndex = this.currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.queue.length - 1;
    }

    this.currentIndex = prevIndex;
    const prevTrack = this.queue[prevIndex];
    if (prevTrack) {
      await this.playTrack(prevTrack);
    }
  }

  async playNext() {
    if (!this.queue || this.queue.length === 0) return;

    if (this.userQueueCount > 0) {
      this.userQueueCount -= 1;
    }

    let nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.queue.length) {
      if (this.repeatMode === REPEAT_MODE.ALL) {
        nextIndex = 0;
      } else {
        // Automatically replenish if reaching the end
        this.checkAndReplenishQueue();
        if (nextIndex >= this.queue.length) {
          this.hardStopPreviousSound();
          this.isPlaying = false;
          this.currentTime = 0;
          this.emit('status');
          return;
        }
      }
    }

    this.currentIndex = nextIndex;
    const nextTrack = this.queue[nextIndex];

    // If only 1 song left ahead, auto-add 10 more songs
    this.checkAndReplenishQueue();

    if (nextTrack) {
      await this.playTrack(nextTrack);
    }
  }

  async seekTo(seconds) {
    this.currentTime = Math.max(0, Math.min(seconds, this.duration));
    if (this.soundObj) {
      try {
        this.soundObj.setCurrentTime(this.currentTime);
      } catch (e) {
        console.warn('Seek error:', e);
      }
    }
    this.emit('progress', { currentTime: this.currentTime, duration: this.duration });
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    if (this.isShuffle) {
      this.shuffleUpcomingTracks();
    }
    this.emit('mode', { isShuffle: this.isShuffle });
    return this.isShuffle;
  }

  toggleRepeat() {
    if (this.repeatMode === REPEAT_MODE.OFF) {
      this.repeatMode = REPEAT_MODE.ALL;
    } else if (this.repeatMode === REPEAT_MODE.ALL) {
      this.repeatMode = REPEAT_MODE.ONE;
    } else {
      this.repeatMode = REPEAT_MODE.OFF;
    }
    this.emit('mode', { repeatMode: this.repeatMode });
    return this.repeatMode;
  }
}

const audioPlayer = new AudioPlayerService();
export default audioPlayer;