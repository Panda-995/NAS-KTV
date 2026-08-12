import assert from 'node:assert/strict';
import {
  getPlaybackPlan,
  prepareCrossOriginMedia,
} from '../src/lib/player-media.ts';

const originalVideo = getPlaybackPlan({
  hasVideo: true,
  mode: 'original',
  instrumentalAvailable: true,
  vocalsAvailable: true,
  vocalAssistVolume: 0.5,
  instrumentalVolume: 1,
});

assert.deepEqual(originalVideo, {
  videoMuted: false,
  playOriginal: false,
  playInstrumental: false,
  originalGain: 0,
  instrumentalGain: 0,
});

const instrumentalVideo = getPlaybackPlan({
  hasVideo: true,
  mode: 'instrumental',
  instrumentalAvailable: true,
  vocalsAvailable: false,
  vocalAssistVolume: 0.5,
  instrumentalVolume: 0.8,
});

assert.deepEqual(instrumentalVideo, {
  videoMuted: true,
  playOriginal: false,
  playInstrumental: true,
  originalGain: 0,
  instrumentalGain: 0.8,
});

const unavailableVideoTracks = getPlaybackPlan({
  hasVideo: true,
  mode: 'vocal_assist',
  instrumentalAvailable: true,
  vocalsAvailable: false,
  vocalAssistVolume: 0.5,
  instrumentalVolume: 1,
});

assert.equal(unavailableVideoTracks.videoMuted, false);
assert.equal(unavailableVideoTracks.playOriginal, false);
assert.equal(unavailableVideoTracks.playInstrumental, false);

const instrumentalAudio = getPlaybackPlan({
  hasVideo: false,
  mode: 'instrumental',
  instrumentalAvailable: true,
  vocalsAvailable: true,
  vocalAssistVolume: 0.5,
  instrumentalVolume: 0.7,
});

assert.equal(instrumentalAudio.playOriginal, false);
assert.equal(instrumentalAudio.playInstrumental, true);
assert.equal(instrumentalAudio.instrumentalGain, 0.7);

const media = { crossOrigin: null, preload: '' };
prepareCrossOriginMedia(media);
assert.equal(media.crossOrigin, 'anonymous');
assert.equal(media.preload, 'auto');

console.info('player media routing keeps Android TV playback audible and CORS-safe');
