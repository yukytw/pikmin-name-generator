// ============================================================
//  Pikmin Bloom — Name Color Generator
//  Features:
//  - Color selection first; determines available text chars
//  - 3-digit hex shortening where possible
//  - No-color swatch (crossed square)
//  - Output string always <= 30 chars (truncated)
//  - Input badge shows [typed / limit], turns red when over
// ============================================================

const MAX_LEN = 30;

const PRESETS = [
  { label: '紅', hex: '#ff0000' },
  { label: '橘', hex: '#ff6600' },
  { label: '黃', hex: '#ffcc00' },
  { label: '綠', hex: '#00cc00' },
  { label: '青', hex: '#00ccff' },
  { label: '藍', hex: '#0066ff' },
  { label: '紫', hex: '#9900ff' },
  { label: '粉', hex: '#ff66cc' },
  { label: '白', hex: '#ffffff' },
];

// State — color is selected first; null = no color tag
let selectedColor = PRESETS[0].hex;   // starts with red
let targetType = 'player'; // 'player' or 'pikmin'
let useBold = false;
let useItalic = false;
let useShortColor = false;

// DOM
const nameInput = document.getElementById('name-input');
const swatchesEl = document.getElementById('swatches');
const customInput = document.getElementById('custom-color-input');
const customSwatch = document.getElementById('custom-swatch');
const customHexEl = document.getElementById('custom-hex');
const customLabel = document.querySelector('.custom-color-label');
const inputBadge = document.getElementById('input-char-badge');
const previewBox = document.getElementById('preview-box');
const errorMsg = document.getElementById('error-msg');
const outputRow = document.getElementById('output-row');
const outputInput = document.getElementById('output-input');
const copyBtn = document.getElementById('copy-btn');
const toast = document.getElementById('toast');
const boldCheck = document.getElementById('bold-check');
const italicCheck = document.getElementById('italic-check');
const shortColorCheck = document.getElementById('short-color-check');
const shortColorGroup = document.getElementById('short-color-group');
const targetRadios = document.querySelectorAll('input[name="target-type"]');

// ---- Color code formatting ----

/**
 * Given a 6-digit hex string (no #), return the nearest 3-digit hex color.
 * Each 3-digit hex channel expands as N*17 (e.g. #A → #AA = 170),
 * so the nearest digit per channel is simply round(value / 17).
 */
function nearestShortHex(hex6) {
  const r = Math.round(parseInt(hex6.slice(0, 2), 16) / 17);
  const g = Math.round(parseInt(hex6.slice(2, 4), 16) / 17);
  const b = Math.round(parseInt(hex6.slice(4, 6), 16) / 17);
  return '#' + r.toString(16) + g.toString(16) + b.toString(16);
}

/**
 * Returns the color code to use inside the <color=...> tag.
 * - #ff0000 (red)  → 'red'   (special case, shorter than #f00)
 * - 6-digit hex compressible to 3 → '#f00' style
 * - useShortColor ON → nearest 3-digit hex
 * - otherwise     → '#rrggbb'
 * Returns null when no color is selected.
 */
function colorCode() {
  if (!selectedColor) return null;
  const h = selectedColor.replace('#', '').toLowerCase();
  if (h === 'ff0000') return 'red';
  const [r1, r2, g1, g2, b1, b2] = h;
  if (h.length === 6 && r1 === r2 && g1 === g2 && b1 === b2) return '#' + r1 + g1 + b1;
  if (useShortColor && h.length === 6) return nearestShortHex(h);
  return '#' + h;
}

/**
 * Returns true when the selected color is a 6-digit hex that can't already
 * be naturally shortened (i.e., shortening would actually do something).
 */
function canShortenColor() {
  if (!selectedColor) return false;
  if (targetType === 'pikmin') return false; // no char limit, no need
  const h = selectedColor.replace('#', '').toLowerCase();
  if (h === 'ff0000') return false; // already becomes 'red'
  if (h.length !== 6) return false;
  const [r1, r2, g1, g2, b1, b2] = h;
  if (r1 === r2 && g1 === g2 && b1 === b2) return false; // already naturally #RGB
  return true;
}

