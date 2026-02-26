## Cert Quest

Cert Quest is a small retro / "Google Doodle" style browser game about keeping
up your medical knowledge, avoiding clinical mistakes, and treating patients.

### How to play

- **Move**: Left / Right Arrow keys
- **Jump**: Space

- **Medical Knowledge (green bar)**:
  - Starts at 50% and slowly erodes in 5% steps over time.
  - Catch green **MK** books falling from the sky to increase it by 5% per book.
  - If it drops below 30%, the bar turns yellow and you cannot treat patients
    until it goes back above that threshold.

- **Clinical Mistakes (red bar)**:
  - Starts at 0 and can rise up to 5.
  - Red books increase mistakes by 1 when you collide with them.
  - If it reaches 5, the game ends.
  - Roughly twice as many MK books fall as mistake books, but both are random.

- **Assessments**:
  - When Medical Knowledge reaches 100%, a glowing Assessment paper drops.
  - If you catch it, all Clinical Mistakes are cleared and your knowledge
    resets to 50%.
  - Each Assessment you successfully catch is counted.

- **Patients**:
  - One patient appears at a time on the ground for about 8 seconds, with a
    short delay before the next one appears.
  - To treat a patient, stand over them continuously for 2 seconds while your
    Medical Knowledge is at least 30%.
  - Successfully treated patients increment the "Patients Treated" counter.

- **Scoring**:
  - The game ends when Clinical Mistakes reach 5.
  - Your score is computed as:
    - `1 point × Patients Treated` +
    - `2 points × Assessments Passed`.

### Running the game

You do not need any build tools to play:

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox, or Safari).
2. Read the instructions on the start screen.
3. Click **Begin** to start playing.

### Running the simple tests

The game includes a very small test for the scoring logic:

```bash
node tests.js
```

This requires a recent Node.js installation but no additional dependencies.

### Deploying on Railway

1. Create a new project on [Railway](https://railway.app) and connect your Git repo.
2. Railway will detect the Node.js app, run `npm install` and `npm start`.
3. The app uses the `serve` package to serve the static files and listens on `PORT` (set by Railway).
4. Add a public domain in the Railway dashboard to access the game.

