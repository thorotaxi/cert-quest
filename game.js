/**
 * Main game module for Cert Quest.
 * Renders a retro-style browser game using a canvas-based loop.
 */

// Canvas setup
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// HUD elements
const knowledgeFillEl = document.getElementById("knowledge-fill");
const knowledgePercentEl = document.getElementById("knowledge-percent");
const mistakeFillEl = document.getElementById("mistake-fill");
const mistakeCountEl = document.getElementById("mistake-count");
const patientsTreatedEl = document.getElementById("patients-treated");
const assessmentsPassedEl = document.getElementById("assessments-passed");

// Screens
const startScreenEl = document.getElementById("start-screen");
const gameOverScreenEl = document.getElementById("game-over-screen");
const startButtonEl = document.getElementById("start-button");
const restartButtonEl = document.getElementById("restart-button");
const finalScoreLineEl = document.getElementById("final-score-line");
const finalBreakdownLineEl = document.getElementById("final-breakdown-line");

// Game constants
const GAME_STATE = {
  START: "start",
  PLAYING: "playing",
  GAME_OVER: "game_over",
};

const FLOOR_Y = canvas.height - 60;
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 52;
const PLAYER_SPEED = 220;
const JUMP_VELOCITY = -420;
const GRAVITY = 1100;

const ITEM_TYPES = {
  KNOWLEDGE: "knowledge",
  MISTAKE: "mistake",
  ASSESSMENT: "assessment",
};

const KNOWLEDGE_PICKUP_AMOUNT = 10;
const KNOWLEDGE_EROSION_STEP = 5;
const KNOWLEDGE_EROSION_INTERVAL_MS = 3000;
const KNOWLEDGE_MIN = 0;
const KNOWLEDGE_MAX = 100;
const KNOWLEDGE_WARNING_THRESHOLD = 30;

const MAX_MISTAKES = 5;

const PATIENT_VISIBLE_MS = 8000;
const PATIENT_GAP_MS = 2000;
const PATIENT_TREAT_DURATION_MS = 2000;

const ITEM_SPAWN_INTERVAL_MIN_MS = 900;
const ITEM_SPAWN_INTERVAL_MAX_MS = 1800;

const GROUND_MISTAKE_DURATION_MS = 2000;
const GROUND_MISTAKE_SPAWN_INTERVAL_MIN_MS = 2400;
const GROUND_MISTAKE_SPAWN_INTERVAL_MAX_MS = 5600;

// State
let gameState = GAME_STATE.START;

const inputState = {
  left: false,
  right: false,
  jump: false,
};

const player = {
  x: canvas.width / 2 - PLAYER_WIDTH / 2,
  y: FLOOR_Y - PLAYER_HEIGHT,
  vx: 0,
  vy: 0,
  onGround: true,
  facing: 1,
};

const knowledgeState = {
  percent: 50,
  timeSinceErosionMs: 0,
};

const mistakesState = {
  count: 0,
};

const scoreState = {
  patientsTreated: 0,
  assessmentsPassed: 0,
};

const fallingItems = [];

const itemSpawnState = {
  timeSinceLastSpawnMs: 0,
  nextSpawnDelayMs: randomBetween(
    ITEM_SPAWN_INTERVAL_MIN_MS,
    ITEM_SPAWN_INTERVAL_MAX_MS
  ),
};

const assessmentState = {
  pending: false,
};

const patientState = {
  active: null,
  timeSinceLastPatientGoneMs: PATIENT_GAP_MS,
  contactDurationMs: 0,
};

const groundMistakes = [];
const groundMistakeSpawnState = {
  timeSinceLastSpawnMs: 0,
  nextSpawnDelayMs: randomBetween(
    GROUND_MISTAKE_SPAWN_INTERVAL_MIN_MS,
    GROUND_MISTAKE_SPAWN_INTERVAL_MAX_MS
  ),
};

let lastTimestamp = null;

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

