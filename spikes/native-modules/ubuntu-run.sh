#!/bin/bash
# Runs inside an Ubuntu image as uid 1000: start the AppImage given as $2, name results after $1.
unshare --user true 2>/dev/null && echo "userns: allowed" || echo "userns: blocked"
cp "$2" /tmp/a.AppImage
SPIKE_OUT=/spike/results/$1.json timeout 60 /tmp/a.AppImage --appimage-extract-and-run > /spike/results/$1.log 2>&1; echo "$1 exit $?"
