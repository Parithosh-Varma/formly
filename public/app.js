const form = document.getElementById("surveyForm");
const progressBar = document.getElementById("progressBar");
const formError = document.getElementById("formError");
const progressText = document.getElementById("progressText");
const progressPct = document.getElementById("progressPct");
const toastStack = document.getElementById("toastStack");
const draftBanner = document.getElementById("draftBanner");

/* ---------- theme ---------- */
function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
    updateThemeIcon("dark");
  } else {
    updateThemeIcon("light");
  }
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateThemeIcon(next);
    showToast(next === "dark" ? "Dark mode on" : "Light mode on", "info");
  });
}
function updateThemeIcon(theme) {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  btn.textContent = theme === "dark" ? "☀" : "🌙";
  btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
}

/* ---------- toast ---------- */
function showToast(msg, type = "info", duration = 3200) {
  if (!toastStack) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.setAttribute("role", "status");
  el.innerHTML = `<span>${esc(msg)}</span><button type="button" aria-label="Dismiss">✕</button>`;
  el.querySelector("button").addEventListener("click", () => dismissToast(el));
  toastStack.appendChild(el);
  const timer = setTimeout(() => dismissToast(el), duration);
  el._timer = timer;
}
function dismissToast(el) {
  if (!el || !el.parentNode) return;
  clearTimeout(el._timer);
  el.style.animation = "toastOut .22s ease forwards";
  setTimeout(() => el.remove(), 220);
}

/* ---------- modal confirm (promise) ---------- */
function confirmModal(title, msg, opts = {}) {
  const backdrop = document.getElementById("confirmModal");
  const t = document.getElementById("modalTitle");
  const m = document.getElementById("modalMsg");
  const ok = document.getElementById("modalOk");
  const cancel = document.getElementById("modalCancel");
  if (!backdrop) return Promise.resolve(confirm(msg));
  t.textContent = title;
  m.textContent = msg;
  ok.textContent = opts.okText || "Confirm";
  ok.className = opts.danger ? "danger-btn" : "submit";
  backdrop.classList.add("show");
  ok.focus();
  return new Promise((resolve) => {
    const close = (val) => {
      backdrop.classList.remove("show");
      ok.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      backdrop.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(val);
    };
    const onOk = () => close(true);
    const onCancel = () => close(false);
    const onBackdrop = (e) => { if (e.target === backdrop) close(false); };
    const onKey = (e) => { if (e.key === "Escape") close(false); };
    ok.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    backdrop.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  });
}