/**
 * Returns the CSS color string that the current colorCode() would
 * actually produce in-game. Used for accurate preview rendering.
 */
function previewCSSColor() {
  const code = colorCode();
  if (!code) return null;
  if (code === 'red') return '#ff0000';
  // Expand 3-digit hex (#RGB → #RRGGBB) for CSS
  if (code.length === 4) {
    const [, r, g, b] = code;
    return '#' + r + r + g + g + b + b;
  }
  return code;
}

/** Chars consumed by all formatting tags. */
function tagOverhead() {
  let overhead = 0;
  const code = colorCode();
  if (code) overhead += `<color=${code}>`.length + '</color>'.length;
  if (useBold) overhead += '<b></b>'.length;   // 7
  if (useItalic) overhead += '<i></i>'.length;  // 7
  return overhead;
}

function maxTextLen() {
  if (targetType === 'pikmin') return Infinity;
  return Math.max(0, MAX_LEN - tagOverhead());
}

// ---- Validation ----

/**
 * Returns an error string if the name is invalid, null if valid.
 * Rule: when a color is selected, the (truncated) name must not end with 'A'.
 */
function validateName(text) {
  if (targetType === 'pikmin') return null;
  if (!selectedColor) return null;
  if (text.endsWith('A') || text.endsWith('a')) {
    return '選擇顏色時，玩家名稱不可以「A」結尾';
  }
  return null;
}

// ---- Build output string (always <= 30 chars) ----

function buildOutput() {
  const raw = nameInput.value;
  const max = maxTextLen();
  let text = raw.slice(0, max);   // enforce limit
  if (!text) return '';
  if (useBold) text = `<b>${text}</b>`;
  if (useItalic) text = `<i>${text}</i>`;
  const code = colorCode();
  if (!code) return text;
  return `<color=${code}>${text}</color>`;
}

// ---- Update UI ----

function updateOutput() {
  const raw = nameInput.value;
  const max = maxTextLen();
  const typed = raw.length;
  const over = targetType === 'player' && typed > max;

  // Input char badge — shows actual typed vs limit, red when over
  if (targetType === 'pikmin') {
    inputBadge.hidden = true;
  } else {
    inputBadge.hidden = false;
    inputBadge.textContent = `${typed} / ${max}`;
  }
  inputBadge.classList.remove('warn');
  inputBadge.classList.toggle('full', over);

  // Input field border turns red when over limit
  nameInput.classList.toggle('over-limit', over);

  // Build output (always truncated to <= 30 chars)
  const output = buildOutput();

  // Validation (on the truncated text that would actually be used)
  const truncatedText = raw.slice(0, max);
  const validationError = output ? validateName(truncatedText) : null;

  // Preview (always shown) — uses actual output color for accuracy
  if (!output) {
    previewBox.innerHTML = '<span class="preview-placeholder">預覽將顯示於此…</span>';
  } else {
    let displayText = escapeHTML(truncatedText);
    if (useBold) displayText = `<b>${displayText}</b>`;
    if (useItalic) displayText = `<i>${displayText}</i>`;
    const cssColor = previewCSSColor();
    previewBox.innerHTML = cssColor
      ? `<span style="color:${cssColor}">${displayText}</span>`
      : `<span>${displayText}</span>`;
  }

  // Error message replaces both preview and output row
  if (validationError) {
    previewBox.hidden = true;
    errorMsg.hidden = false;
    outputRow.hidden = true;
  } else {
    previewBox.hidden = false;
    errorMsg.hidden = true;
    outputRow.hidden = false;
    outputInput.value = output;
  }
}

// ---- Color selection ----

function selectColor(hexOrNull) {
  selectedColor = hexOrNull;
  updateColorUI();
  updateShortColorVisibility();
  updateOutput();
}

/** Show/hide the shorthand toggle — only when shortening would change the color. */
function updateShortColorVisibility() {
  const canShorten = canShortenColor();
  shortColorGroup.hidden = !canShorten;
  // Uncheck and reset state when toggle is hidden
  if (!canShorten && useShortColor) {
    useShortColor = false;
    shortColorCheck.checked = false;
  }
}

