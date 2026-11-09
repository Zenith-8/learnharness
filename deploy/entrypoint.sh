#!/bin/sh
# Bind-mounted /data and /secrets may hold files copied in by the host user
# (data migration over SFTP). Hand them to the node user, then drop root.
set -eu
for dir in /data /secrets; do
	mkdir -p "$dir"
	find "$dir" ! -user node -exec chown node:node {} +
done
chmod 700 /secrets
exec setpriv --reuid=node --regid=node --init-groups -- "$@"
