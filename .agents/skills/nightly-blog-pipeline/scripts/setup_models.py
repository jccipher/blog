"""Explicit, deadline-bounded setup; ordinary inference must remain offline."""
import json
import os
import signal
import sys
import time
from pathlib import Path

if __name__ == '__main__':
    job = json.loads(Path(sys.argv[1]).read_text())
    remaining = int(job['deadline'] / 1000 - time.time() - 2)
    if remaining <= 0:
        raise SystemExit('Setup deadline expired')
    signal.alarm(remaining)
    os.environ['HF_HOME'] = str(Path('.ai-blog/models/hub').resolve())
    os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '45'
    os.environ['HF_HUB_ETAG_TIMEOUT'] = '45'
    from huggingface_hub import HfApi, snapshot_download
    lock_path = Path('.ai-blog/models/lock.json')
    lock = json.loads(lock_path.read_text()) if lock_path.exists() else {'schema_version': 1, 'models': {}}
    api = HfApi()
    for model in job['models']:
        record = lock['models'].get(model)
        revision = record['revision'] if record else api.model_info(model).sha
        location = snapshot_download(model, revision=revision, max_workers=2, ignore_patterns=['*.md', '*.png', '*.jpg'])
        lock['models'][model] = {'revision': revision, 'path': location}
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = lock_path.with_suffix('.tmp.json')
        temporary.write_text(json.dumps(lock, indent=2))
        temporary.replace(lock_path)
        print(f'Cached {model} at {revision}', flush=True)
