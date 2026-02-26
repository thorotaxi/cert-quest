/* eslint-disable no-console */

/**
 * Lightweight tests for Cert Quest scoring.
 * Run with: node tests.js
 */

const { CertQuest } = require("./test-shim");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label} failed: expected ${expected}, received ${actual}`
    );
  }
}

function runTests() {
  console.log("Running Cert Quest tests...");

  assertEqual(CertQuest.computeScore(0, 0), 0, "score zero");
  assertEqual(CertQuest.computeScore(5, 0), 5, "score patients only");
  assertEqual(CertQuest.computeScore(0, 3), 6, "score assessments only");
  assertEqual(CertQuest.computeScore(4, 2), 8, "score combined");

  console.log("All tests passed.");
}

runTests();