function updateColorUI() {
  // Preset swatches
  swatchesEl.querySelectorAll('.swatch').forEach(btn => {
    const c = btn.dataset.hex;
    if (c === 'none') {
      btn.classList.toggle('active', selectedColor === null);
    } else {
      btn.classList.toggle('active', selectedColor === c);
    }
  });

  // Custom row
  const isCustom = selectedColor !== null && !PRESETS.some(p => p.hex === selectedColor);
  customLabel.classList.toggle('active', isCustom);
  if (isCustom) {
    customSwatch.style.background = selectedColor;
    customHexEl.textContent = selectedColor.toUpperCase();
  } else {
    customSwatch.style.background = 'conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)';
    customHexEl.textContent = customInput.value.toUpperCase();
  }
}

// ---- Build swatches ----

// Preset color swatches
PRESETS.forEach(({ label, hex }) => {
  const btn = document.createElement('button');
  btn.className = 'swatch';
  btn.style.background = hex;
  btn.title = label;
  btn.setAttribute('role', 'radio');
  btn.setAttribute('aria-label', label);
  btn.dataset.hex = hex;
  btn.addEventListener('click', () => selectColor(hex));
  swatchesEl.appendChild(btn);
});

// No-color swatch last
const noColorBtn = document.createElement('button');
noColorBtn.className = 'swatch no-color';
noColorBtn.title = '無顏色';
noColorBtn.setAttribute('role', 'radio');
noColorBtn.setAttribute('aria-label', '無顏色');
noColorBtn.dataset.hex = 'none';
noColorBtn.addEventListener('click', () => selectColor(null));
swatchesEl.appendChild(noColorBtn);

// ---- Custom color picker ----

customInput.addEventListener('input', () => {
  const hex = customInput.value;
  selectedColor = hex;
  customSwatch.style.background = hex;
  customHexEl.textContent = hex.toUpperCase();
  updateColorUI();
  updateShortColorVisibility();
  updateOutput();
});

customInput.addEventListener('change', () => {
  selectedColor = customInput.value;
  updateColorUI();
  updateShortColorVisibility();
  updateOutput();
});

// ---- Target type ----

targetRadios.forEach(r => {
  r.addEventListener('change', (e) => {
    targetType = e.target.value;
    updateShortColorVisibility();
    updateOutput();
  });
});

// ---- Name input ----

nameInput.addEventListener('input', updateOutput);

boldCheck.addEventListener('change', () => {
  useBold = boldCheck.checked;
  updateOutput();
});

italicCheck.addEventListener('change', () => {
  useItalic = italicCheck.checked;
  updateOutput();
});

shortColorCheck.addEventListener('change', () => {
  useShortColor = shortColorCheck.checked;
  updateOutput();
});

// ---- Copy ----

copyBtn.addEventListener('click', async () => {
  const val = outputInput.value;
  if (!val) return;
  try {
    await navigator.clipboard.writeText(val);
  } catch {
    outputInput.select();
    outputInput.setSelectionRange(0, 99999);
    document.execCommand('copy');
  }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
});

// ---- Utils ----

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---- Friend Code & Support ----

(function () {
  const friendBtn = document.getElementById('friend-code-btn');
  const friendToast = document.getElementById('friend-toast');
  const qrOverlay = document.getElementById('qr-overlay');
  const qrClose = document.getElementById('qr-close');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function showFriendToast() {
    friendToast.classList.add('show');
    setTimeout(() => friendToast.classList.remove('show'), 2200);
  }

  if (friendBtn) {
    friendBtn.addEventListener('click', async (e) => {
      // On desktop: show QR modal instead of following link
      if (!isMobile) {
        e.preventDefault();
        qrOverlay.hidden = false;
      }
      // Both mobile and desktop: copy friend code
      await copyText('924233049341');
      showFriendToast();
    });
  }

  // Close modal logic
  if (qrOverlay) {
    const closeModal = () => { qrOverlay.hidden = true; };
    qrClose.addEventListener('click', closeModal);
    qrOverlay.addEventListener('click', (e) => {
      if (e.target === qrOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !qrOverlay.hidden) closeModal();
    });
  }
})();

// ---- Init ----
nameInput.value = '';   // prevent browser-restored value from showing stale warnings
updateColorUI();
updateShortColorVisibility();
updateOutput();
