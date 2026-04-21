# @marker/agent-email-triage

**Purpose:** Email triage and intelligent routing agent for Links Marker.

**Tier:** 3 (Approve) — requires human approval before sending emails or modifying routing rules.

**Site:** Links Marker

**Transfer Target:** ML-915

**Status:** Shadow mode, not yet running.

**Schedule:** Weeks 5–6

## Actions

- `email_send` — sends triaged/routed email responses
- `external_api` — interacts with email provider APIs

## Shadow Mode

All outputs are captured for human review. No real actions are taken until graduation threshold (50 reviewed outputs) is met and human approval is granted.