/**
 * Clamp a numeric value between min and max.
 * @param {number} value - Value to clamp.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {number} Clamped value.
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Generate a random integer between min and max inclusive.
 * @param {number} min - Minimum integer.
 * @param {number} max - Maximum integer.
 * @returns {number} Random integer in range.
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Start or restart the game, resetting all state.
 */
function startGame() {
  gameState = GAME_STATE.PLAYING;
  startScreenEl.classList.remove("visible");
  gameOverScreenEl.classList.remove("visible");

  player.x = canvas.width / 2 - PLAYER_WIDTH / 2;
  player.y = FLOOR_Y - PLAYER_HEIGHT;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;

  knowledgeState.percent = 50;
  knowledgeState.timeSinceErosionMs = 0;
  mistakesState.count = 0;

  scoreState.patientsTreated = 0;
  scoreState.assessmentsPassed = 0;

  fallingItems.length = 0;
  itemSpawnState.timeSinceLastSpawnMs = 0;
  itemSpawnState.nextSpawnDelayMs = randomBetween(
    ITEM_SPAWN_INTERVAL_MIN_MS,
    ITEM_SPAWN_INTERVAL_MAX_MS
  );

  assessmentState.pending = false;

  patientState.active = null;
  patientState.timeSinceLastPatientGoneMs = PATIENT_GAP_MS;
  patientState.contactDurationMs = 0;

  groundMistakes.length = 0;
  groundMistakeSpawnState.timeSinceLastSpawnMs = 0;
  groundMistakeSpawnState.nextSpawnDelayMs = randomBetween(
    GROUND_MISTAKE_SPAWN_INTERVAL_MIN_MS,
    GROUND_MISTAKE_SPAWN_INTERVAL_MAX_MS
  );

  lastTimestamp = null;
  updateHud();
}

/**
 * Trigger game over, compute score, and show summary screen.
 */
function endGame() {
  gameState = GAME_STATE.GAME_OVER;
  const totalScore = computeScore(
    scoreState.patientsTreated,
    scoreState.assessmentsPassed
  );
  finalScoreLineEl.textContent = `Score: ${totalScore} pts`;
  finalBreakdownLineEl.textContent = `(${scoreState.patientsTreated} patients x 1) + (${scoreState.assessmentsPassed} assessments x 2)`;
  gameOverScreenEl.classList.add("visible");
}

/**
 * Handle keyboard down events.
 * @param {KeyboardEvent} event - Keyboard event.
 */
function handleKeyDown(event) {
  if (event.key === "ArrowLeft") {
    inputState.left = true;
  } else if (event.key === "ArrowRight") {
    inputState.right = true;
  } else if (event.code === "Space") {
    inputState.jump = true;
  }
}

/**
 * Handle keyboard up events.
 * @param {KeyboardEvent} event - Keyboard event.
 */
function handleKeyUp(event) {
  if (event.key === "ArrowLeft") {
    inputState.left = false;
  } else if (event.key === "ArrowRight") {
    inputState.right = false;
  } else if (event.code === "Space") {
    inputState.jump = false;
  }
}

/**
 * Update the HUD elements based on current state.
 */
function updateHud() {
  const knowledgePercent = clamp(
    Math.round(knowledgeState.percent),
    KNOWLEDGE_MIN,
    KNOWLEDGE_MAX
  );
  knowledgeFillEl.style.width = `${knowledgePercent}%`;
  knowledgePercentEl.textContent = `${knowledgePercent}%`;

  const thermometer = knowledgeFillEl.parentElement?.parentElement;
  if (thermometer) {
    if (knowledgePercent < KNOWLEDGE_WARNING_THRESHOLD) {
      thermometer.classList.add("knowledge-low");
      knowledgePercentEl.classList.add("knowledge-critical-text");
    } else {
      thermometer.classList.remove("knowledge-low");
      knowledgePercentEl.classList.remove("knowledge-critical-text");
    }
  }

  const mistakeRatio = mistakesState.count / MAX_MISTAKES;
  mistakeFillEl.style.width = `${Math.round(mistakeRatio * 100)}%`;
  mistakeCountEl.textContent = `${mistakesState.count} / ${MAX_MISTAKES}`;

  patientsTreatedEl.textContent = String(scoreState.patientsTreated);
  assessmentsPassedEl.textContent = String(scoreState.assessmentsPassed);
}