/* ---------- client-side profanity (real-time) ---------- */
const BAD_WORDS = [
  "asshole", "bastard", "bitch", "bollocks", "bullshit",
  "clit", "cock", "cum", "cunt",
  "damn", "dick", "douche",
  "fag", "faggot", "fuck",
  "goddamn", "jerkoff", "jizz",
  "kike", "nigga", "nigger",
  "prick", "pussy",
  "shit", "slut", "twat", "wank", "whore",
];
const BAD_WORD_RE = BAD_WORDS.map((w) => ({
  word: w,
  regex: new RegExp("\\b" + w + "\\w{0,5}\\b"),
}));
function normalizeClient(text) {
  return String(text)
    .toLowerCase()
    .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[€3]/g, "e")
    .replace(/[!1|]/g, "i")
    .replace(/[0°]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokenMatchesWithWildcard(token, word) {
  if (token.length !== word.length) return false;
  if (!token.includes("*")) return false;
  for (let i = 0; i < word.length; i++) if (token[i] !== "*" && token[i] !== word[i]) return false;
  return true;
}
function clientHasBadWord(value) {
  const norm = normalizeClient(value);
  const collapsed = norm.replace(/\s+/g, "");
  if (BAD_WORD_RE.some(({ regex }) => regex.test(norm) || regex.test(collapsed))) return true;
  const raw = String(value).toLowerCase();
  const tokens = raw.split(/[^a-z*]+/).filter(Boolean);
  for (const t of tokens) for (const w of BAD_WORDS) if (tokenMatchesWithWildcard(t, w)) return true;
  return false;
}
function checkProfanityField(el) {
  const val = el.value || "";
  const dirty = clientHasBadWord(val);
  el.classList.toggle("profanity-dirty", dirty);
  updateCharCounter(el);
  let warn = el.parentNode?.querySelector(".profanity-warn");
  if (dirty && !warn) {
    warn = document.createElement("div");
    warn.className = "profanity-warn show";
    warn.innerHTML = '<i class="iconoir-warning-circle"></i> Please remove inappropriate language before submitting.';
    el.parentNode?.appendChild(warn);
  } else if (dirty && warn) {
    warn.classList.add("show");
  } else if (!dirty && warn) {
    warn.classList.remove("show");
  }
}
function countClientProfanity() {
  const found = new Set();
  const inputs = form.querySelectorAll("textarea, input[type=text], .other-input");
  for (const el of inputs) {
    if (!el.value) continue;
    const norm = normalizeClient(el.value);
    const collapsed = norm.replace(/\s+/g, "");
    for (const { word, regex } of BAD_WORD_RE) {
      if (regex.test(norm) || regex.test(collapsed)) found.add(word);
    }
    const raw = String(el.value).toLowerCase();
    const tokens = raw.split(/[^a-z*]+/).filter(Boolean);
    for (const t of tokens) for (const w of BAD_WORDS) if (tokenMatchesWithWildcard(t, w)) found.add(w);
  }
  return found.size;
}
const STRIKE_LIMIT = 3;
let currentFormId = null;
let currentQuestions = [];
let currentStep = 0;
let hasSubmitted = false;
let isSubmitting = false;
let draftSaveTimer = null;
let view = 'welcome';

window.addEventListener("beforeunload", (e) => {
  if (isBlockedNow()) {
    e.preventDefault();
    e.returnValue = "You are blocked for 5 minutes. Closing now will not lift the block.";
    return;
  }
  if (!isDirty() || hasSubmitted) return;
  e.preventDefault();
  e.returnValue = "";
});

async function init() {
  initTheme();
  bindDraftBanner();
  const params = new URLSearchParams(location.search);
  let formId = params.get("form");
  if (!formId) {
    try {
      const res = await fetch("/api/forms");
      const data = await res.json();
      if (!data.forms?.length) return renderFatal("No forms exist yet.");
      formId = data.forms[0].id;
    } catch {
      return renderFatal("Could not reach the server.");
    }
  }
  await load(formId);
}
async function load(id) {
  try {
    const safeId = encodeURIComponent(String(id));
    const res = await fetch(`/api/forms/${safeId}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Form not found.");
    currentFormId = data.form.id;
    currentQuestions = data.form.questions;
    document.title = `Formly — ${data.form.title}`;
    baseTitle = document.title;
    document.getElementById("formTitle").textContent = data.form.title;
    document.getElementById("formDescription").textContent = data.form.description || "";
    renderForm();
    restoreDraftIfAny();
    showWelcome();
    bindWelcome();
    if (isBlockedNow()) {
      const g = readGuard();
      showBlockedOverlay(g.blockedUntil, { skipVideo: true });
    }
    startAlarmTimer();
  } catch (err) {
    renderFatal(err.message);
  }
}
function showWelcome() {
  view = 'welcome';
  const header = document.getElementById("formHeader");
  const progress = document.getElementById("progressMeta");
  const sticky = document.getElementById("stickyProgress");
  if (header) header.style.display = "";
  if (progress) progress.style.display = "none";
  if (sticky) sticky.style.display = "none";
  form.style.display = "none";
  const errEl = document.getElementById("formError");
  if (errEl) errEl.classList.remove("show");
  const wnav = document.querySelector(".wizard-nav");
  if (wnav) wnav.style.display = "none";
  const kh = document.querySelector(".kbd-hint");
  if (kh) kh.style.display = "none";
  const foot = document.querySelector(".footer");
  if (foot) foot.style.display = "none";
  checkDraftBanner();
  window.scrollTo({ top: 0 });
  hideError();
}
function enterSurvey(atStep = 0) {
  view = 'question';
  if (!currentQuestions.length) return renderFatal("This form has no questions.");
  currentStep = Math.max(0, Math.min(atStep, currentQuestions.length - 1));
  const header = document.getElementById("formHeader");
  const progress = document.getElementById("progressMeta");
  const sticky = document.getElementById("stickyProgress");
  if (header) header.style.display = "none";
  if (progress) progress.style.display = "flex";
  if (sticky) sticky.style.display = "none";
  form.style.display = "";
  const wnav = document.querySelector(".wizard-nav");
  if (wnav) wnav.style.display = "flex";
  const kh = document.querySelector(".kbd-hint");
  if (kh) kh.style.display = "flex";
  const foot = document.querySelector(".footer");
  if (foot) foot.style.display = "flex";
  showStep(currentStep);
}
function bindWelcome() {
  const btn = document.getElementById("startBtn");
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", () => {
    try { sessionStorage.removeItem(draftDismissKey()); } catch {}
    draftBanner?.classList.remove("show");
    enterSurvey(0);
  });
}
function draftDismissKey() { return `dismiss_${currentFormId}`; }
function draftKey() { return `draft_${currentFormId}`; }
function saveDraft() {
  if (!currentFormId || hasSubmitted) return;
  try {
    const payload = { answers: collectAnswers(), step: currentStep, ts: Date.now() };
    localStorage.setItem(draftKey(), JSON.stringify(payload));
    checkDraftBanner();
  } catch {}
}
function restoreDraftIfAny() {
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d.answers) return;
  } catch {}
  checkDraftBanner();
}
function checkDraftBanner() {
  if (!draftBanner || !currentFormId) return;
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) { draftBanner.classList.remove("show"); return; }
    const d = JSON.parse(raw);
    const hasData = d.answers && Object.values(d.answers).some(v => Array.isArray(v) ? v.length : String(v).trim());
    if (!hasData) { draftBanner.classList.remove("show"); return; }
    draftBanner.classList.add("show");
  } catch { draftBanner.classList.remove("show"); }
}
function bindDraftBanner() {
  document.getElementById("draftResume")?.addEventListener("click", () => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey()) || "{}");
      if (d.answers) applyAnswers(d.answers);
      if (typeof d.step === "number") currentStep = Math.min(d.step, currentQuestions.length - 1);
      draftBanner.classList.remove("show");
      enterSurvey(currentStep);
      showToast("Draft restored", "success");
    } catch { showToast("Could not restore draft", "error"); }
  });
  document.getElementById("draftDiscard")?.addEventListener("click", async () => {
    const ok = await confirmModal("Discard draft?", "This will clear your saved answers for this form.", { okText: "Discard", danger: true });
    if (!ok) return;
    localStorage.removeItem(draftKey());
    draftBanner.classList.remove("show");
    showToast("Draft discarded", "info");
  });
}
function applyAnswers(answers) {
  for (const q of currentQuestions) {
    const v = answers[q.id];
    if (v == null) continue;
    if (q.type === "text") {
      const el = form.elements[q.id];
      if (el) { el.value = v; updateCharCounter(el); }
    } else if (q.type === "dropdown") {
      const sel = form.querySelector(`[data-custom-for="${esc(q.id)}"]`);
      if (sel) setCustomSelectValue(q.id, v);
      else { const el = form.elements[q.id]; if (el) el.value = v; }
    } else if (detectSpecial(q) === "rating") {
      form.querySelectorAll(`[data-rating-for="${esc(q.id)}"]`).forEach(btn => {
        btn.classList.toggle("active", btn.dataset.value === String(v));
        btn.setAttribute("aria-checked", btn.dataset.value === String(v) ? "true" : "false");
      });
      const hidden = form.querySelector(`input[type=hidden][name="${esc(q.id)}"]`);
      if (hidden) hidden.value = v;
    } else if (detectSpecial(q) === "scale") {
      form.querySelectorAll(`[data-scale-for="${esc(q.id)}"]`).forEach(btn => {
        btn.classList.toggle("active", btn.dataset.value === String(v));
        btn.setAttribute("aria-checked", btn.dataset.value === String(v) ? "true" : "false");
      });
      const hidden = form.querySelector(`input[type=hidden][name="${esc(q.id)}"]`);
      if (hidden) hidden.value = v;
    } else if (q.type === "checkbox") {
      const vals = Array.isArray(v) ? v : [];
      form.querySelectorAll(`input[name="${esc(q.id)}"]`).forEach(inp => {
        const should = vals.includes(inp.value) || vals.some(x => x.startsWith("Other") && inp.value === "Other");
        inp.checked = should;
        inp.closest(".option")?.classList.toggle("selected", should);
      });
      const otherVals = vals.filter(x => x.startsWith("Other:"));
      if (otherVals.length) {
        const otherInput = form.querySelector(`.other-input[data-other-for="${esc(q.id)}"]`);
        if (otherInput) { otherInput.classList.add("show"); otherInput.value = otherVals[0].slice(6).trim(); }
      }
    } else {
      form.querySelectorAll(`input[name="${esc(q.id)}"]`).forEach(inp => {
        const matched = inp.value === v || (v.startsWith("Other") && inp.value === "Other");
        inp.checked = matched;
        inp.closest(".option")?.classList.toggle("selected", matched);
      });
      if (String(v).startsWith("Other:")) {
        const otherInput = form.querySelector(`.other-input[data-other-for="${esc(q.id)}"]`);
        if (otherInput) { otherInput.classList.add("show"); otherInput.value = String(v).slice(6).trim(); }
      }
    }
  }
  updateProgress();
  syncGridDone();
}
function detectSpecial(q) {
  if (q.displayAs === "rating" || q.displayAs === "scale") return q.displayAs;
  if (q.type !== "radio") return null;
  const opts = q.options || [];
  if (opts.length < 3 || opts.length > 10) return null;
  const nums = opts.map(o => Number(String(o).trim()));
  if (nums.some(n => Number.isNaN(n))) return null;
  const sorted = [...nums].sort((a,b)=>a-b);
  if (sorted[0] !== 1) return null;
  if (!sorted.every((v,i)=> v===i+1)) return null;
  if (opts.length === 5) return "rating";
  if (opts.length >= 5 && opts.length <= 10) return "scale";
  return null;
}
function renderForm() {
  form.innerHTML = `
    ${currentQuestions.map(renderQuestion).join("")}
    <div class="wizard-nav" role="navigation" aria-label="Question navigation">
      <button type="button" class="nav-btn" id="backBtn" style="display:none" aria-label="Previous question">← Back</button>
      <button type="button" class="nav-btn primary" id="nextBtn" aria-label="Next question">Next →</button>
      <button type="submit" class="nav-btn primary" id="submitBtn" style="display:none" aria-label="Submit survey">Submit response</button>
    </div>
    <div class="kbd-hint" id="kbdHint" aria-hidden="true"><kbd>1</kbd>–<kbd>4</kbd> pick option · <kbd>←</kbd><kbd>→</kbd> navigate · <kbd>Enter</kbd> next</div>
    <div class="footer">
      <div class="footer-left">
        <div class="privacy">
          <strong>Your response is anonymous.</strong><br>
          No identifying information is collected.
        </div>
        <button type="button" class="restart-btn" id="restartBtn" style="display:none">Start over</button>
      </div>
    </div>`;
  wireOptionEvents();
  wireCustomSelects();
  wireRatingScaleEvents();
  form.querySelectorAll("textarea").forEach(el => updateCharCounter(el));
  form.addEventListener("input", (e) => {
    updateProgress();
    syncGridDone();
    scheduleDraftSave();
    const t = e.target;
    if (t.matches("textarea") || t.matches("input[type=text]") || t.classList.contains("other-input")) {
      clearTimeout(t._profanityTimer);
      t._profanityTimer = setTimeout(() => checkProfanityField(t), 200);
      updateCharCounter(t);
    }
  });
  form.addEventListener("change", () => {
    syncGridDone();
    scheduleDraftSave();
  });
  form.addEventListener("submit", handleSubmit);
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.target.matches("textarea")) return;
    e.preventDefault();
    advanceOrSubmit();
  });
  document.getElementById("backBtn").addEventListener("click", () => {
    if (currentStep > 0) { currentStep--; showStep(currentStep); }
  });
  document.getElementById("nextBtn").addEventListener("click", advanceOrSubmit);
  document.getElementById("restartBtn").addEventListener("click", async () => {
    const ok = await confirmModal("Start over?", "Clear all answers and start from the first question?", { okText: "Start over" });
    if (!ok) return;
    restartForm();
  });
  // pills removed — progress integrated in card header
  document.addEventListener("keydown", handleGlobalShortcuts);
}
function scheduleDraftSave() {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(saveDraft, 600);
}
function isBlockedNow() {
  const g = readGuard();
  return g.blockedUntil && Date.now() < g.blockedUntil;
}
function restartForm() {
  if (isBlockedNow()) {
    const g = readGuard();
    showBlockedOverlay(g.blockedUntil);
    return;
  }
  form.reset();
  form.querySelectorAll("[data-custom-for]").forEach(wrap => {
    const qid = wrap.dataset.customFor;
    setCustomSelectValue(qid, "");
  });
  form.querySelectorAll("[data-rating-for], [data-scale-for]").forEach(btn => {
    btn.classList.remove("active");
    btn.setAttribute("aria-checked", "false");
  });
  form.querySelectorAll("input[type=hidden]").forEach(inp => inp.value = "");
  form.querySelectorAll(".other-input").forEach((el) => {
    el.classList.remove("show");
    el.value = "";
  });
  form.querySelectorAll(".profanity-dirty").forEach((el) => el.classList.remove("profanity-dirty"));
  form.querySelectorAll(".profanity-warn").forEach((el) => el.remove());
  form.querySelectorAll(".char-counter").forEach(el => { if (el.dataset.for !== "ta") el.remove(); });
  form.querySelectorAll("textarea").forEach(el => updateCharCounter(el));
  localStorage.removeItem(strikeKey());
  localStorage.removeItem(draftKey());
  draftBanner?.classList.remove("show");
  enterSurvey(0);
  showToast("Form reset", "info");
}
function advanceOrSubmit() {
  if (isSubmitting) return;
  if (currentStep < currentQuestions.length - 1) {
    const q = currentQuestions[currentStep];
    if (q.required !== false && !isAnswered(q, collectAnswers()[q.id])) {
      return shakeQuestion(q);
    }
    currentStep++;
    showStep(currentStep);
  } else {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  }
}
function showStep(step) {
  const prev = form.querySelector(".question.active");
  if (prev) {
    prev.classList.remove("active");
    prev.classList.add("exiting");
    setTimeout(() => prev.classList.remove("exiting"), 180);
  }
  form.querySelectorAll(".question").forEach((sec, i) => {
    sec.classList.toggle("active", i === step);
    sec.setAttribute("aria-hidden", i === step ? "false" : "true");
  });
  const backBtn = document.getElementById("backBtn");
  if (backBtn) { backBtn.style.display = ""; backBtn.disabled = step === 0; }
  document.getElementById("nextBtn").style.display = step < currentQuestions.length - 1 ? "" : "none";
  document.getElementById("submitBtn").style.display = step === currentQuestions.length - 1 ? "" : "none";
  const header = document.getElementById("formHeader");
  if (header && view === 'welcome') header.style.display = "";
  else if (header) header.style.display = "none";
  const restart = document.getElementById("restartBtn");
  if (restart) restart.style.display = view === 'question' ? "" : "none";
  const grid = document.getElementById("questionGrid");
  if (grid) {
    const snapshot = collectAnswers();
    grid.querySelectorAll(".grid-btn").forEach((btn, i) => {
      const q = currentQuestions[i];
      const answered = q ? isAnswered(q, snapshot[q.id]) : false;
      btn.classList.toggle("active", i === step);
      btn.classList.toggle("done", answered && i !== step);
      btn.setAttribute("aria-selected", i === step ? "true" : "false");
      btn.tabIndex = i === step ? 0 : -1;
    });
  }
  const section = form.querySelector(".question.active");
  const focusable = section?.querySelector("input:not([type=hidden]), select, textarea, button, .custom-select-trigger, .rating-star, .scale-btn");
  if (focusable && focusable.type !== "radio" && focusable.type !== "checkbox") {
    setTimeout(() => { try { focusable.focus(); } catch {} }, 80);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  hideError();
  updateProgress();
  updateKbdHint();
  saveDraft();
}
function syncGridDone() {
  const grid = document.getElementById("questionGrid");
  if (!grid) return;
  const snapshot = collectAnswers();
  grid.querySelectorAll(".grid-btn").forEach((btn, i) => {
    const q = currentQuestions[i];
    const answered = q ? isAnswered(q, snapshot[q.id]) : false;
    btn.classList.toggle("done", answered && i !== currentStep);
  });
}
function questionHead(q, num) {
  const optional = q.required === false ? ' <span class="question-hint">(optional)</span>' : "";
  const multi = q.type === "checkbox" ? ' <span class="question-hint">(select all that apply)</span>' : "";
  const typeHint = detectSpecial(q) === "rating" ? ' <span class="question-hint">· rate 1–5</span>' : detectSpecial(q) === "scale" ? ' <span class="question-hint">· choose 1–'+q.options.length+'</span>' : "";
  return `<div class="question-head"><h2 class="question-title" id="qtitle-${esc(q.id)}">${num}. ${esc(q.label)}${optional}${multi}${typeHint}</h2></div>`;
}
function renderQuestion(q) {
  const num = String(currentQuestions.indexOf(q) + 1);
  const special = detectSpecial(q);
  if (special === "rating") {
    const stars = q.options.map((o, i) =>
      `<button type="button" class="rating-star" data-rating-for="${esc(q.id)}" data-value="${esc(o)}" role="radio" aria-checked="false" aria-label="${esc(o)} out of ${q.options.length}" tabindex="0">★</button>`
    ).join("");
    return `<section class="question" id="sec-${esc(q.id)}" role="group" aria-labelledby="qtitle-${esc(q.id)}">${questionHead(q, num)}
      <div class="rating-row" role="radiogroup" aria-label="${esc(q.label)}">${stars}</div>
      <div class="rating-labels"><span>Poor</span><span>Excellent</span></div>
      <input type="hidden" name="${esc(q.id)}" value="">
      ${q.allowOther ? `<input class="other-input" data-other-for="${esc(q.id)}" placeholder="Tell us more..." maxlength="500" aria-label="Other answer">` : ""}
      <div class="char-counter" data-for="${esc(q.id)}" style="display:none"></div>
    </section>`;
  }
  if (special === "scale") {
    const btns = q.options.map(o =>
      `<button type="button" class="scale-btn" data-scale-for="${esc(q.id)}" data-value="${esc(o)}" role="radio" aria-checked="false">${esc(o)}</button>`
    ).join("");
    const ends = `<div class="scale-ends"><span>${esc(q.options[0])} — Low</span><span>${esc(q.options[q.options.length-1])} — High</span></div>`;
    return `<section class="question" id="sec-${esc(q.id)}" role="group" aria-labelledby="qtitle-${esc(q.id)}">${questionHead(q, num)}
      <div class="scale-row" role="radiogroup">${btns}</div>${ends}
      <input type="hidden" name="${esc(q.id)}" value="">
    </section>`;
  }
  if (q.type === "text") {
    return `<section class="question" id="sec-${esc(q.id)}" aria-labelledby="qtitle-${esc(q.id)}">${questionHead(q, num)}
      <textarea name="${esc(q.id)}" rows="4" maxlength="2000" placeholder="Share your thoughts..." aria-labelledby="qtitle-${esc(q.id)}"></textarea>
      <div class="char-counter" data-for="${esc(q.id)}">0 / 2000</div>
    </section>`;
  }
  if (q.type === "dropdown") {
    const opts = q.options.map(o => `<div class="custom-select-option" data-value="${esc(o)}" role="option">${esc(o)}</div>`).join("");
    return `<section class="question" id="sec-${esc(q.id)}" aria-labelledby="qtitle-${esc(q.id)}">${questionHead(q, num)}
      <div class="custom-select" data-custom-for="${esc(q.id)}" data-value="">
        <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false"><span class="custom-select-value">Select an option…</span><i class="iconoir-nav-arrow-down"></i></button>
        <div class="custom-select-menu" role="listbox">
          <div class="custom-select-search"><input type="text" placeholder="Search..." aria-label="Search options" /></div>
          <div class="custom-select-options">${opts}<div class="custom-select-empty hidden">No matches</div></div>
        </div>
      </div>
      <select name="${esc(q.id)}" style="display:none"><option value=""></option>${q.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>
    </section>`;
  }
  const inputType = q.type === "checkbox" ? "checkbox" : "radio";
  const cls = inputType === "checkbox" ? "checkbox" : "";
  const options = q.options
    .map((o, idx) => `<label class="option ${cls}" tabindex="0" role="${inputType}" aria-checked="false" data-idx="${idx}"><input type="${inputType}" name="${esc(q.id)}" value="${esc(o)}"><span class="control"></span><span class="option-text">${esc(o)}</span><kbd aria-hidden="true">${idx+1}</kbd></label>`)
    .join("");
  const otherIdx = q.options.length + 1;
  const otherRow = q.allowOther && q.type !== "dropdown"
    ? `<label class="option other-toggle ${cls}" role="${inputType}" tabindex="0"><input type="${inputType}" name="${esc(q.id)}" value="Other"><span class="control"></span><span class="option-text">Other</span><kbd aria-hidden="true">${otherIdx}</kbd></label>
       <input class="other-input" data-other-for="${esc(q.id)}" placeholder="Tell us more..." maxlength="500" aria-label="Other details">`
    : "";
  const otherCounter = q.allowOther ? `<div class="char-counter" data-for="${esc(q.id)}-other" style="display:none">0 / 500</div>` : "";
  return `<section class="question" id="sec-${esc(q.id)}" role="group" aria-labelledby="qtitle-${esc(q.id)}">${questionHead(q, num)}
    <div class="options" role="group">${options}${otherRow}</div>${otherCounter}
  </section>`;
}
function wireCustomSelects() {
  form.querySelectorAll(".custom-select").forEach(wrap => {
    const qid = wrap.dataset.customFor;
    const trigger = wrap.querySelector(".custom-select-trigger");
    const search = wrap.querySelector(".custom-select-search input");
    const options = [...wrap.querySelectorAll(".custom-select-option")];
    const empty = wrap.querySelector(".custom-select-empty");
    const updateFilter = () => {
      const term = search.value.toLowerCase().trim();
      let visible = 0;
      options.forEach(opt => {
        const txt = opt.textContent.toLowerCase();
        const match = !term || txt.includes(term);
        opt.style.display = match ? "" : "none";
        if (match) {
          visible++;
          if (term) {
            const idx = txt.indexOf(term);
            const before = opt.textContent.slice(0, idx);
            const hit = opt.textContent.slice(idx, idx+term.length);
            const after = opt.textContent.slice(idx+term.length);
            opt.innerHTML = `${esc(before)}<mark>${esc(hit)}</mark>${esc(after)}`;
          } else opt.textContent = opt.dataset.value;
        }
      });
      empty.classList.toggle("hidden", visible !== 0);
    };
    search.addEventListener("input", updateFilter);
    trigger.addEventListener("click", () => {
      const open = wrap.classList.toggle("open");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { search.focus(); search.value=""; updateFilter(); }
    });
    options.forEach(opt => {
      opt.addEventListener("click", () => {
        setCustomSelectValue(qid, opt.dataset.value);
        wrap.classList.remove("open");
        trigger.setAttribute("aria-expanded","false");
        hideError(); updateProgress(); scheduleDraftSave();
      });
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) { wrap.classList.remove("open"); trigger.setAttribute("aria-expanded","false"); }
    });
  });
}
function setCustomSelectValue(qid, val) {
  const wrap = form.querySelector(`.custom-select[data-custom-for="${qid}"]`);
  if (!wrap) return;
  wrap.dataset.value = val;
  const valueEl = wrap.querySelector(".custom-select-value");
  valueEl.textContent = val || "Select an option…";
  valueEl.style.color = val ? "var(--text)" : "var(--subtle)";
  wrap.querySelectorAll(".custom-select-option").forEach(o=> o.classList.toggle("selected", o.dataset.value===val));
  const hiddenSelect = form.querySelector(`select[name="${qid}"]`);
  if (hiddenSelect) hiddenSelect.value = val;
  syncGridDone(); updateProgress();
}
function wireRatingScaleEvents() {
  form.querySelectorAll("[data-rating-for]").forEach(btn => {
    btn.addEventListener("click", () => {
      const qid = btn.dataset.ratingFor;
      const val = btn.dataset.value;
      form.querySelectorAll(`[data-rating-for="${qid}"]`).forEach(b=>{
        const active = b.dataset.value === val;
        b.classList.toggle("active", active);
        b.setAttribute("aria-checked", active?"true":"false");
      });
      const hidden = form.querySelector(`input[type=hidden][name="${qid}"]`);
      if (hidden) hidden.value = val;
      const all = [...form.querySelectorAll(`[data-rating-for="${qid}"]`)];
      const idx = all.indexOf(btn);
      all.forEach((b,i)=> b.style.opacity = i<=idx ? "1" : ".45");
      hideError(); updateProgress(); scheduleDraftSave();
    });
  });
  form.querySelectorAll("[data-scale-for]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const qid = btn.dataset.scaleFor;
      const val = btn.dataset.value;
      form.querySelectorAll(`[data-scale-for="${qid}"]`).forEach(b=>{
        const active=b.dataset.value===val;
        b.classList.toggle("active", active);
        b.setAttribute("aria-checked", active?"true":"false");
      });
      const hidden=form.querySelector(`input[type=hidden][name="${qid}"]`);
      if(hidden) hidden.value=val;
      hideError(); updateProgress(); scheduleDraftSave();
    });
  });
}
function wireOptionEvents() {
  form.querySelectorAll(".option input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.type === "radio") {
        form.querySelectorAll(`input[name="${input.name}"]`).forEach((i) =>
          i.closest(".option").classList.remove("selected")
        );
      }
      input.closest(".option").classList.toggle("selected", input.checked);
      input.closest(".option")?.setAttribute("aria-checked", input.checked?"true":"false");
      const option = input.closest(".option");
      const otherInput = option.closest(".question")?.querySelector(".other-input");
      if (otherInput && option.classList.contains("other-toggle")) {
        otherInput.classList.toggle("show", input.checked);
        const cc = form.querySelector(`.char-counter[data-for="${input.name}-other"]`);
        if (cc) cc.style.display = input.checked ? "flex" : "none";
        if (input.checked) setTimeout(() => otherInput.focus(), 50);
      }
      hideError();
      updateProgress();
    });
  });
  form.querySelectorAll(".option").forEach(label=>{
    label.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"||e.key===" "){
        e.preventDefault();
        const inp = label.querySelector("input");
        if(inp){ inp.checked = inp.type==="checkbox" ? !inp.checked : true; inp.dispatchEvent(new Event("change",{bubbles:true})); }
      }
    });
    label.addEventListener("click",(e)=>{
      if(e.target.tagName==="INPUT") return;
      const inp = label.querySelector("input");
      if(!inp) return;
      if(inp.type==="checkbox") { inp.checked=!inp.checked; } else { inp.checked=true; }
      inp.dispatchEvent(new Event("change",{bubbles:true}));
    });
  });
  form.querySelectorAll(".other-input").forEach((input) => {
    const ensureChecked = () => {
      const toggle = form.querySelector(`input[name="${input.dataset.otherFor}"][value="Other"]`);
      if (toggle && !toggle.checked) {
        toggle.checked = true;
        toggle.closest(".option").classList.add("selected");
        toggle.closest(".option")?.setAttribute("aria-checked","true");
        hideError();
        updateProgress();
      }
    };
    input.addEventListener("focus", ensureChecked);
    input.addEventListener("input", ()=>{ ensureChecked(); updateCharCounter(input); });
  });
}
function updateCharCounter(el) {
  if (!el) return;
  const max = el.getAttribute("maxlength") ? parseInt(el.getAttribute("maxlength"),10) : (el.classList.contains("other-input") ? 500 : 2000);
  const len = (el.value || "").length;
  const otherKey = el.dataset.otherFor ? `${el.dataset.otherFor}-other` : null;
  let counter = null;
  if (otherKey) counter = el.parentNode?.querySelector(`.char-counter[data-for="${CSS.escape(otherKey)}"]`);
  if (!counter) counter = el.parentNode?.querySelector(`.char-counter[data-for="${CSS.escape(el.name||el.dataset.otherFor||"ta")}"]`);
  if (!counter) {
    counter = el.nextElementSibling;
    if (!counter || !counter.classList.contains("char-counter")) {
      counter = document.createElement("div");
      counter.className = "char-counter";
      counter.dataset.for = otherKey || el.name || el.dataset.otherFor || "ta";
      el.insertAdjacentElement("afterend", counter);
    }
  }
  if (!counter) return;
  counter.textContent = `${len} / ${max}`;
  counter.classList.remove("warn","danger");
  if (len > max * 0.85 && len <= max * 0.95) counter.classList.add("warn");
  if (len > max * 0.95) counter.classList.add("danger");
}
function collectAnswers() {
  const answers = {};
  for (const q of currentQuestions) {
    const special = detectSpecial(q);
    if (special === "rating" || special === "scale") {
      const hidden = form.querySelector(`input[type=hidden][name="${esc(q.id)}"]`);
      answers[q.id] = hidden ? hidden.value : "";
      continue;
    }
    if (q.type === "text") {
      answers[q.id] = (form.elements[q.id]?.value || "").trim();
    } else if (q.type === "dropdown") {
      const custom = form.querySelector(`.custom-select[data-custom-for="${esc(q.id)}"]`);
      answers[q.id] = custom ? (custom.dataset.value || "") : (form.elements[q.id]?.value || "");
    } else if (q.type === "checkbox") {
      let vals = [...form.querySelectorAll(`input[name="${esc(q.id)}"]:checked`)].map((el) => el.value);
      const otherInput = form.querySelector(`.other-input[data-other-for="${esc(q.id)}"]`);
      const txt = otherInput?.classList.contains("show") ? (otherInput.value || "").trim() : "";
      if (vals.includes("Other")) {
        vals = [...vals.filter((v) => v !== "Other"), txt ? `Other: ${txt}` : "Other"];
      }
      answers[q.id] = vals;
    } else {
      const checked = form.querySelector(`input[name="${esc(q.id)}"]:checked`);
      let val = checked ? checked.value : "";
      if (!val) {
        const hidden = form.querySelector(`input[type=hidden][name="${esc(q.id)}"]`);
        if (hidden && hidden.value) val = hidden.value;
      }
      if (val === "Other") {
        const otherInput = form.querySelector(`.other-input[data-other-for="${esc(q.id)}"]`);
        const txt = otherInput ? (otherInput.value || "").trim() : "";
        val = txt ? `Other: ${txt}` : "Other";
      }
      answers[q.id] = val;
    }
  }
  return answers;
}
const strikeKey = () => `strikes_${currentFormId}`;
const globalStrikeKey = () => `strikes_global`;
function readGuard() {
  try {
    const perForm = JSON.parse(localStorage.getItem(strikeKey()) || "{}");
    const global = JSON.parse(localStorage.getItem(globalStrikeKey()) || "{}");
    // merge: if either has blockedUntil in future, return the most restrictive
    if (global.blockedUntil && global.blockedUntil > (perForm.blockedUntil || 0)) return global;
    if (perForm.blockedUntil || perForm.count) return perForm;
    return global;
  } catch { return {}; }
}
function writeGuard(g) {
  try {
    localStorage.setItem(strikeKey(), JSON.stringify(g));
    // also mirror to global to prevent form-switch bypass
    if (g.blockedUntil || g.count) localStorage.setItem(globalStrikeKey(), JSON.stringify(g));
  } catch {}
}
function isAnswered(q, val) {
  if (Array.isArray(val)) return val.length > 0;
  if (q.type === "text") return String(val).trim().length > 0;
  if (detectSpecial(q)) return Boolean(String(val).trim());
  return Boolean(val);
}
function isDirty() {
  if (!currentQuestions.length) return false;
  const snapshot = collectAnswers();
  return currentQuestions.some((q) => isAnswered(q, snapshot[q.id]));
}
function firstMissing() {
  for (const q of currentQuestions) {
    if (q.required === false) continue;
    if (!isAnswered(q, collectAnswers()[q.id])) return q;
  }
  return null;
}
function updateProgress() {
  const required = currentQuestions.filter((q) => q.required !== false);
  const snapshot = collectAnswers();
  const answered = required.filter((q) => isAnswered(q, snapshot[q.id])).length;
  const totalReq = required.length || currentQuestions.length;
  const pct = totalReq ? Math.min(100, Math.round((answered / totalReq) * 100)) : 0;
  if (progressBar) progressBar.style.width = pct + "%";
  if (progressText) progressText.textContent = `${answered}/${totalReq}`;
  if (progressPct) progressPct.textContent = pct + "%";
}
function updateKbdHint() {
  const hint = document.getElementById("kbdHint");
  if (!hint || view !== 'question') return;
  const q = currentQuestions[currentStep];
  if (!q) return;
  let n = 0;
  if (q.type === "text") {
    hint.innerHTML = '<kbd>Enter</kbd> next · <kbd>←</kbd><kbd>→</kbd> navigate';
    return;
  }
  if (q.type === "dropdown") {
    n = q.options.length;
  } else if (q.type === "checkbox" || q.type === "radio") {
    n = q.options.length + (q.allowOther ? 1 : 0);
  } else {
    const special = detectSpecial(q);
    if (special) n = q.options.length;
    else n = q.options ? q.options.length : 0;
  }
  if (n <= 1) n = q.options.length;
  // For special types, still show 1–n
  hint.innerHTML = `<kbd>1</kbd>–<kbd>${n}</kbd> pick option · <kbd>←</kbd><kbd>→</kbd> navigate · <kbd>Enter</kbd> next`;
}
function shakeQuestion(q) {
  const section = document.getElementById(`sec-${q.id}`);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    section.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }],
      { duration: 280 }
    );
  }
  const err = `Please answer: "${q.label}"`;
  showError(err);
  showToast(err, "error");
}
function handleGlobalShortcuts(e) {
  if (e.target.matches("textarea") || e.target.matches("input[type=text]") || e.target.classList.contains("other-input") || e.target.isContentEditable) {
    if (e.key === "Escape") e.target.blur();
    return;
  }
  if (hasSubmitted) return;
  const activeQ = currentQuestions[currentStep];
  if (!activeQ) return;
  if (/^[1-9]$/.test(e.key)) {
    const idx = parseInt(e.key,10)-1;
    const opts = document.querySelectorAll(`#sec-${activeQ.id} .option input, #sec-${activeQ.id} .rating-star, #sec-${activeQ.id} .scale-btn`);
    if (opts[idx]) {
      e.preventDefault();
      opts[idx].click();
    }
  }
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    if (e.target.closest(".custom-select") || e.target.closest(".rating-row") || e.target.closest(".scale-row")) return;
    if (e.ctrlKey || e.metaKey) return;
    const focused = document.activeElement;
    if (focused && focused.classList.contains("option")) {
      const next = focused.nextElementSibling;
      if (next && next.classList.contains("option")) { e.preventDefault(); next.focus(); return; }
    }
    if (currentStep < currentQuestions.length-1 && !e.target.matches("input, textarea, select")) {
      const q = currentQuestions[currentStep];
      if (q.required !== false && !isAnswered(q, collectAnswers()[q.id])) return;
      e.preventDefault();
      currentStep++; showStep(currentStep);
    }
  }
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    if (e.target.closest(".custom-select") || e.target.closest(".rating-row")) return;
    if (e.ctrlKey || e.metaKey) return;
    const focused = document.activeElement;
    if (focused && focused.classList.contains("option")) {
      const prev = focused.previousElementSibling;
      if (prev && prev.classList.contains("option")) { e.preventDefault(); prev.focus(); return; }
    }
    if (currentStep>0 && !e.target.matches("input, textarea, select")) {
      e.preventDefault(); currentStep--; showStep(currentStep);
    }
  }
}
async function handleSubmit(e) {
  e.preventDefault();
  if (isSubmitting) return;
  isSubmitting = true;
  hideError();
  const missing = firstMissing();
  if (missing) { isSubmitting = false; return shakeQuestion(missing); }
  const guard = readGuard();
  if (guard.blockedUntil && Date.now() < guard.blockedUntil) {
    showBlockedOverlay(guard.blockedUntil);
    isSubmitting = false;
    return;
  }
  form.querySelectorAll("textarea, input[type=text], .other-input").forEach(checkProfanityField);
  if (countClientProfanity()>0) {
    showToast("Please remove inappropriate language", "error");
    showError("Please remove inappropriate language before submitting.");
    isSubmitting = false;
    return;
  }
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Submitting…";
  try {
    const res = await fetch(`/api/forms/${currentFormId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: collectAnswers() }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      const g = readGuard();
      if (data.warning) {
        g.count = Number(data.strike) || ((g.count || 0) + (data.wordCount || 1));
        writeGuard(g);
        showToast(data.message, "error", 4200);
      } else if (data.blocked) {
        const until = Date.now() + 5 * 60 * 1000;
        writeGuard({ count: Math.max(g.count || 0, STRIKE_LIMIT + 1), blockedUntil: until });
        btn.disabled = false;
        btn.textContent = "Submit response";
        isSubmitting = false;
        showBlockedOverlay(until);
        return;
      }
      throw new Error(data.message || "Something went wrong.");
    }
    hasSubmitted = true;
    localStorage.removeItem(strikeKey());
    localStorage.removeItem(draftKey());
    showToast("Response submitted! Thank you.", "success");
    const white = document.getElementById("whiteScreen");
    white.classList.add("show");
    setTimeout(() => {
      document.querySelector(".form-header").style.display = "none";
      form.style.display = "none";
      formError.classList.remove("show");
      draftBanner?.classList.remove("show");
    }, 300);
    playCelebrationVideo(() => {
      setTimeout(() => {
        white.classList.remove("show");
        document.getElementById("success").classList.add("show");
        window.scrollTo({ top: 0 });
      }, 250);
    });
  } catch (err) {
    showError(err.message);
    showToast(err.message, "error");
    btn.disabled = false;
    btn.textContent = "Submit response";
    isSubmitting = false;
  } finally {
    // keep isSubmitting true after success (hasSubmitted), else allow retry
    if (!hasSubmitted) isSubmitting = false;
  }
}
function playCelebrationVideo(onDone) {
  const overlay = document.getElementById("videoOverlay");
  const video = document.getElementById("completionVideo");
  if (!overlay || !video) { onDone && onDone(); return; }
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.classList.remove("show"); onDone && onDone(); }, 350);
  };
  overlay.classList.add("show");
  try { video.currentTime = 0; } catch {}
  video.onended = finish;
  setTimeout(finish, 6000);
  video.play().catch(finish);
}
function showBlockedOverlay(blockedUntil, opts = {}) {
  const overlay = document.getElementById("blockedOverlay");
  const video = document.getElementById("blockedVideo");
  const msg = document.getElementById("blockedMsg");
  if (!overlay) return;
  const skipVideo = opts.skipVideo === true;
  if (skipVideo) {
    overlay.classList.add("show");
    msg.classList.add("show");
    video.style.display = "none";
    startCountdown(blockedUntil);
    return;
  }
  let revealed = false;
  const showMsg = () => {
    if (revealed) return;
    revealed = true;
    video.style.display = "none";
    msg.classList.add("show");
    startCountdown(blockedUntil);
  };
  overlay.classList.add("show");
  msg.classList.remove("show");
  video.style.display = "block";
  try { video.currentTime = 0; } catch {}
  video.onended = showMsg;
  setTimeout(showMsg, 12000);
  video.play().catch(showMsg);
}
function startCountdown(blockedUntil) {
  const el = document.getElementById("blockedCountdown");
  if (!el) return;
  const tick = () => {
    const remaining = blockedUntil - Date.now();
    if (remaining <= 0) {
      el.textContent = "0:00";
      setTimeout(closeBlockedOverlay, 1200);
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    el.textContent = mins + ":" + String(secs).padStart(2, "0");
    setTimeout(tick, 1000);
  };
  tick();
}
function closeBlockedOverlay() {
  const overlay = document.getElementById("blockedOverlay");
  const msg = document.getElementById("blockedMsg");
  if (overlay) overlay.classList.remove("show");
  if (msg) msg.classList.remove("show");
  try {
    localStorage.removeItem(strikeKey());
    localStorage.removeItem(globalStrikeKey());
    // also clear any per-form strikes that are expired
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("strikes_")) {
        try { const v = JSON.parse(localStorage.getItem(k)||"{}"); if (!v.blockedUntil || Date.now() > v.blockedUntil) localStorage.removeItem(k); } catch {}
      }
    }
  } catch {}
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isBlockedNow()) { e.preventDefault(); e.stopPropagation(); }
});
let baseTitle = document.title;
let titleFlasher = null;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (!isDirty() || hasSubmitted) return;
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("Your survey is unfinished", { body: "Your answers are saved on this device. Come back to complete it." }); } catch {}
    }
    if (!titleFlasher) {
      let flip = false;
      titleFlasher = setInterval(() => { document.title = (flip = !flip) ? "Don't forget your survey!" : baseTitle; }, 1200);
    }
  } else {
    clearInterval(titleFlasher); titleFlasher = null; document.title = baseTitle;
  }
});
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") { Notification.requestPermission().catch(() => {}); }
}
form.addEventListener("pointerdown", requestNotificationPermission, { once: true });
let audioCtx = null;
let alarmTimer = null;
function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {}
}
document.addEventListener("pointerdown", ensureAudio);
function playSoftChime() {
  ensureAudio();
  if (!audioCtx || audioCtx.state !== "running") return;
  const t0 = audioCtx.currentTime;
  [[660, 0], [880, 0.35]].forEach(([freq, off]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + off);
    gain.gain.linearRampToValueAtTime(0.05, t0 + off + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.32);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0 + off);
    osc.stop(t0 + off + 0.35);
  });
}
function startAlarmTimer() {
  clearTimeout(alarmTimer);
  alarmTimer = setTimeout(() => {
    if (hasSubmitted) return;
    playSoftChime();
    showToast("Time check: 15 minutes open — your answers are saved as draft.", "info", 7000);
    showError("Time check: you have had this form open for over 15 minutes. Your answers are saved as draft.");
    setTimeout(hideError, 8000);
  }, 15 * 60 * 1000);
}
function showError(msg) {
  formError.textContent = msg;
  formError.classList.add("show");
  formError.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideError() { formError.classList.remove("show"); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function renderFatal(msg) {
  document.getElementById("formTitle").textContent = "Something went wrong";
  formError.textContent = msg;
  formError.classList.add("show");
  document.getElementById("progressMeta") && (document.getElementById("progressMeta").style.display="none");
}
init();
