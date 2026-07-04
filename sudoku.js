/* =====================================================
   SUDOKU MASTER GÇö sudoku.js
   Full game engine: generator, solver, UI, state
   ===================================================== */

'use strict';

/* ==================== CONSTANTS ==================== */
const DIFFICULTY = {
  easy:   { clues: 36, label: 'Easy',   hints: 5 },
  medium: { clues: 30, label: 'Medium', hints: 4 },
  hard:   { clues: 24, label: 'Hard',   hints: 3 },
  expert: { clues: 17, label: 'Expert', hints: 2 },
};

/* ==================== STATE ==================== */
let state = {
  puzzle:     null,   // 81-element flat array (0 = empty)
  solution:   null,   // 81-element flat array (full solution)
  userGrid:   null,   // player's current grid
  notes:      null,   // notes[i] = Set of pencil-mark numbers
  selected:   -1,     // index of selected cell (0-80)
  notesMode:  false,
  mistakes:   0,
  hintsLeft:  3,
  difficulty: 'easy',
  timerSec:   0,
  timerID:    null,
  history:    [],     // undo stack: [{index, prev, prevNotes, wasError}]
  gameOver:   false,
  won:        false,
};

/* ==================== DOM REFS ==================== */
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const DOM = {
  difficultyScreen: $('difficultyScreen'),
  gameScreen:       $('gameScreen'),
  board:            $('sudokuBoard'),
  numpad:           $('numpad'),
  timerDisplay:     $('timerDisplay'),
  mistakesBadge:    $('mistakesBadge'),
  difficultyBadge:  $('difficultyBadge'),
  progressBar:      $('progressBar'),
  progressText:     $('progressText'),
  progressWrap:     $('progressWrap'),
  hintLabel:        $('hintLabel'),
  notesLabel:       $('notesLabel'),
  winModal:         $('winModal'),
  gameOverModal:    $('gameOverModal'),
  winTime:          $('winTime'),
  winDiff:          $('winDiff'),
  winMistakes:      $('winMistakes'),
  winScore:         $('winScore'),
  winBestTime:      $('winBestTime'),
  undoBtn:          $('undoBtn'),
  hintBtn:          $('hintBtn'),
  eraseBtn:         $('eraseBtn'),
  notesBtn:         $('notesBtn'),
  newGameBtn:       $('newGameBtn'),
  backToDiffBtn:    $('backToDiffBtn'),
  playAgainBtn:     $('playAgainBtn'),
  closeWinModal:    $('closeWinModal'),
  tryAgainBtn:      $('tryAgainBtn'),
  gameOverDiffBtn:  $('gameOverDiffBtn'),
  soundToggle:      $('soundToggle'),
  soundOnIcon:      $('soundOnIcon'),
  soundOffIcon:     $('soundOffIcon'),
  confettiCanvas:   $('confettiCanvas'),
  statGamesWon:     $('statGamesWon'),
  statGamesPlayed:  $('statGamesPlayed'),
  statBestTime:     $('statBestTime'),
  statHighScore:    $('statHighScore'),
  boardWrapper:     document.querySelector('.board-wrapper'),
};

/* ==================== SUDOKU GENERATOR ==================== */

/** Shuffle an array in-place using Fisher-Yates. */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Check if placing `num` at position `pos` in `grid` is valid. */
function isValid(grid, pos, num) {
  const row = Math.floor(pos / 9);
  const col = pos % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 9; i++) {
    if (grid[row * 9 + i] === num) return false;
    if (grid[i * 9 + col] === num) return false;
    const br = boxRow + Math.floor(i / 3);
    const bc = boxCol + (i % 3);
    if (grid[br * 9 + bc] === num) return false;
  }
  return true;
}