/**
 * Spawn a falling item at a random horizontal position.
 * MK items are more common than mistake items.
 */
function spawnRandomItem() {
  let type = ITEM_TYPES.KNOWLEDGE;
  const roll = Math.random();
  if (roll > 0.825) {
    type = ITEM_TYPES.MISTAKE;
  }

  const width = 22;
  const height = 26;
  const x = randomBetween(20, canvas.width - 20 - width);
  const y = -height;

  let vy;
  if (type === ITEM_TYPES.KNOWLEDGE) {
    vy = 180;
  } else {
    vy = 260;
  }

  fallingItems.push({
    type,
    x,
    y,
    width,
    height,
    vy,
  });
}

/**
 * Spawn an assessment item when knowledge is full.
 */
function spawnAssessmentItem() {
  const width = 26;
  const height = 30;
  const x = randomBetween(20, canvas.width - 20 - width);
  const y = -height;

  fallingItems.push({
    type: ITEM_TYPES.ASSESSMENT,
    x,
    y,
    width,
    height,
    vy: 133,
  });
}

/**
 * Update player position and velocity based on input and physics.
 * @param {number} dtSeconds - Delta time in seconds.
 */
function updatePlayer(dtSeconds) {
  player.vx = 0;
  if (inputState.left) {
    player.vx -= PLAYER_SPEED;
    player.facing = -1;
  }
  if (inputState.right) {
    player.vx += PLAYER_SPEED;
    player.facing = 1;
  }

  if (inputState.jump && player.onGround) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
  }

  player.vy += GRAVITY * dtSeconds;

  player.x += player.vx * dtSeconds;
  player.y += player.vy * dtSeconds;

  if (player.y + PLAYER_HEIGHT >= FLOOR_Y) {
    player.y = FLOOR_Y - PLAYER_HEIGHT;
    player.vy = 0;
    player.onGround = true;
  }

  player.x = clamp(player.x, 0, canvas.width - PLAYER_WIDTH);
}

/**
 * Axis-aligned bounding box intersection test.
 * @param {{x:number,y:number,width:number,height:number}} a - First box.
 * @param {{x:number,y:number,width:number,height:number}} b - Second box.
 * @returns {boolean} Whether the boxes intersect.
 */
function intersects(a, b) {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  );
}

/**
 * Compute a slightly shrunken hit box for the player to make
 * catching and dodging feel a bit fairer.
 * @returns {{x:number,y:number,width:number,height:number}}
 */
function getPlayerHitBox() {
  const paddingX = 4;
  const paddingTop = 6;
  const paddingBottom = 6;
  return {
    x: player.x + paddingX,
    y: player.y + paddingTop,
    width: PLAYER_WIDTH - paddingX * 2,
    height: PLAYER_HEIGHT - paddingTop - paddingBottom,
  };
}

/**
 * Update knowledge erosion and item spawning.
 * @param {number} dtMs - Delta time in milliseconds.
 */
function updateKnowledgeAndItems(dtMs) {
  knowledgeState.timeSinceErosionMs += dtMs;
  if (knowledgeState.timeSinceErosionMs >= KNOWLEDGE_EROSION_INTERVAL_MS) {
    if (knowledgeState.percent > KNOWLEDGE_MIN) {
      knowledgeState.percent = clamp(
        knowledgeState.percent - KNOWLEDGE_EROSION_STEP,
        KNOWLEDGE_MIN,
        KNOWLEDGE_MAX
      );
      updateHud();
    }
    knowledgeState.timeSinceErosionMs = 0;
  }

  if (
    !assessmentState.pending &&
    Math.round(knowledgeState.percent) >= KNOWLEDGE_MAX
  ) {
    assessmentState.pending = true;
    spawnAssessmentItem();
  }

  itemSpawnState.timeSinceLastSpawnMs += dtMs;
  if (itemSpawnState.timeSinceLastSpawnMs >= itemSpawnState.nextSpawnDelayMs) {
    spawnRandomItem();
    itemSpawnState.timeSinceLastSpawnMs = 0;
    itemSpawnState.nextSpawnDelayMs = randomBetween(
      ITEM_SPAWN_INTERVAL_MIN_MS,
      ITEM_SPAWN_INTERVAL_MAX_MS
    );
  }
}

