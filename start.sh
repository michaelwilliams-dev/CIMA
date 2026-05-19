#!/usr/bin/env bash
set -e

echo "AIVS STARTUP: starting service"

if [ "${GRANITE_ENABLED:-false}" = "true" ]; then
  echo "AIVS STARTUP: Granite enabled"
  echo "AIVS STARTUP: starting Ollama server"

  ollama serve &
  OLLAMA_PID=$!

  echo "AIVS STARTUP: waiting for Ollama"
  sleep 8

  GRANITE_MODEL_NAME="${GRANITE_MODEL:-granite3.2-vision:2b}"

  echo "AIVS STARTUP: pulling/checking model ${GRANITE_MODEL_NAME}"
  ollama pull "${GRANITE_MODEL_NAME}" || echo "AIVS WARNING: Granite model pull failed"

  echo "AIVS STARTUP: Ollama PID ${OLLAMA_PID}"
else
  echo "AIVS STARTUP: Granite disabled"
fi

echo "AIVS STARTUP: starting Node server"
node server.js
