# @marker/agent-regulatory-monitor

**Purpose:** Regulatory compliance monitoring agent for Mountain Marker. Scans regulatory sources and alerts on changes relevant to the business.

**Tier:** 3 (Approve) — requires human approval before sending regulatory alerts.

**Site:** Mountain Marker

**Transfer Target:** ML-915

**Status:** Shadow mode, not yet running.

**Schedule:** Weeks 11–12

## Actions

- `external_api` — monitors regulatory databases and feeds
- `email_send` — sends compliance alerts to stakeholders

## Shadow Mode

All outputs are captured for human review. No real actions are taken until graduation threshold (50 reviewed outputs) is met and human approval is granted.