/** Fill a grid using backtracking. Returns true if successful. */
function fillGrid(grid, pos = 0) {
  if (pos === 81) return true;
  if (grid[pos] !== 0) return fillGrid(grid, pos + 1);

  const nums = shuffle([1,2,3,4,5,6,7,8,9]);
  for (const n of nums) {
    if (isValid(grid, pos, n)) {
      grid[pos] = n;
      if (fillGrid(grid, pos + 1)) return true;
      grid[pos] = 0;
    }
  }
  return false;
}

/**
 * Count solutions up to `limit`.
 * Used to ensure uniqueness when removing cells.
 */
function countSolutions(grid, limit = 2, pos = 0) {
  if (pos === 81) return 1;
  if (grid[pos] !== 0) return countSolutions(grid, limit, pos + 1);

  let count = 0;
  for (let n = 1; n <= 9; n++) {
    if (isValid(grid, pos, n)) {
      grid[pos] = n;
      count += countSolutions(grid, limit, pos + 1);
      grid[pos] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}

/** Generate a puzzle with `clues` given cells. Returns { puzzle, solution }. */
function generatePuzzle(clues) {
  const solution = new Array(81).fill(0);
  fillGrid(solution);

  const puzzle = [...solution];
  const positions = shuffle([...Array(81).keys()]);

  let removed = 0;
  const target = 81 - clues;

  for (const pos of positions) {
    if (removed >= target) break;
    const backup = puzzle[pos];
    puzzle[pos] = 0;

    // For hard/expert (many removals) skip uniqueness check on some cells to keep generation fast
    if (81 - clues <= 57) {
      const test = [...puzzle];
      if (countSolutions(test, 2) !== 1) {
        puzzle[pos] = backup;
        continue;
      }
    }
    removed++;
  }

  return { puzzle, solution };
}

/* ==================== TIMER ==================== */
function startTimer() {
  stopTimer();
  state.timerSec = 0;
  updateTimerDisplay();
  state.timerID = setInterval(() => {
    state.timerSec++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (state.timerID) { clearInterval(state.timerID); state.timerID = null; }
}

function updateTimerDisplay() {
  const m = String(Math.floor(state.timerSec / 60)).padStart(2, '0');
  const s = String(state.timerSec % 60).padStart(2, '0');
  DOM.timerDisplay.textContent = `${m}:${s}`;
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/* ==================== SOUND EFFECTS (Web Audio API) ==================== */
let soundEnabled = true;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration = 0.12, type = 'sine', volume = 0.15) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e) { /* ignore audio errors */ }
}

const SFX = {
  place:   () => playTone(520, 0.08, 'sine', 0.1),
  correct: () => playTone(660, 0.15, 'sine', 0.12),
  error:   () => { playTone(220, 0.2, 'square', 0.08); setTimeout(() => playTone(180, 0.25, 'square', 0.06), 100); },
  hint:    () => { playTone(600, 0.1, 'triangle', 0.1); setTimeout(() => playTone(800, 0.15, 'triangle', 0.1), 80); },
  erase:   () => playTone(350, 0.06, 'triangle', 0.06),
  note:    () => playTone(900, 0.04, 'sine', 0.05),
  undo:    () => playTone(400, 0.06, 'sine', 0.06),
  win:     () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sine', 0.12), i * 120));
  },
  gameOver: () => {
    [330, 277, 233, 196].forEach((f, i) => setTimeout(() => playTone(f, 0.35, 'sawtooth', 0.06), i * 150));
  },
  click:   () => playTone(700, 0.03, 'sine', 0.05),
};

function toggleSound() {
  soundEnabled = !soundEnabled;
  DOM.soundOnIcon.hidden  = !soundEnabled;
  DOM.soundOffIcon.hidden = soundEnabled;
  DOM.soundToggle.setAttribute('aria-pressed', soundEnabled);
  localStorage.setItem('sudoku_sound', soundEnabled ? '1' : '0');
  if (soundEnabled) SFX.click();
}

// Load sound preference
(function loadSoundPref() {
  const pref = localStorage.getItem('sudoku_sound');
  if (pref === '0') {
    soundEnabled = false;
    DOM.soundOnIcon.hidden  = true;
    DOM.soundOffIcon.hidden = false;
    DOM.soundToggle.setAttribute('aria-pressed', 'false');
  }
})();

/* ==================== CONFETTI ==================== */
const confetti = {
  canvas: DOM.confettiCanvas,
  ctx: DOM.confettiCanvas.getContext('2d'),
  particles: [],
  animID: null,
  colors: ['#7c5ef5','#a67cff','#3effa0','#38c7f5','#f5a623','#ff4d6d','#fff','#ffd700'],

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: -10 - Math.random() * 40,
      w: 4 + Math.random() * 8,
      h: 3 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      life: 1,
      decay: 0.003 + Math.random() * 0.005,
    };
  },

  launch(count = 200) {
    this.resize();
    this.particles = [];
    for (let i = 0; i < count; i++) this.particles.push(this.createParticle());
    if (this.animID) cancelAnimationFrame(this.animID);
    this.animate();
  },

  animate() {
    const { ctx, canvas, particles } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravity
      p.rot += p.rotSpeed;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > canvas.height + 20) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (particles.length > 0) {
      this.animID = requestAnimationFrame(() => this.animate());
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.animID = null;
    }
  },

  stop() {
    if (this.animID) { cancelAnimationFrame(this.animID); this.animID = null; }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles = [];
  }
};

