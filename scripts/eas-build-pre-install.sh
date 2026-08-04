#!/bin/bash
# Write .netrc so Gradle can authenticate with Mapbox's Maven repository
if [ -n "$MAPBOX_DOWNLOADS_TOKEN" ]; then
  echo "machine api.mapbox.com" >> ~/.netrc
  echo "login mapbox" >> ~/.netrc
  echo "password $MAPBOX_DOWNLOADS_TOKEN" >> ~/.netrc
  chmod 600 ~/.netrc
  echo "✓ Mapbox .netrc configured"
fi