/**
 * Update falling items, handle collisions and removals.
 * @param {number} dtSeconds - Delta time in seconds.
 */
function updateFallingItems(dtSeconds) {
  const playerBox = getPlayerHitBox();
  for (let i = fallingItems.length - 1; i >= 0; i -= 1) {
    const item = fallingItems[i];
    item.y += item.vy * dtSeconds;

    if (intersects(playerBox, item)) {
      if (item.type === ITEM_TYPES.KNOWLEDGE) {
        knowledgeState.percent = clamp(
          knowledgeState.percent + KNOWLEDGE_PICKUP_AMOUNT,
          KNOWLEDGE_MIN,
          KNOWLEDGE_MAX
        );
        updateHud();
      } else if (item.type === ITEM_TYPES.MISTAKE) {
        mistakesState.count = clamp(
          mistakesState.count + 1,
          0,
          MAX_MISTAKES
        );
        updateHud();
        if (mistakesState.count >= MAX_MISTAKES) {
          endGame();
          return;
        }
      } else if (item.type === ITEM_TYPES.ASSESSMENT) {
        mistakesState.count = 0;
        knowledgeState.percent = 50;
        assessmentState.pending = false;
        scoreState.assessmentsPassed += 1;
        updateHud();
      }
      fallingItems.splice(i, 1);
      // eslint-disable-next-line no-continue
      continue;
    }

    if (item.y > canvas.height + 40) {
      if (item.type === ITEM_TYPES.ASSESSMENT) {
        assessmentState.pending = false;
      }
      fallingItems.splice(i, 1);
    }
  }
}

/**
 * Update patient spawn, timers, and treatment.
 * @param {number} dtMs - Delta time in milliseconds.
 */
function updatePatient(dtMs) {
  if (!patientState.active) {
    patientState.timeSinceLastPatientGoneMs += dtMs;
    if (patientState.timeSinceLastPatientGoneMs >= PATIENT_GAP_MS) {
      const width = 28;
      const height = 32;
      const x = randomBetween(20, canvas.width - 20 - width);
      const y = FLOOR_Y - height;
      patientState.active = {
        x,
        y,
        width,
        height,
        lifetimeMs: 0,
      };
      patientState.contactDurationMs = 0;
      patientState.timeSinceLastPatientGoneMs = 0;
    }
    return;
  }

  const patient = patientState.active;
  patient.lifetimeMs += dtMs;
  const playerBox = {
    x: player.x,
    y: player.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  };
  const patientBox = {
    x: patient.x,
    y: patient.y,
    width: patient.width,
    height: patient.height,
  };

  const canTreat =
    Math.round(knowledgeState.percent) >= KNOWLEDGE_WARNING_THRESHOLD;

  if (canTreat && intersects(playerBox, patientBox)) {
    patientState.contactDurationMs += dtMs;
    if (patientState.contactDurationMs >= PATIENT_TREAT_DURATION_MS) {
      scoreState.patientsTreated += 1;
      updateHud();
      patientState.active = null;
      patientState.timeSinceLastPatientGoneMs = 0;
      patientState.contactDurationMs = 0;
      return;
    }
  } else {
    patientState.contactDurationMs = 0;
  }

  if (patient.lifetimeMs >= PATIENT_VISIBLE_MS) {
    patientState.active = null;
    patientState.timeSinceLastPatientGoneMs = 0;
    patientState.contactDurationMs = 0;
  }
}

