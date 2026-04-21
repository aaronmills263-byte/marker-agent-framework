#!/usr/bin/env node
/**
 * PostToolUse CLI — thin wrapper invoked by the generated shell script.
 * Reads JSON from stdin, runs the handler, exits 0 always (audit only).
 */
import { main } from "./posttooluse.js";

main();
