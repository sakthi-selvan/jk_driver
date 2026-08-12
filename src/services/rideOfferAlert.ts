/**
 * Ride-offer alarm: looping sound + vibration when a new exclusive offer arrives.
 * Errors are swallowed so audio failures never break dispatch UI.
 *
 * expo-audio is NEVER imported at top level — a stale native binary without
 * ExpoAudio would crash the whole route tree on load.
 */
import { Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'jk_driver_notification_prefs';
const ALARM_SOURCE = require('../../assets/sounds/ride_offer_alarm.wav');

type Prefs = {
  push?: boolean;
  rideUpdates?: boolean;
};

/** Minimal surface we use from expo-audio (avoids a static import). */
type AudioPlayer = {
  loop: boolean;
  volume: number;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  release: () => void;
};

type AudioModule = {
  createAudioPlayer: (
    source: number | string | { uri: string },
    options?: { updateInterval?: number },
  ) => AudioPlayer;
  setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
  setIsAudioActiveAsync: (active: boolean) => Promise<void>;
};

let audioMod: AudioModule | null | undefined;
let player: AudioPlayer | null = null;
let modeReady = false;
let activeRideId: string | null = null;
let starting = false;
let nativeAudioWarned = false;

function loadAudioModule(): AudioModule | null {
  if (audioMod !== undefined) return audioMod;
  try {
    // Soft probe — do not throw / redbox when native module is absent
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const core = require('expo-modules-core') as {
      requireOptionalNativeModule?: (name: string) => unknown;
    };
    const probe = core.requireOptionalNativeModule?.('ExpoAudio');
    if (!probe) {
      audioMod = null;
      if (!nativeAudioWarned) {
        nativeAudioWarned = true;
        console.warn(
          '[rideOfferAlert] ExpoAudio not in this binary — vibration only. ' +
            'Rebuild: eas build -p android --profile development',
        );
      }
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    audioMod = require('expo-audio') as AudioModule;
    return audioMod;
  } catch (e) {
    audioMod = null;
    if (!nativeAudioWarned) {
      nativeAudioWarned = true;
      console.warn(
        '[rideOfferAlert] expo-audio unavailable — vibration only.',
        e,
      );
    }
    return null;
  }
}

async function prefsAllowAlarm(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return true;
    const prefs = JSON.parse(raw) as Prefs;
    if (prefs.push === false) return false;
    if (prefs.rideUpdates === false) return false;
    return true;
  } catch {
    return true;
  }
}

async function ensureAudioMode(): Promise<boolean> {
  if (modeReady) return true;
  const mod = loadAudioModule();
  if (!mod) return false;
  try {
    await mod.setIsAudioActiveAsync(true);
    await mod.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
      allowsRecording: false,
    });
    modeReady = true;
    return true;
  } catch (e) {
    console.warn('[rideOfferAlert] audio mode failed', e);
    return false;
  }
}

function startVibration() {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 500, 250, 500, 250, 700], true);
    } else {
      Vibration.vibrate([400, 200, 400, 200, 600]);
    }
  } catch (e) {
    console.warn('[rideOfferAlert] vibrate failed', e);
  }
}

function stopVibration() {
  try {
    Vibration.cancel();
  } catch {
    /* ignore */
  }
}

async function ensurePlayer(): Promise<AudioPlayer | null> {
  if (player) return player;
  const mod = loadAudioModule();
  if (!mod) return null;
  try {
    player = mod.createAudioPlayer(ALARM_SOURCE, { updateInterval: 500 });
    player.loop = true;
    player.volume = 1.0;
    return player;
  } catch (e) {
    console.warn('[rideOfferAlert] create player failed', e);
    player = null;
    return null;
  }
}

export const rideOfferAlert = {
  /** Play looping alarm for a new offer (idempotent per ride id). */
  async playForOffer(rideId?: string | null) {
    const id = rideId ? String(rideId) : null;
    if (id && activeRideId === id) return;
    if (starting) return;
    starting = true;
    try {
      const allowed = await prefsAllowAlarm();
      if (!allowed) return;

      activeRideId = id;
      startVibration();

      const ok = await ensureAudioMode();
      if (!ok) return;

      const p = await ensurePlayer();
      if (!p) return;

      try {
        p.loop = true;
        p.volume = 1.0;
        await p.seekTo(0);
      } catch {
        /* seek may fail before first load — still try play */
      }
      try {
        p.play();
      } catch (e) {
        console.warn('[rideOfferAlert] play failed', e);
      }
    } catch (e) {
      console.warn('[rideOfferAlert] unexpected play error', e);
    } finally {
      starting = false;
    }
  },

  /** Stop alarm (accept / reject / offer taken / offline). */
  async stop() {
    activeRideId = null;
    stopVibration();
    if (!player) return;
    try {
      player.pause();
      await player.seekTo(0);
    } catch (e) {
      console.warn('[rideOfferAlert] stop failed', e);
    }
  },

  /** Release native resources (app background teardown). */
  async release() {
    activeRideId = null;
    stopVibration();
    if (!player) return;
    try {
      player.pause();
      player.release();
    } catch (e) {
      console.warn('[rideOfferAlert] release failed', e);
    } finally {
      player = null;
      modeReady = false;
    }
  },
};
