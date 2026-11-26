# Starts orphan.mjs, SIGKILLs main, reports whether the core process is still alive.
import json, os, signal, subprocess, time
p = subprocess.Popen(['./node_modules/electron/dist/electron', 'orphan.mjs'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
for line in p.stdout:
    if '"core"' in line:
        ids = json.loads(line); break
os.kill(ids['main'], signal.SIGKILL)
time.sleep(2)
alive = os.path.exists(f"/proc/{ids['core']}")
print(json.dumps({**ids, 'coreAliveAfterMainKilled': alive}))
if alive: os.kill(ids['core'], signal.SIGKILL)
