from pathlib import Path

path = Path('packages/tv-app/src/pages/NowPlaying.tsx')
text = path.read_text(encoding='utf-8')
start = text.find('      ) : (\n        /* ===== ')
if start == -1:
    raise SystemExit('start not found')
# include the leading spaces to keep indentation consistent
start = text.find('      ) : (\n        /* ===== ', start - 200 if start > 200 else 0)
# locate block end: the closing ') }' before AdvancedControlsPanel usage
end = text.find('      )}', start)
if end == -1:
    raise SystemExit('end not found')
end += len('      )}')

new_block = '''      ) : (
        /* ===== audio mode: Mainstream KTV stage layout ===== */
        <div className="np-stage np-audio-stage">
          <header className={`np-stage-header np-audio-header ${stageInfoVisible ? '' : 'is-stage-hidden'}`}>
            <h1 className="np-audio-title">{currentItem.songTitle}</h1>
            <p className="np-audio-artist">{currentItem.songArtist}</p>
            {currentItem.nickname && (
              <p className="np-audio-nick">Song requester: {currentItem.nickname}</p>
            )}
          </header>

          <div className="np-audio-lyrics">
            {lyricsLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-ink-3 text-base">Loading lyrics...</p>
              </div>
            ) : (
              <Lyrics
                lines={lyrics}
                currentIndex={currentLyricIndex}
                currentTime={currentTime}
              />
            )}
          </div>

          <div className="np-audio-queue">
            {pendingQueue.length > 0 ? (
              <>
                <p className="np-audio-queue-head">Next</p>
                <p className="np-audio-queue-title">{pendingQueue[0].songTitle}</p>
                <p className="np-audio-queue-artist">{pendingQueue[0].songArtist}</p>
              </>
            ) : (
              <p className="np-audio-queue-empty">No songs in queue</p>
            )}
          </div>

          <footer className="np-audio-footer">
            <div className="np-audio-footer-inner">
              <ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />
              <PlayerControls
                isPlaying={isPlaying}
                vocalMode={vocalMode}
                onPlayPause={togglePlay}
                onSkip={handleSkip}
                onVocalModeChange={switchVocalMode}
                onAdvancedClick={() => setAdvancedPanelOpen(true)}
                pitch={pitch}
                isVideo={isVideo}
              />
            </div>
          </footer>
        </div>
      )}
'''
# Add audio stage CSS rules near existing NowPlaying styles
css_block = '''
/* Audio mode KTV stage overrides */
.np-audio-stage {
  align-items: center;
  text-align: center;
  padding: var(--space-3xl) var(--space-4xl) var(--space-3xl);
  background: linear-gradient(180deg, oklch(10% 0.02 250 / 0.85) 0%, oklch(10% 0.02 250 / 0) 35%),
              linear-gradient(0deg, oklch(10% 0.02 250 / 0.92) 0%, oklch(10% 0.02 250 / 0) 35%);
}
.np-audio-header {
  align-items: center;
  max-width: min(72ch, 88%);
  margin-inline: auto;
}
.np-audio-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: 1.08;
  color: var(--color-ink);
  text-shadow: var(--shadow-lyrics);
  overflow-wrap: anywhere;
  min-width: 0;
}
.np-audio-artist {
  margin-top: var(--space-sm);
  font-size: var(--text-xl);
  color: var(--color-ink-2);
  text-shadow: var(--shadow-lyrics);
}
.np-audio-nick {
  margin-top: var(--space-xs);
  font-size: var(--text-base);
  color: var(--color-ink-3);
  text-shadow: var(--shadow-lyrics);
}
.np-audio-lyrics {
  flex: 1 1 auto;
  min-height: 0;
  width: min(96ch, 92%);
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.np-audio-queue {
  position: absolute;
  left: var(--space-3xl);
  bottom: var(--space-3xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-width: 24ch;
  text-align: left;
}
.np-audio-queue-head {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--color-ink-3);
  text-shadow: var(--shadow-lyrics);
}
.np-audio-queue-title {
  font-size: var(--text-lg);
  color: var(--color-ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: var(--shadow-lyrics);
}
.np-audio-queue-artist {
  font-size: var(--text-base);
  color: var(--color-ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: var(--shadow-lyrics);
}
.np-audio-queue-empty {
  font-size: var(--text-sm);
  color: var(--color-ink-3);
  text-shadow: var(--shadow-lyrics);
}
.np-audio-footer {
  width: min(96ch, 92%);
  margin-inline: auto;
  padding-top: var(--space-xl);
}
.np-audio-footer-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}
'''
text = path.read_text(encoding='utf-8')
marker = '@keyframes np-pause-in'
idx = text.find(marker)
if idx == -1:
    raise SystemExit('marker not found')
path.write_text(text[:idx] + css_block + text[idx:], encoding='utf-8')
