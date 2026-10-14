import { createAudioPlayer, requestNotificationPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

export type QuranPlaybackState = {
  isPlaying: boolean;
  playingKey: string | null;
  rangeEnd: number | null;
  repeatCount: number;
  currentRepeat: number;
  visible: boolean;
};

const listeners = new Set<(state: QuranPlaybackState) => void>();

const initialState: QuranPlaybackState = {
  isPlaying: false,
  playingKey: null,
  rangeEnd: null,
  repeatCount: 1,
  currentRepeat: 0,
  visible: false,
};

let playbackState: QuranPlaybackState = { ...initialState };

export const quranAudioPlayer = createAudioPlayer(null, {
  updateInterval: 100,
  downloadFirst: true,
  preferredForwardBufferDuration: 30,
  keepAudioSessionActive: true,
});

let rangeTracks: Array<{ url: string; key: string }> = [];
let rangeTrackIndex = 0;
let rangeRepeatCount = 1;
let rangeActive = false;
let rangeTransitioning = false;
let rangeTransitionToken = 0;

const flushRangeQueue = () => {
  rangeTracks = [];
  rangeTrackIndex = 0;
  rangeRepeatCount = 1;
  rangeActive = false;
  rangeTransitioning = false;
  rangeTransitionToken += 1;
};

quranAudioPlayer.addListener('playbackStatusUpdate', (status) => {
  if (!rangeActive || !status.didJustFinish || rangeTransitioning) return;

  if (rangeTracks.length === 0) {
    stopQuranPlayback();
    return;
  }

  rangeTransitioning = true;
  const transitionToken = ++rangeTransitionToken;
  const repeatLimit = Math.max(1, rangeRepeatCount);

  if (playbackState.currentRepeat < repeatLimit) {
    const nextRepeat = playbackState.currentRepeat + 1;
    playbackState = { ...playbackState, isPlaying: true, currentRepeat: nextRepeat, visible: true };
    notify();
    setTimeout(() => {
      if (!rangeActive || transitionToken !== rangeTransitionToken) return;
      quranAudioPlayer.seekTo(0)
        .then(() => quranAudioPlayer.play())
        .catch(() => stopQuranPlayback())
        .finally(() => { rangeTransitioning = false; });
    }, 80);
    return;
  }

  const nextIndex = rangeTrackIndex + 1;
  const nextTrack = rangeTracks[nextIndex];

  if (!nextTrack) {
    stopQuranPlayback();
    return;
  }

  rangeTrackIndex = nextIndex;
  setTimeout(() => {
    if (!rangeActive || transitionToken !== rangeTransitionToken) return;
    startTrack(nextTrack, rangeRepeatCount, playbackState.rangeEnd);
    rangeTransitioning = false;
  }, 80);
});

const notify = () => {
  const snapshot = { ...playbackState };
  listeners.forEach((listener) => listener(snapshot));
};

export const subscribeQuranPlayback = (listener: (state: QuranPlaybackState) => void) => {
  listeners.add(listener);
  listener({ ...playbackState });
  return () => {
    listeners.delete(listener);
  };
};

export const getQuranPlaybackState = () => ({ ...playbackState });

export const setQuranPlaybackVisibility = (visible: boolean) => {
  playbackState = { ...playbackState, visible };
  notify();
};

export const setQuranPlaybackState = (patch: Partial<QuranPlaybackState>) => {
  playbackState = { ...playbackState, ...patch };
  notify();
};

export const stopQuranPlayback = () => {
  try {
    quranAudioPlayer.pause();
    quranAudioPlayer.setActiveForLockScreen(false);
  } catch {
    // no-op
  }

  playbackState = { ...initialState };
  flushRangeQueue();
  notify();
};

function startTrack(track: { url: string; key: string }, repeatCount: number, rangeEnd: number | null) {
  quranAudioPlayer.replace(track.url);
  quranAudioPlayer.setActiveForLockScreen(true, {
    title: `Al-Qur'an • Ayat ${track.key.split(':')[1]}`,
    artist: 'NASUHA App',
    albumTitle: 'Tilawah Al-Qur\'an',
  }, {
    showSeekBackward: true,
    showSeekForward: true,
  });
  quranAudioPlayer.play();
  playbackState = {
    isPlaying: true,
    playingKey: track.key,
    rangeEnd,
    repeatCount,
    currentRepeat: 1,
    visible: true,
  };
  notify();
}

export const playQuranRangeAudio = ({
  tracks,
  repeatCount = 1,
  rangeEnd,
}: {
  tracks: Array<{ url: string; key: string }>;
  repeatCount?: number;
  rangeEnd: number;
}) => {
  const safeTracks = tracks.filter((track) => Boolean(track?.url));
  if (safeTracks.length === 0) return;
  if (Platform.OS === 'android') {
    requestNotificationPermissionsAsync().catch(() => {});
  }
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  }).catch(() => {});

  rangeRepeatCount = Math.max(1, repeatCount);
  rangeTracks = safeTracks;
  rangeTrackIndex = 0;
  rangeActive = true;
  rangeTransitioning = false;
  rangeTransitionToken += 1;

  const firstTrack = safeTracks[0];
  startTrack(firstTrack, rangeRepeatCount, rangeEnd);
};

export const playQuranAudio = ({
  url,
  key,
  repeatCount = 1,
  rangeEnd = null,
}: {
  url: string;
  key: string;
  repeatCount?: number;
  rangeEnd?: number | null;
}) => {
  if (Platform.OS === 'android') {
    requestNotificationPermissionsAsync().catch(() => {});
  }
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  }).catch(() => {});
  flushRangeQueue();
  startTrack({ url, key }, repeatCount, rangeEnd);
};
