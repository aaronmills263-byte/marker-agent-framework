#!/usr/bin/env node
/**
 * PreToolUse CLI — thin wrapper invoked by the generated shell script.
 * Reads JSON from stdin, runs the handler, exits with appropriate code.
 */
import { main } from "./pretooluse.js";

main();
