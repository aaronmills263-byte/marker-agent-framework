# @marker/kill-switch

Shared disable mechanism for Marker agents. Provides a single function to immediately halt all agent activity across every Marker site, plus a reset path and status check. Agents must poll `isKilled()` before taking actions.
