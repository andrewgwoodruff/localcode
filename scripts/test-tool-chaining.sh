#!/bin/bash
# Runs the tool-chaining test N times and summarizes results.
# Usage: ./scripts/test-tool-chaining.sh [attempts] [dir]
#   attempts: number of runs (default 10)
#   dir: project directory to run in (default ~/dev/platform)

ATTEMPTS=${1:-10}
DIR=${2:-"$HOME/dev/platform"}
PROMPT="Find all files in apps/platform/src/api that contain the word 'merchant', then read the first one you find and tell me what it does."

PASS=0
FAIL=0

echo "Running $ATTEMPTS attempts in $DIR"
echo "Prompt: $PROMPT"
echo "---"

for i in $(seq 1 "$ATTEMPTS"); do
  echo -n "Attempt $i: "
  OUTPUT=$(opencode run --dir "$DIR" --dangerously-skip-permissions "$PROMPT" 2>/dev/null)
  # A successful attempt reads a file and gives a substantive answer (>200 chars mentioning merchant).
  OUTPUT_LEN=$(echo "$OUTPUT" | wc -c)
  if echo "$OUTPUT" | grep -qi "merchant" && [ "$OUTPUT_LEN" -gt 200 ]; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "FAIL"
    echo "  Output: $(echo "$OUTPUT" | tail -3)"
    FAIL=$((FAIL + 1))
  fi
done

echo "---"
echo "Results: $PASS/$ATTEMPTS passed"
