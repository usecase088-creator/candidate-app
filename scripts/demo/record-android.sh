#!/usr/bin/env bash
# Client walkthrough video, Android part: records ONE video per demo flow on the USB phone (preview build), with Maestro's command
# log and the recording start time (so scripts/demo/make-video.py --platform android can line captions up with the screen).
# Usage: bash scripts/demo/record-android.sh <output folder> [flows...]
# Needs: the phone on USB with the preview app installed (work.apronhanger.candidate.preview), maestro and adb on PATH, .env.local.
# Reseeds the dev database first (staging reads it), wakes the staging server, and never touches production.
set -u
cd "$(dirname "$0")/../.."
OUT="${1:?output folder}"; shift
FLOWS="${*:-account-delete auth-signup guest-browse jobs-search-filters jobs-browse-save jobs-gov-intl profile-builder apply-quick application-documents application-interview application-offer notification-open auth-login auth-forgot-password}"
PKG=work.apronhanger.candidate.preview
mkdir -p "$OUT"
now_ms() { date +%s%3N; }

echo "phone:"; adb devices | sed -n 2p
[ "$(adb devices | grep -c 'device$')" = "1" ] || { echo "need exactly one phone on USB"; exit 1; }

echo "reseed"
set -a; . ./.env.local; set +a
if npm run backend:local -- --no-start --source ../job-hotfix/backend >"${TMPDIR:-${TEMP:-/tmp}}/reseed.log" 2>&1; then echo "  reseeded"
else echo "  normal reseed failed: IPv4 route"; (cd .reference-backend && node ../scripts/demo/reseed-ipv4.cjs) | tail -2 | cut -c1-120; fi

echo "wake staging"
for i in $(seq 1 24); do curl -sf -m 20 https://apronhanger-staging-api.onrender.com/health >/dev/null && break; sleep 5; done

# The flows are the iPhone demo flows with the preview app's id.
rm -rf "$OUT/flows"; cp -R e2e/demo "$OUT/flows"
find "$OUT/flows" -name '*.yaml' -exec sed -i "s/work\.apronhanger\.candidate\.dev/$PKG/g" {} +

# Clean status bar (best effort: some phone makers ignore demo mode).
adb shell settings put global sysui_demo_allowed 1 >/dev/null
for c in "-e command enter" "-e command clock -e hhmm 0941" "-e command battery -e level 100 -e plugged false" "-e command network -e wifi show -e level 4" "-e command network -e mobile show -e datatype none -e level 4" "-e command notifications -e visible false"; do
  adb shell am broadcast -a com.android.systemui.demo $c >/dev/null
done

RESULT=0
for n in $FLOWS; do
  echo "=== $n"
  adb shell am force-stop $PKG; adb shell pm clear $PKG >/dev/null
  adb shell input keyevent KEYCODE_WAKEUP; adb shell input keyevent KEYCODE_HOME
  rm -rf "$HOME/.maestro/tests"
  adb shell rm -f /sdcard/demo.mp4
  T0=$(now_ms)
  adb shell screenrecord --time-limit 175 --bit-rate 10000000 /sdcard/demo.mp4 &
  REC=$!
  sleep 2
  echo "$T0 $T0" > "$OUT/sync-$n.txt"
  maestro test "$OUT/flows/$n.yaml" --format junit --output "$OUT/report-$n.xml" || RESULT=1
  sleep 2
  adb shell pkill -INT screenrecord; wait $REC 2>/dev/null; sleep 2
  adb pull /sdcard/demo.mp4 "$OUT/video-$n.mp4" >/dev/null
  mkdir -p "$OUT/maestro-$n"; cp -R "$HOME/.maestro/tests/." "$OUT/maestro-$n/" 2>/dev/null
done
adb shell am broadcast -a com.android.systemui.demo -e command exit >/dev/null
echo "done, result=$RESULT"
exit $RESULT