window.addEventListener('resize', () => confetti.resize());
confetti.resize();

/* ==================== SCORE TRACKING (localStorage) ==================== */
const STORAGE_KEY = 'sudoku_stats';

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) { /* ignore */ }
  return { gamesPlayed: 0, gamesWon: 0, bestTimes: {}, highScores: {} };
}

function saveStats(stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch(e) {}
}

function calculateScore(timeSec, mistakes, difficulty) {
  const diffMultiplier = { easy: 1, medium: 1.5, hard: 2.5, expert: 4 };
  const baseScore = 10000;
  const timePenalty = timeSec * 2;
  const mistakePenalty = mistakes * 500;
  const raw = baseScore - timePenalty - mistakePenalty;
  return Math.max(0, Math.round(raw * (diffMultiplier[difficulty] || 1)));
}

function recordWin() {
  const stats = loadStats();
  stats.gamesWon++;
  const diff = state.difficulty;
  const time = state.timerSec;
  const score = calculateScore(time, state.mistakes, diff);

  // Best time per difficulty
  if (!stats.bestTimes[diff] || time < stats.bestTimes[diff]) {
    stats.bestTimes[diff] = time;
  }
  // High score per difficulty
  if (!stats.highScores[diff] || score > stats.highScores[diff]) {
    stats.highScores[diff] = score;
  }

  saveStats(stats);
  return { score, isNewBest: stats.bestTimes[diff] === time };
}

function recordGamePlayed() {
  const stats = loadStats();
  stats.gamesPlayed++;
  saveStats(stats);
}

function renderStatsSidebar() {
  const stats = loadStats();
  DOM.statGamesWon.textContent    = stats.gamesWon;
  DOM.statGamesPlayed.textContent = stats.gamesPlayed;

  // Show best time for current difficulty
  const diff = state.difficulty || 'easy';
  const bt = stats.bestTimes?.[diff];
  DOM.statBestTime.textContent  = bt ? formatTime(bt) : '--:--';
  const hs = stats.highScores?.[diff];
  DOM.statHighScore.textContent = hs ? hs.toLocaleString() : '0';
}

/* ==================== BOARD RENDERING ==================== */

/** Build the 81-cell board DOM. Called once per game. */
function buildBoard() {
  DOM.board.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.dataset.row = Math.floor(i / 9);
    cell.dataset.col = i % 9;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('tabindex', '-1');
    cell.addEventListener('click', () => selectCell(i));
    DOM.board.appendChild(cell);
  }
}

