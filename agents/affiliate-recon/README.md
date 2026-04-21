# @marker/agent-affiliate-recon

**Purpose:** Affiliate link reconnaissance and validation agent for Links Marker.

**Tier:** 3 (Approve) — requires human approval before updating affiliate configurations.

**Site:** Links Marker

**Transfer Target:** ML-916

**Status:** Shadow mode, not yet running.

**Schedule:** Weeks 7–8

## Actions

- `external_api` — scans affiliate networks for link status and opportunities
- `file_write` — updates affiliate link configuration files

## Shadow Mode

All outputs are captured for human review. No real actions are taken until graduation threshold (50 reviewed outputs) is met and human approval is granted.
