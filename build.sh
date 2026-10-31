#!/usr/bin/env bash

IMAGE="anthonyzou/teslacamviewer:1.0"

# Build frontend
npm run build

# 1. Build locally
docker build -t "$IMAGE" . --platform linux/amd64

# 2. Stream to Unraid, load, prune old layers, and recreate container
docker save "$IMAGE" | gzip | ssh tower "gunzip | docker load && \
  /usr/local/emhttp/plugins/dynamix.docker.manager/scripts/update_container 'teslaCamViewer' && \
  docker image prune -f"