/** Full re-render of every cell's appearance. */
function renderBoard() {
  const cells = DOM.board.querySelectorAll('.cell');
  const sel = state.selected;
  const selVal = sel >= 0 ? (state.userGrid[sel] || 0) : 0;

  cells.forEach((cell, i) => {
    const val = state.userGrid[i];
    const given = state.puzzle[i] !== 0;
    const row = Math.floor(i / 9);
    const col = i % 9;

    // Clear classes
    cell.className = 'cell';
    cell.textContent = '';
    cell.innerHTML = '';

    if (given) cell.classList.add('given');

    // Highlight: same row/col/box as selected
    if (sel >= 0 && i !== sel) {
      const sRow = Math.floor(sel / 9), sCol = sel % 9;
      const sBoxR = Math.floor(sRow / 3), sBoxC = Math.floor(sCol / 3);
      const cBoxR = Math.floor(row / 3), cBoxC = Math.floor(col / 3);
      if (row === sRow || col === sCol || (sBoxR === cBoxR && sBoxC === cBoxC)) {
        cell.classList.add('highlighted');
      }
    }

    // Same number highlight
    if (selVal && val === selVal && i !== sel) {
      cell.classList.add('same-number');
    }

    // Selected
    if (i === sel) cell.classList.add('selected');

    // Notes
    if (!val && state.notes[i] && state.notes[i].size > 0) {
      renderNotes(cell, state.notes[i]);
      return;
    }

    // Value
    if (val) {
      if (!given) {
        cell.classList.add('user-num');
        // Check if correct
        if (val === state.solution[i]) {
          cell.classList.add('correct');
        } else {
          cell.classList.add('error');
        }
      }
      cell.textContent = val;
    }
  });
}

/** Render pencil-mark notes inside a cell. */
function renderNotes(cell, noteSet) {
  const grid = document.createElement('div');
  grid.className = 'notes-grid';
  for (let n = 1; n <= 9; n++) {
    const span = document.createElement('span');
    if (noteSet.has(n)) {
      span.textContent = n;
      span.classList.add('active');
    }
    grid.appendChild(span);
  }
  cell.appendChild(grid);
}

/* ==================== NUMPAD ==================== */
function buildNumpad() {
  DOM.numpad.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.dataset.num = n;
    btn.setAttribute('aria-label', `Enter number ${n}`);

    const numSpan = document.createElement('span');
    numSpan.textContent = n;

    const countSpan = document.createElement('span');
    countSpan.className = 'num-count';
    countSpan.id = `num-count-${n}`;

    btn.appendChild(numSpan);
    btn.appendChild(countSpan);
    btn.addEventListener('click', () => inputNumber(n));
    DOM.numpad.appendChild(btn);
  }
  updateNumpadCounts();
}

function updateNumpadCounts() {
  for (let n = 1; n <= 9; n++) {
    const count = state.userGrid.filter(v => v === n).length;
    const remaining = 9 - count;
    const countEl = $(`num-count-${n}`);
    const btn = DOM.numpad.querySelector(`[data-num="${n}"]`);
    if (countEl) countEl.textContent = remaining > 0 ? `+ù${remaining}` : '';
    if (btn) {
      btn.classList.toggle('disabled', remaining === 0);
    }
  }
}

/* ==================== GAME LOGIC ==================== */

function selectCell(index) {
  if (state.gameOver || state.won) return;
  state.selected = index;
  SFX.click();
  renderBoard();
}