/**
 * Spawn a ground mistake (red book on the floor); player must jump over it.
 */
function spawnGroundMistake() {
  const width = 22;
  const height = 26;
  const x = randomBetween(20, canvas.width - 20 - width);
  const y = FLOOR_Y - height;
  groundMistakes.push({
    x,
    y,
    width,
    height,
    lifetimeMs: 0,
  });
}

/**
 * Update ground mistakes: spawn, lifetime, and collision with player.
 * @param {number} dtMs - Delta time in milliseconds.
 */
function updateGroundMistakes(dtMs) {
  groundMistakeSpawnState.timeSinceLastSpawnMs += dtMs;
  if (
    groundMistakeSpawnState.timeSinceLastSpawnMs >=
    groundMistakeSpawnState.nextSpawnDelayMs
  ) {
    spawnGroundMistake();
    groundMistakeSpawnState.timeSinceLastSpawnMs = 0;
    groundMistakeSpawnState.nextSpawnDelayMs = randomBetween(
      GROUND_MISTAKE_SPAWN_INTERVAL_MIN_MS,
      GROUND_MISTAKE_SPAWN_INTERVAL_MAX_MS
    );
  }

  const playerBox = getPlayerHitBox();

  for (let i = groundMistakes.length - 1; i >= 0; i -= 1) {
    const ob = groundMistakes[i];
    ob.lifetimeMs += dtMs;

    if (intersects(playerBox, ob)) {
      mistakesState.count = clamp(
        mistakesState.count + 1,
        0,
        MAX_MISTAKES
      );
      updateHud();
      groundMistakes.splice(i, 1);
      if (mistakesState.count >= MAX_MISTAKES) {
        endGame();
        return;
      }
      continue;
    }

    if (ob.lifetimeMs >= GROUND_MISTAKE_DURATION_MS) {
      groundMistakes.splice(i, 1);
    }
  }
}

/**
 * Render the skyline background with muted colors.
 */
function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#101020");
  gradient.addColorStop(0.5, "#050510");
  gradient.addColorStop(1, "#020208");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#15152a";
  ctx.fillRect(0, FLOOR_Y + 12, canvas.width, canvas.height - FLOOR_Y - 12);

  const buildings = [
    { x: 20, width: 80, height: 180 },
    { x: 140, width: 60, height: 150 },
    { x: 230, width: 110, height: 210, medical: true },
    { x: 380, width: 90, height: 160 },
    { x: 500, width: 120, height: 220, medical: true },
    { x: 660, width: 80, height: 170 },
  ];

  buildings.forEach((b) => {
    const baseY = FLOOR_Y + 10;
    ctx.fillStyle = "#181833";
    ctx.fillRect(b.x, baseY - b.height, b.width, b.height);

    ctx.fillStyle = "#1f1f42";
    for (let wy = baseY - 10; wy > baseY - b.height + 10; wy -= 18) {
      for (let wx = b.x + 6; wx < b.x + b.width - 8; wx += 16) {
        if (Math.random() < 0.45) {
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }

    if (b.medical) {
      ctx.fillStyle = "#20264a";
      ctx.fillRect(b.x + b.width / 2 - 12, baseY - b.height - 18, 24, 18);

      ctx.fillStyle = "#f04b4b";
      const cx = b.x + b.width / 2;
      const cy = baseY - b.height - 9;
      ctx.fillRect(cx - 6, cy - 2, 12, 4);
      ctx.fillRect(cx - 2, cy - 6, 4, 12);
    }
  });
}

/**
 * Draw the ground.
 */
function drawGround() {
  ctx.fillStyle = "#19192b";
  ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y);

  ctx.fillStyle = "#242444";
  for (let x = 0; x < canvas.width; x += 32) {
    ctx.fillRect(x, FLOOR_Y, 16, 4);
  }
}

