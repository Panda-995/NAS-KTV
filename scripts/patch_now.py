from pathlib import Path

path = Path('packages/tv-app/src/pages/NowPlaying.tsx')
text = path.read_text(encoding='utf-8')
start = text.find('        /* ===== audio mode: Mainstream KTV stage layout ===== */')
if start == -1:
    raise SystemExit('new block start not found')
start = text.rfind('      ) : (\n', 0, start)
if start == -1:
    raise SystemExit('ternary start not found')
marker_end = '      )}\n'
end = text.find(marker_end, start)
if end == -1:
    raise SystemExit('new block end not found')
end += len(marker_end)
adv = text.find('      {/* AdvancedControlsPanel', end)
if adv == -1:
    raise SystemExit('advanced panel marker not found')
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
path.write_text(text[:start] + new_block + text[adv:], encoding='utf-8')