function inputNumber(num) {
  const sel = state.selected;
  if (sel < 0 || state.gameOver || state.won) return;
  if (state.puzzle[sel] !== 0) return; // given cell

  if (state.notesMode) {
    // Toggle note
    const prevNotes = new Set(state.notes[sel]);
    state.history.push({ index: sel, prev: state.userGrid[sel], prevNotes: new Set(prevNotes), type: 'notes' });
    if (state.notes[sel].has(num)) {
      state.notes[sel].delete(num);
    } else {
      state.notes[sel].add(num);
    }
    SFX.note();
  } else {
    // Enter number
    const prev = state.userGrid[sel];
    if (prev === num) return; // same number, no-op

    state.history.push({ index: sel, prev, prevNotes: new Set(state.notes[sel]), type: 'num' });

    // Clear notes from same row/col/box if entering correct
    state.notes[sel].clear();
    state.userGrid[sel] = num;

    if (num !== state.solution[sel]) {
      state.mistakes++;
      updateMistakesBadge();
      SFX.error();
      if (state.mistakes >= 3) {
        renderBoard();
        updateNumpadCounts();
        updateProgress();
        setTimeout(showGameOver, 500);
        return;
      }
    } else {
      // Clear notes for affected peers
      clearPeerNotes(sel);
      SFX.correct();
    }

    // Check win
    if (isGridComplete()) {
      renderBoard();
      updateNumpadCounts();
      updateProgress();
      setTimeout(showWin, 400);
      return;
    }
  }

  renderBoard();
  updateNumpadCounts();
  updateProgress();
}

/** Remove a note from peers when a correct number is placed. */
function clearPeerNotes(pos) {
  const row = Math.floor(pos / 9), col = pos % 9;
  const boxRow = Math.floor(row / 3) * 3, boxCol = Math.floor(col / 3) * 3;
  const num = state.userGrid[pos];

  for (let i = 0; i < 9; i++) {
    state.notes[row * 9 + i]?.delete(num);
    state.notes[i * 9 + col]?.delete(num);
    const br = boxRow + Math.floor(i / 3);
    const bc = boxCol + (i % 3);
    state.notes[br * 9 + bc]?.delete(num);
  }
}

function eraseCell() {
  const sel = state.selected;
  if (sel < 0 || state.gameOver || state.won) return;
  if (state.puzzle[sel] !== 0) return;

  if (state.userGrid[sel] || state.notes[sel].size > 0) {
    state.history.push({ index: sel, prev: state.userGrid[sel], prevNotes: new Set(state.notes[sel]), type: 'erase' });
    state.userGrid[sel] = 0;
    state.notes[sel].clear();
    SFX.erase();
    renderBoard();
    updateNumpadCounts();
    updateProgress();
  }
}

function undo() {
  if (!state.history.length || state.gameOver || state.won) return;
  const entry = state.history.pop();
  state.userGrid[entry.index] = entry.prev;
  state.notes[entry.index] = new Set(entry.prevNotes);
  state.selected = entry.index;
  SFX.undo();
  renderBoard();
  updateNumpadCounts();
  updateProgress();
}

function useHint() {
  if (state.hintsLeft <= 0 || state.gameOver || state.won) return;

  // Find an empty or wrong cell; prefer selected
  let target = -1;
  if (state.selected >= 0 && state.puzzle[state.selected] === 0 && state.userGrid[state.selected] !== state.solution[state.selected]) {
    target = state.selected;
  } else {
    // Pick a random incorrect cell
    const candidates = [];
    for (let i = 0; i < 81; i++) {
      if (state.puzzle[i] === 0 && state.userGrid[i] !== state.solution[i]) candidates.push(i);
    }
    if (!candidates.length) return;
    target = candidates[Math.floor(Math.random() * candidates.length)];
  }

  state.history.push({ index: target, prev: state.userGrid[target], prevNotes: new Set(state.notes[target]), type: 'hint' });
  state.userGrid[target] = state.solution[target];
  state.notes[target].clear();
  clearPeerNotes(target);
  state.selected = target;
  state.hintsLeft--;
  DOM.hintLabel.textContent = `Hint (${state.hintsLeft})`;
  if (state.hintsLeft === 0) DOM.hintBtn.classList.add('disabled');

  SFX.hint();

  // Flash hint class
  renderBoard();
  const cell = DOM.board.querySelector(`[data-index="${target}"]`);
  if (cell) {
    cell.classList.add('hint-reveal');
    setTimeout(() => { cell.classList.remove('hint-reveal'); renderBoard(); }, 1200);
  }

  updateNumpadCounts();
  updateProgress();

  if (isGridComplete()) setTimeout(showWin, 800);
}