/**
 * Draw the doctor sprite using simple pixel blocks.
 */
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + PLAYER_WIDTH / 2, player.y + PLAYER_HEIGHT);
  ctx.scale(player.facing, 1);
  ctx.translate(-PLAYER_WIDTH / 2, -PLAYER_HEIGHT);

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(8, -1, 16, 11);

  ctx.fillStyle = "#b8956e";
  ctx.fillRect(10, 0, 12, 12);

  ctx.fillStyle = "#2b2b3f";
  ctx.fillRect(12, 12, 8, 6);

  ctx.fillStyle = "#f5f5ff";
  ctx.fillRect(6, 18, 20, 24);

  ctx.fillStyle = "#d1d1e6";
  ctx.fillRect(6, 30, 20, 2);

  ctx.fillStyle = "#f5f5ff";
  ctx.fillRect(6, 18, 8, 18);
  ctx.fillRect(18, 18, 8, 18);

  ctx.fillStyle = "#b8956e";
  ctx.fillRect(4, 26, 4, 8);
  ctx.fillRect(24, 26, 4, 8);

  ctx.fillStyle = "#c0c0ff";
  ctx.beginPath();
  ctx.arc(16, 22, 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#c0c0ff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#c0c0ff";
  ctx.fillRect(16, 18, 2, 8);

  ctx.fillStyle = "#3c3c5c";
  ctx.fillRect(8, 42, 7, 10);
  ctx.fillRect(17, 42, 7, 10);

  ctx.restore();
}

/**
 * Draw a falling item: book or assessment.
 * @param {object} item - Falling item object.
 */
function drawItem(item) {
  ctx.save();

  if (item.type === ITEM_TYPES.KNOWLEDGE) {
    ctx.fillStyle = "#0f9d58";
    ctx.fillRect(item.x, item.y, item.width, item.height);
    ctx.fillStyle = "#0c7040";
    ctx.fillRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);
    ctx.fillStyle = "#e5ffe5";
    ctx.font = "10px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MK", item.x + item.width / 2, item.y + item.height / 2);
  } else if (item.type === ITEM_TYPES.MISTAKE) {
    ctx.fillStyle = "#c62828";
    ctx.fillRect(item.x, item.y, item.width, item.height);
    ctx.fillStyle = "#8b1b1b";
    ctx.fillRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);
    ctx.fillStyle = "#ffe5e5";
    ctx.font = "10px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ERR", item.x + item.width / 2, item.y + item.height / 2);
  } else if (item.type === ITEM_TYPES.ASSESSMENT) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const outerR = 14;
    const innerR = 6;
    const rays = 8;

    ctx.beginPath();
    for (let i = 0; i < rays * 2; i += 1) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (Math.PI * 2 * i) / (rays * 2) - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = "#ffcc00";
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a ground mistake obstacle (red book on the floor).
 * @param {object} ob - Ground mistake object with x, y, width, height.
 */
function drawGroundMistake(ob) {
  ctx.save();
  ctx.fillStyle = "#c62828";
  ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
  ctx.fillStyle = "#8b1b1b";
  ctx.fillRect(ob.x + 2, ob.y + 2, ob.width - 4, ob.height - 4);
  ctx.fillStyle = "#ffe5e5";
  ctx.font = "10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "ERR",
    ob.x + ob.width / 2,
    ob.y + ob.height / 2
  );
  ctx.restore();
}

/**
 * Draw the active patient, if any (stretcher with bandaged person).
 */
