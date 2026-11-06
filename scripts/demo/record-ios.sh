#!/usr/bin/env bash
# Starts the ios-demo recording on GitHub and starts it again while GitHub has no macOS runner for it (those attempts end
# "cancelled" after 15 minutes without running anything). Reseeds staging before every attempt. Stops when a run really ran.
# Usage: bash scripts/demo/record-ios.sh [build_id] [flows] [max_attempts]
# Needs GITHUB_TOKEN in .env.local. Prints the run id of the run that executed.
set -u
cd "$(dirname "$0")/../.."
set -a; . ./.env.local; set +a
BUILD="${1:-dd1840c4-a7fc-44a2-9b1e-c763adaa0147}"
FLOWS="${2:-}"
MAX="${3:-8}"
H="Authorization: Bearer $GITHUB_TOKEN"
API="https://api.github.com/repos/usecase088-creator/candidate-app/actions"
for attempt in $(seq 1 "$MAX"); do
  echo "attempt $attempt: reseed staging"
  npm run backend:local -- --no-start --source ../job-hotfix/backend >"${TMPDIR:-${TEMP:-/tmp}}/reseed.log" 2>&1 && echo "  reseeded" || { echo "  reseed failed:"; tail -3 "${TMPDIR:-${TEMP:-/tmp}}/reseed.log"; }
  if [ -n "$FLOWS" ]; then BODY="{\"ref\":\"main\",\"inputs\":{\"build_id\":\"$BUILD\",\"flows\":\"$FLOWS\"}}"; else BODY="{\"ref\":\"main\",\"inputs\":{\"build_id\":\"$BUILD\"}}"; fi
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$H" -H "Accept: application/vnd.github+json" "$API/workflows/ios-demo.yml/dispatches" -d "$BODY")
  echo "  dispatch HTTP $code"
  sleep 30
  RID=$(curl -s -H "$H" "$API/workflows/ios-demo.yml/runs?per_page=1" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).workflow_runs[0].id))')
  echo "  run $RID"
  while true; do
    st=$(curl -s -H "$H" "$API/runs/$RID" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const r=JSON.parse(d);console.log(r.status+" "+(r.conclusion||""))}catch{console.log("unknown")}})')
    case "$st" in completed*) break;; esac
    sleep 60
  done
  runner=$(curl -s -H "$H" "$API/runs/$RID/jobs" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=(JSON.parse(d).jobs||[]).find(x=>x.name==="record");console.log(j&&j.runner_name?"yes":"no")})')
  echo "  finished: $st, runner: $runner"
  if [ "$runner" = "yes" ]; then echo "RAN run=$RID result=$st"; exit 0; fi
done
echo "NO RUNNER after $MAX attempts"; exit 1