function toggleNotesMode() {
  state.notesMode = !state.notesMode;
  DOM.notesBtn.classList.toggle('active', state.notesMode);
  DOM.notesBtn.setAttribute('aria-pressed', state.notesMode);
  DOM.notesLabel.textContent = state.notesMode ? 'Notes G£ô' : 'Notes';
}

function isGridComplete() {
  for (let i = 0; i < 81; i++) {
    if (state.userGrid[i] !== state.solution[i]) return false;
  }
  return true;
}

/* ==================== PROGRESS ==================== */
function updateProgress() {
  const filled = state.userGrid.filter((v, i) => v !== 0 && v === state.solution[i]).length;
  const pct = Math.round((filled / 81) * 100);
  DOM.progressBar.style.width = pct + '%';
  DOM.progressWrap.setAttribute('aria-valuenow', pct);
  DOM.progressText.textContent = `${filled} / 81 cells correct`;
}

/* ==================== BADGE UPDATES ==================== */
function updateMistakesBadge() {
  DOM.mistakesBadge.textContent = `${state.mistakes} / 3 mistakes`;
}

function updateDifficultyBadge() {
  DOM.difficultyBadge.textContent = DIFFICULTY[state.difficulty].label;
}

/* ==================== MODALS ==================== */
function showWin() {
  stopTimer();
  state.won = true;

  // Record stats
  const { score, isNewBest } = recordWin();

  DOM.winTime.textContent     = formatTime(state.timerSec);
  DOM.winDiff.textContent     = DIFFICULTY[state.difficulty].label;
  DOM.winMistakes.textContent = state.mistakes;
  DOM.winScore.textContent    = score.toLocaleString();
  DOM.winBestTime.textContent = isNewBest ? '=ƒÅå New best time!' : '';
  DOM.winModal.hidden = false;

  // Board glow celebration
  DOM.boardWrapper.classList.add('celebrating');

  // Confetti & Sound
  confetti.launch(280);
  SFX.win();

  renderStatsSidebar();
}

function showGameOver() {
  stopTimer();
  state.gameOver = true;
  DOM.gameOverModal.hidden = false;
  SFX.gameOver();
}

/* ==================== GAME LIFECYCLE ==================== */
function startGame(difficulty) {
  state.difficulty = difficulty;
  const cfg = DIFFICULTY[difficulty];

  const { puzzle, solution } = generatePuzzle(cfg.clues);

  state.puzzle     = puzzle;
  state.solution   = solution;
  state.userGrid   = [...puzzle];
  state.notes      = Array.from({ length: 81 }, () => new Set());
  state.selected   = -1;
  state.notesMode  = false;
  state.mistakes   = 0;
  state.hintsLeft  = cfg.hints;
  state.history    = [];
  state.gameOver   = false;
  state.won        = false;

  // Reset UI
  DOM.mistakesBadge.textContent = '0 / 3 mistakes';
  DOM.hintLabel.textContent     = `Hint (${cfg.hints})`;
  DOM.hintBtn.classList.remove('disabled');
  DOM.notesBtn.classList.remove('active');
  DOM.notesLabel.textContent    = 'Notes';
  updateDifficultyBadge();

  buildBoard();
  buildNumpad();
  renderBoard();
  updateProgress();
  startTimer();
  recordGamePlayed();
  renderStatsSidebar();

  // Clean up any previous celebration
  DOM.boardWrapper.classList.remove('celebrating');
  confetti.stop();

  // Show game screen
  DOM.difficultyScreen.hidden = true;
  DOM.gameScreen.hidden       = false;
}

