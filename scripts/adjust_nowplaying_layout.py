from pathlib import Path

path = Path('packages/tv-app/src/pages/NowPlaying.tsx')
text = path.read_text(encoding='utf-8')

# Remove flex-1 spacer if present
text = text.replace('\n          <div className="flex-1" />\n', '\n')

# Ensure queue block precedes lyrics block (already true) but keep order: header -> queue -> lyrics -> footer
# No-op if already correct.

# Adjust footer position to bottom using absolute class defined in CSS (we will add in NowPlaying css)
# Replace footer className to absolute bottom variant
text = text.replace('className="np-audio-footer"', 'className="np-audio-footer np-audio-footer--bottom"')

path.write_text(text, encoding='utf-8')
