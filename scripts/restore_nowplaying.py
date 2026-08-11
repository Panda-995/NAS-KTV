from pathlib import Path
import re

# Attempt to reconstruct original NowPlaying.tsx from the latest built JS bundle.
# Falls back to no-op if source cannot be recovered.

source_path = Path('packages/tv-app/src/pages/NowPlaying.tsx')
dist_path = Path('packages/tv-app/dist/assets')
if not dist_path.exists():
    raise SystemExit('dist assets not found; run tv-app build first')

# Find newest JS bundle
js_files = sorted(dist_path.glob('*.js'), key=lambda p: p.stat().st_mtime, reverse=True)
if not js_files:
    raise SystemExit('no js bundles found')
js_text = js_files[0].read_text(encoding='utf-8', errors='ignore')

# Extract component source if embedded in source maps (best-effort)
sources_content = re.findall(r'"sourcesContent":\["(.*?)"\]', js_text)
# Not reliable; do nothing and fail gracefully
raise SystemExit('automated restore not supported')