function showDifficultyScreen() {
  stopTimer();
  DOM.gameScreen.hidden       = true;
  DOM.difficultyScreen.hidden = false;
  DOM.winModal.hidden         = true;
  DOM.gameOverModal.hidden    = true;
}

/* ==================== KEYBOARD ==================== */
document.addEventListener('keydown', e => {
  if (DOM.gameScreen.hidden) return;
  if (state.gameOver || state.won) return;

  const key = e.key;

  // Arrow keys GÇö navigate
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) {
    e.preventDefault();
    const sel = state.selected < 0 ? 0 : state.selected;
    const row = Math.floor(sel / 9), col = sel % 9;
    let nr = row, nc = col;
    if (key === 'ArrowUp')    nr = Math.max(0, row - 1);
    if (key === 'ArrowDown')  nr = Math.min(8, row + 1);
    if (key === 'ArrowLeft')  nc = Math.max(0, col - 1);
    if (key === 'ArrowRight') nc = Math.min(8, col + 1);
    selectCell(nr * 9 + nc);
    return;
  }

  // Numbers 1-9
  if (key >= '1' && key <= '9') {
    inputNumber(parseInt(key));
    return;
  }

  // Delete / Backspace GÇö erase
  if (key === 'Delete' || key === 'Backspace') {
    eraseCell();
    return;
  }

  // 0 or Escape GÇö deselect / erase
  if (key === '0' || key === 'Escape') {
    eraseCell();
    return;
  }

  // Ctrl+Z GÇö undo
  if ((e.ctrlKey || e.metaKey) && key === 'z') {
    e.preventDefault();
    undo();
    return;
  }

  // N GÇö notes mode
  if (key === 'n' || key === 'N') {
    toggleNotesMode();
    return;
  }

  // H GÇö hint
  if (key === 'h' || key === 'H') {
    useHint();
    return;
  }
});

/* ==================== EVENT LISTENERS ==================== */

// Difficulty selection
$$('.diff-card').forEach(btn => {
  btn.addEventListener('click', () => startGame(btn.dataset.diff));
});

// In-game controls
DOM.undoBtn.addEventListener('click', undo);
DOM.hintBtn.addEventListener('click', useHint);
DOM.eraseBtn.addEventListener('click', eraseCell);
DOM.notesBtn.addEventListener('click', toggleNotesMode);

DOM.newGameBtn.addEventListener('click', () => startGame(state.difficulty));
DOM.backToDiffBtn.addEventListener('click', showDifficultyScreen);

// Modals
DOM.playAgainBtn.addEventListener('click', () => {
  DOM.winModal.hidden = true;
  startGame(state.difficulty);
});
DOM.closeWinModal.addEventListener('click', () => {
  DOM.winModal.hidden = true;
  showDifficultyScreen();
});
DOM.tryAgainBtn.addEventListener('click', () => {
  DOM.gameOverModal.hidden = true;
  startGame(state.difficulty);
});
DOM.gameOverDiffBtn.addEventListener('click', () => {
  DOM.gameOverModal.hidden = true;
  showDifficultyScreen();
});

// Close modals on backdrop click
[DOM.winModal, DOM.gameOverModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.hidden = true;
      confetti.stop();
      DOM.boardWrapper.classList.remove('celebrating');
      if (state.won) showDifficultyScreen();
      if (state.gameOver) showDifficultyScreen();
    }
  });
});

// Sound toggle
DOM.soundToggle.addEventListener('click', toggleSound);

// Board keyboard focus (for accessibility)
DOM.board.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    if (state.selected < 0) selectCell(0);
  }
});

/* ==================== INIT ==================== */
// Start on the difficulty screen
DOM.difficultyScreen.hidden = false;
DOM.gameScreen.hidden       = true;
renderStatsSidebar();
