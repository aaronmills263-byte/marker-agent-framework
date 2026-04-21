# @marker/agent-weekly-bi

**Purpose:** Weekly business intelligence reporting agent spanning all Marker sites.

**Tier:** 2 (Notify) — logs and notifies on report generation, no approval required.

**Site:** Multi-site

**Transfer Target:** Marmalade Weekly BI Agent (ID TBD)

**Status:** Shadow mode, not yet running.

**Schedule:** Weeks 9–10

## Actions

- `file_write` — generates and writes BI report files
- `external_api` — pulls analytics data from site APIs

## Shadow Mode

All outputs are captured for human review. No real actions are taken until graduation threshold (50 reviewed outputs) is met and human approval is granted.
