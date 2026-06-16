---
name: Expo workflow startup fix
description: How to get restart_workflow to succeed for Expo artifacts in this workspace.
---

## Problem

`restart_workflow` always fails with "didn't open port <N>" for Expo artifacts even when Metro is fully running and responding with HTTP 200. The `router = "expo-domain"` setting in artifact.toml causes the Replit workflow system to check the external Expo domain URL (not localhost), which is unreachable from within the container.

## Fix

Remove `router = "expo-domain"` from artifact.toml. Without it, the system checks the local port directly (e.g. 8099) and succeeds as soon as Metro binds.

**Why:** `router = "expo-domain"` routes the preview through the Expo Go domain. The health-check for this router type presumably validates an external URL that is not reachable from the container's localhost, so it always times out.

**How to apply:** When creating or fixing an Expo artifact, ensure artifact.toml does NOT include `router = "expo-domain"`. Keep `kind = "mobile"` and a `localPort` from the supported list (8099 works well). The Expo QR-code preview still shows in the mobile preview panel.

## Working artifact.toml template

```toml
kind = "mobile"
previewPath = "/"
title = "RunOS"
version = "1.0.0"
id = "artifacts/mobile"

[[integratedSkills]]
name = "expo"
version = "1.0.0"

[[services]]
name = "expo"
paths = [ "/" ]
localPort = 8099

[services.development]
run = "pnpm --filter @workspace/mobile run dev"

[services.production]
build = [ "pnpm", "--filter", "@workspace/mobile", "run", "build" ]
run = [ "pnpm", "--filter", "@workspace/mobile", "run", "serve" ]

[services.env]
PORT = "8099"
BASE_PATH = "/"
```

## Port note

Port 18115 is visible in /proc/net/tcp and responds to curl correctly, but the workflow health-check still fails for reasons unrelated to the port itself — the router type is the real gate. After removing `router = "expo-domain"` the same code works fine on port 8099.