function drawPatient() {
  if (!patientState.active) {
    return;
  }

  const p = patientState.active;
  ctx.save();

  const stretcherY = p.y + p.height - 4;
  const stretcherH = 6;

  ctx.fillStyle = "#2a2a3a";
  ctx.fillRect(p.x - 2, stretcherY, p.width + 4, stretcherH);
  ctx.strokeStyle = "#3f3f5a";
  ctx.strokeRect(p.x - 2, stretcherY, p.width + 4, stretcherH);

  ctx.fillStyle = "#4a4a6a";
  ctx.fillRect(p.x, stretcherY + 2, 4, stretcherH - 2);
  ctx.fillRect(p.x + p.width - 4, stretcherY + 2, 4, stretcherH - 2);

  const ly = stretcherY - 10;
  ctx.fillStyle = "#fff8f0";
  ctx.fillRect(p.x + 8, ly + 2, 18, 8);
  ctx.fillStyle = "#e8d5c4";
  ctx.fillRect(p.x + 2, ly, 10, 10);
  ctx.fillRect(p.x + 24, ly + 4, 4, 6);

  ctx.fillStyle = "#f0e0d0";
  ctx.fillRect(p.x + 8, ly, 2, 12);
  ctx.fillRect(p.x + 26, ly, 2, 12);

  ctx.fillStyle = "rgba(255,240,200,0.95)";
  ctx.fillRect(p.x + 4, ly + 2, 6, 4);
  ctx.strokeStyle = "#b8956e";
  ctx.strokeRect(p.x + 4, ly + 2, 6, 4);

  ctx.fillStyle = "#c62828";
  ctx.fillRect(p.x + 15, ly + 4, 4, 4);
  ctx.fillRect(p.x + 14, ly + 5, 6, 2);
  ctx.strokeStyle = "#8b0000";
  ctx.strokeRect(p.x + 15, ly + 4, 4, 4);
  ctx.strokeRect(p.x + 14, ly + 5, 6, 2);

  const canTreat =
    Math.round(knowledgeState.percent) >= KNOWLEDGE_WARNING_THRESHOLD;

  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "center";
  if (!canTreat) {
    ctx.fillStyle = "#f5d14f";
    ctx.fillText("Need more knowledge", p.x + p.width / 2, p.y - 12);
    ctx.fillStyle = "#fff8e0";
    ctx.fillText("PATIENT", p.x + p.width / 2, p.y - 2);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(p.x - 2, p.y, p.width + 4, p.height);
  } else {
    ctx.fillStyle = "#fff8e0";
    ctx.fillText("PATIENT", p.x + p.width / 2, p.y - 2);
  }

  if (canTreat && patientState.contactDurationMs > 0) {
    const fraction = clamp(
      patientState.contactDurationMs / PATIENT_TREAT_DURATION_MS,
      0,
      1
    );
    ctx.strokeStyle = "#2ecc71";
    ctx.strokeRect(p.x - 2, p.y - 8, p.width + 4, 5);
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(p.x - 2, p.y - 8, (p.width + 4) * fraction, 5);
  }

  ctx.restore();
}

/**
 * Main game loop callback.
 * @param {DOMHighResTimeStamp} timestamp - Current timestamp.
 */
function gameLoop(timestamp) {
  if (gameState !== GAME_STATE.PLAYING) {
    requestAnimationFrame(gameLoop);
    return;
  }

  if (lastTimestamp == null) {
    lastTimestamp = timestamp;
  }

  const dtMs = timestamp - lastTimestamp;
  const dtSeconds = dtMs / 1000;
  lastTimestamp = timestamp;

  updatePlayer(dtSeconds);
  updateKnowledgeAndItems(dtMs);
  updateFallingItems(dtSeconds);
  if (gameState === GAME_STATE.GAME_OVER) {
    requestAnimationFrame(gameLoop);
    return;
  }
  updatePatient(dtMs);
  updateGroundMistakes(dtMs);
  if (gameState === GAME_STATE.GAME_OVER) {
    requestAnimationFrame(gameLoop);
    return;
  }

  drawBackground();
  drawGround();
  groundMistakes.forEach(drawGroundMistake);
  drawPatient();
  drawPlayer();
  fallingItems.forEach(drawItem);

  requestAnimationFrame(gameLoop);
}

startButtonEl.addEventListener("click", () => {
  if (gameState === GAME_STATE.START || gameState === GAME_STATE.GAME_OVER) {
    startGame();
  }
});

restartButtonEl.addEventListener("click", () => {
  if (gameState === GAME_STATE.GAME_OVER) {
    startGame();
  }
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

drawBackground();
drawGround();
drawPlayer();

requestAnimationFrame(gameLoop);

window.CertQuest = {
  computeScore,
};

