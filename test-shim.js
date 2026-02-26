/**
 * Simple shim module exposing the scoring logic for Node-based tests.
 * This mirrors the computeScore function used in the browser game.
 */

/**
 * Compute the total score from patients treated and assessments passed.
 * @param {number} patientsTreated - Number of patients successfully treated.
 * @param {number} assessmentsPassed - Number of assessments passed.
 * @returns {number} Total score.
 */
function computeScore(patientsTreated, assessmentsPassed) {
  if (
    typeof patientsTreated !== "number" ||
    typeof assessmentsPassed !== "number"
  ) {
    throw new Error("Score inputs must be numeric.");
  }
  if (patientsTreated < 0 || assessmentsPassed < 0) {
    throw new Error("Score inputs must be non-negative.");
  }
  return patientsTreated * 1 + assessmentsPassed * 2;
}

module.exports = {
  CertQuest: {
    computeScore,
  },
};

