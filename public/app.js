const form = document.getElementById("surveyForm");
const progressBar = document.getElementById("progressBar");
const formError = document.getElementById("formError");

/* ---------- client-side profanity (real-time) ---------- */

const BAD_WORDS = [
  "asshole", "bastard", "bitch", "bollocks", "bullshit",
  "clit", "cock", "cum", "cunt",
  "dick", "douche",
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
    .replace(/[@4]/g, "a")
    .replace(/[€3]/g, "e")
    .replace(/[!1|]/g, "i")
    .replace(/[0°]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ");
}

function clientHasBadWord(value) {
  const norm = normalizeClient(value);
  return BAD_WORD_RE.some(({ regex }) => regex.test(norm));
}

let profanityTimer = null;

function checkProfanityField(el) {
  const val = el.value || "";
  const dirty = clientHasBadWord(val);
  el.classList.toggle("profanity-dirty", dirty);

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
  let count = 0;
  const inputs = form.querySelectorAll("textarea, input[type=text]");
  for (const el of inputs) {
    if (el.value) {
      const norm = normalizeClient(el.value);
      for (const { regex } of BAD_WORD_RE) {
        const matches = norm.match(new RegExp(regex.source, "gi"));
        if (matches) count += matches.length;
      }
    }
  }
  const others = form.querySelectorAll(".other-input");
  for (const el of others) {
    if (el.value) {
      const norm = normalizeClient(el.value);
      for (const { regex } of BAD_WORD_RE) {
        const matches = norm.match(new RegExp(regex.source, "gi"));
        if (matches) count += matches.length;
      }
    }
  }
  return count;
}

function hasAnyProfanity() {
  return countClientProfanity() > 0;
}

const STRIKE_LIMIT = 3;
const BLOCK_MS = 5 * 60 * 1000;

/* ---------- state ---------- */

let currentFormId = null;
let currentQuestions = [];
let currentStep = 0;
let hasSubmitted = false;

window.addEventListener("beforeunload", (e) => {
  if (!isDirty() || hasSubmitted) return;
  e.preventDefault();
  e.returnValue = "";
});

async function init() {
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

  load(formId);
}

async function load(id) {
  try {
    const res = await fetch(`/api/forms/${id}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Form not found.");

    currentFormId = data.form.id;
    currentQuestions = data.form.questions;

    document.title = `Formly — ${data.form.title}`;
    document.getElementById("formTitle").textContent = data.form.title;
    document.getElementById("formDescription").textContent = data.form.description || "";

    renderForm();
    restoreDraft();
    showStep(currentStep);
  } catch (err) {
    renderFatal(err.message);
  }
}

function renderForm() {
  const gridButtons = currentQuestions.map((_, i) =>
    `<button type="button" class="grid-btn" data-step="${i}">${i + 1}</button>`
  ).join("");

  form.innerHTML = `
    <div class="form-top-nav">
      <button type="button" class="nav-btn" id="backBtn" style="display:none">&larr; Back</button>
      <div class="question-grid" id="questionGrid">${gridButtons}</div>
      <button type="button" class="nav-btn primary" id="nextBtn">Next &rarr;</button>
      <button type="submit" class="nav-btn primary" id="submitBtn" style="display:none">Submit response</button>
    </div>
    ${currentQuestions.map(renderQuestion).join("")}
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
  form.addEventListener("input", (e) => {
    saveDraft();
    updateProgress();
    syncGridDone();

    const t = e.target;
    if (t.matches("textarea") || t.matches("input[type=text]") || t.classList.contains("other-input")) {
      clearTimeout(profanityTimer);
      profanityTimer = setTimeout(() => checkProfanityField(t), 200);
    }
  });
  form.addEventListener("change", () => {
    syncGridDone();
  });
  form.addEventListener("submit", handleSubmit);
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.target.matches("textarea")) return;
    e.preventDefault();
    advanceOrSubmit();
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep--;
      showStep(currentStep);
    }
  });
  document.getElementById("nextBtn").addEventListener("click", advanceOrSubmit);
  document.getElementById("restartBtn").addEventListener("click", restartForm);

  document.getElementById("questionGrid").addEventListener("click", (e) => {
    const btn = e.target.closest(".grid-btn");
    if (!btn) return;
    const step = parseInt(btn.dataset.step, 10);
    if (isNaN(step) || step === currentStep) return;

    if (step > currentStep) {
      const q = currentQuestions[currentStep];
      if (q.required !== false && !isAnswered(q, collectAnswers()[q.id])) {
        return shakeQuestion(q);
      }
    }

    currentStep = step;
    showStep(currentStep);
  });
}

function restartForm() {
  form.reset();
  form.querySelectorAll(".other-input").forEach((el) => {
    el.classList.remove("show");
    el.value = "";
  });
  form.querySelectorAll(".profanity-dirty").forEach((el) => {
    el.classList.remove("profanity-dirty");
  });
  form.querySelectorAll(".profanity-warn").forEach((el) => el.remove());
  localStorage.removeItem(draftKey());
  localStorage.removeItem(strikeKey());
  currentStep = 0;
  showStep(currentStep);
}

function advanceOrSubmit() {
  if (currentStep < currentQuestions.length - 1) {
    const q = currentQuestions[currentStep];
    if (q.required !== false && !isAnswered(q, collectAnswers()[q.id])) {
      return shakeQuestion(q);
    }
    currentStep++;
    showStep(currentStep);
  } else {
    form.requestSubmit();
  }
}

function showStep(step) {
  form.querySelectorAll(".question").forEach((sec, i) => {
    sec.classList.toggle("active", i === step);
  });
  document.getElementById("backBtn").style.display = step > 0 ? "" : "none";
  document.getElementById("nextBtn").style.display =
    step < currentQuestions.length - 1 ? "" : "none";
  document.getElementById("submitBtn").style.display =
    step === currentQuestions.length - 1 ? "" : "none";

  const header = document.getElementById("formHeader");
  if (header) header.style.display = step === 0 ? "" : "none";

  const restart = document.getElementById("restartBtn");
  if (restart) restart.style.display = step > 0 ? "" : "none";

  const grid = document.getElementById("questionGrid");
  if (grid) {
    const snapshot = collectAnswers();
    grid.querySelectorAll(".grid-btn").forEach((btn, i) => {
      const q = currentQuestions[i];
      const answered = q ? isAnswered(q, snapshot[q.id]) : false;
      btn.classList.toggle("active", i === step);
      btn.classList.toggle("done", answered && i !== step);
    });
  }

  const section = form.querySelector(".question.active");
  const focusable = section?.querySelector(
    "input:not([type=hidden]), select, textarea"
  );
  if (focusable && focusable.type !== "radio" && focusable.type !== "checkbox") {
    setTimeout(() => focusable.focus(), 80);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  hideError();
  updateProgress();
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
  return `<div class="question-head"><h2 class="question-title">${num}. ${esc(q.label)}${optional}${multi}</h2></div>`;
}

function renderQuestion(q) {
  const num = String(currentQuestions.indexOf(q) + 1);

  if (q.type === "text") {
    return `<section class="question" id="sec-${q.id}">${questionHead(q, num)}
      <textarea name="${q.id}" rows="4" maxlength="2000" placeholder="Share your thoughts..."></textarea>
    </section>`;
  }

  if (q.type === "dropdown") {
    const opts = q.options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
    return `<section class="question" id="sec-${q.id}">${questionHead(q, num)}
      <select class="q-select" name="${q.id}">
        <option value="" disabled selected>Select an option&hellip;</option>${opts}
      </select>
    </section>`;
  }

  const inputType = q.type === "checkbox" ? "checkbox" : "radio";
  const cls = inputType === "checkbox" ? "checkbox" : "";
  const options = q.options
    .map((o) => `<label class="option ${cls}"><input type="${inputType}" name="${q.id}" value="${esc(o)}"><span class="control"></span><span class="option-text">${esc(o)}</span></label>`)
    .join("");

  const otherRow = q.allowOther && q.type !== "dropdown"
    ? `<label class="option other-toggle ${cls}"><input type="${inputType}" name="${q.id}" value="Other"><span class="control"></span><span class="option-text">Other</span></label>
       <input class="other-input" data-other-for="${q.id}" placeholder="Tell us more..." maxlength="500">`
    : "";

  return `<section class="question" id="sec-${q.id}">${questionHead(q, num)}
    <div class="options">${options}${otherRow}</div>
  </section>`;
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

      const option = input.closest(".option");
      const otherInput = option.closest(".question")?.querySelector(".other-input");
      if (otherInput && option.classList.contains("other-toggle")) {
        otherInput.classList.toggle("show", input.checked);
        if (input.checked) setTimeout(() => otherInput.focus(), 50);
      }

      hideError();
      updateProgress();
    });
  });

  form.querySelectorAll(".other-input").forEach((input) => {
    const ensureChecked = () => {
      const toggle = form.querySelector(`input[name="${input.dataset.otherFor}"][value="Other"]`);
      if (toggle && !toggle.checked) {
        toggle.checked = true;
        toggle.closest(".option").classList.add("selected");
        hideError();
        updateProgress();
      }
    };
    input.addEventListener("focus", ensureChecked);
    input.addEventListener("input", ensureChecked);
  });
}

function collectAnswers() {
  const answers = {};

  for (const q of currentQuestions) {
    if (q.type === "text") {
      answers[q.id] = (form.elements[q.id]?.value || "").trim();
    } else if (q.type === "dropdown") {
      answers[q.id] = form.elements[q.id]?.value || "";
    } else if (q.type === "checkbox") {
      let vals = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map((el) => el.value);
      const otherInput = form.querySelector(`.other-input[data-other-for="${q.id}"]`);
      const txt = otherInput?.classList.contains("show") ? (otherInput.value || "").trim() : "";
      if (vals.includes("Other")) {
        vals = [...vals.filter((v) => v !== "Other"), txt ? `Other: ${txt}` : "Other"];
      }
      answers[q.id] = vals;
    } else {
      const checked = form.querySelector(`input[name="${q.id}"]:checked`);
      let val = checked ? checked.value : "";
      if (val === "Other") {
        const otherInput = form.querySelector(`.other-input[data-other-for="${q.id}"]`);
        const txt = otherInput ? (otherInput.value || "").trim() : "";
        val = txt ? `Other: ${txt}` : "Other";
      }
      answers[q.id] = val;
    }
  }
  return answers;
}

/* ---------- Draft autosave (localStorage, per device) ---------- */

const draftKey = () => `draft_${currentFormId}`;
const strikeKey = () => `strikes_${currentFormId}`;

function readGuard() {
  try { return JSON.parse(localStorage.getItem(strikeKey()) || "{}"); } catch { return {}; }
}

function writeGuard(g) {
  try { localStorage.setItem(strikeKey(), JSON.stringify(g)); } catch {}
}

function saveDraft() {
  if (!currentFormId || hasSubmitted) return;
  try {
    localStorage.setItem(draftKey(), JSON.stringify(collectAnswers()));
  } catch {}
}

function restoreDraft() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(draftKey()) || "null");
  } catch {}
  if (!saved) return;
  applyAnswersToDom(saved);
  const idx = currentQuestions.findIndex((q) => !isAnswered(q, saved[q.id]));
  currentStep = idx === -1 ? Math.max(0, currentQuestions.length - 1) : idx;
}

function applyAnswersToDom(saved) {
  currentQuestions.forEach((q) => {
    const val = saved[q.id];
    if (val === undefined || val === null) return;

    if (q.type === "text" || q.type === "dropdown") {
      const el = form.elements[q.id];
      if (el && val !== "") el.value = val;
      return;
    }

    const vals = Array.isArray(val) ? val : [val];
    vals.forEach((v) => {
      let optionVal = v;
      let otherText = "";
      if (typeof v === "string" && v.startsWith("Other:")) {
        optionVal = "Other";
        otherText = v.slice(6).trim();
      }
      const input = [...form.querySelectorAll(`input[name="${q.id}"]`)].find(
        (el) => el.value === optionVal
      );
      if (input) {
        input.checked = true;
        input.closest(".option")?.classList.add("selected");
        if (optionVal === "Other") {
          const otherInput = form.querySelector(`.other-input[data-other-for="${q.id}"]`);
          if (otherInput) {
            otherInput.classList.add("show");
            otherInput.value = otherText;
          }
        }
      }
    });
  });
}

/* ---------- validation helpers ---------- */

function isAnswered(q, val) {
  if (Array.isArray(val)) return val.length > 0;
  if (q.type === "text") return String(val).trim().length > 0;
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
  if (required.length === 0) {
    progressBar.style.width = "100%";
    return;
  }
  const snapshot = collectAnswers();
  const answered = required.filter((q) => isAnswered(q, snapshot[q.id])).length;
  progressBar.style.width = Math.min(100, Math.round((answered / required.length) * 100)) + "%";
}

function shakeQuestion(q) {
  const section = document.getElementById(`sec-${q.id}`);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    section.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 280 }
    );
  }
  showError(`Please answer: "${q.label}"`);
}

/* ---------- submit ---------- */

async function handleSubmit(e) {
  e.preventDefault();
  hideError();

  const missing = firstMissing();
  if (missing) return shakeQuestion(missing);

  const guard = readGuard();
  if (guard.blockedUntil && Date.now() < guard.blockedUntil) {
    showBlockedOverlay(guard.blockedUntil);
    return;
  }

  const badCount = countClientProfanity();
  if (badCount > 0) {
    showError(`Found ${badCount} inappropriate word${badCount > 1 ? "s" : ""}. Please remove them before submitting.`);
    form.querySelectorAll("textarea, input[type=text], .other-input").forEach(checkProfanityField);
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Submitting…";

  try {
    const res = await fetch(`/api/forms/${currentFormId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: collectAnswers(),
        strikeHint: guard.count || 0,
      }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      const g = readGuard();
      if (data.warning) {
        g.count = Number(data.strike) || ((g.count || 0) + (data.wordCount || 1));
        writeGuard(g);
      } else if (data.blocked) {
        const until = Date.now() + 5 * 60 * 1000;
        writeGuard({ count: Math.max(g.count || 0, STRIKE_LIMIT + 1), blockedUntil: until });
        btn.disabled = false;
        btn.textContent = "Submit response";
        showBlockedOverlay(until);
        return;
      }
      throw new Error(data.message || "Something went wrong.");
    }

    hasSubmitted = true;
    localStorage.removeItem(draftKey());
    localStorage.removeItem(strikeKey());

    /* blank white screen -> video -> success */
    const white = document.getElementById("whiteScreen");
    white.classList.add("show");
    setTimeout(() => {
      document.querySelector(".form-header").style.display = "none";
      form.style.display = "none";
      formError.classList.remove("show");
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
    btn.disabled = false;
    btn.textContent = "Submit response";
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
    setTimeout(() => {
      overlay.classList.remove("show");
      onDone && onDone();
    }, 350);
  };

  overlay.classList.add("show");
  try { video.currentTime = 0; } catch {}
  video.onended = finish;
  setTimeout(finish, 6000);           /* safety net */
  video.play().catch(finish);
}

function showBlockedOverlay(blockedUntil) {
  const overlay = document.getElementById("blockedOverlay");
  const video = document.getElementById("blockedVideo");
  const msg = document.getElementById("blockedMsg");
  const countdown = document.getElementById("blockedCountdown");
  const closeBtn = document.getElementById("blockedClose");
  if (!overlay) return;

  let revealed = false;
  const showMsg = () => {
    if (revealed) return;
    revealed = true;
    video.style.display = "none";
    msg.classList.add("show");
    if (closeBtn) closeBtn.classList.add("show");
    startCountdown(blockedUntil);
  };

  overlay.classList.add("show");
  msg.classList.remove("show");
  if (closeBtn) closeBtn.classList.remove("show");
  video.style.display = "block";
  try { video.currentTime = 0; } catch {}

  video.onended = showMsg;
  setTimeout(showMsg, 12000);
  video.play().catch(showMsg);

  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.classList.remove("show");
      msg.classList.remove("show");
      closeBtn.classList.remove("show");
    };
  }
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
  localStorage.removeItem(strikeKey());
}

/* ---------- tab-switch warning ---------- */

let baseTitle = document.title;
let titleFlasher = null;

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (!isDirty() || hasSubmitted) return;

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Your survey is unfinished", {
          body: "Your answers are saved on this device. Come back to complete it.",
        });
      } catch {}
    }

    if (!titleFlasher) {
      let flip = false;
      titleFlasher = setInterval(() => {
        document.title = (flip = !flip)
          ? "Don't forget your survey!"
          : baseTitle;
      }, 1200);
    }
  } else {
    clearInterval(titleFlasher);
    titleFlasher = null;
    document.title = baseTitle;
  }
});

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}
form.addEventListener("pointerdown", requestNotificationPermission, { once: true });

/* ---------- 15-minute reminder chime ---------- */

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
    showError("Time check: you have had this form open for over 15 minutes. Your answers are saved as you go.");
    setTimeout(hideError, 8000);
  }, 15 * 60 * 1000);
}

/* ---------- misc ---------- */

function showError(msg) {
  formError.textContent = msg;
  formError.classList.add("show");
}

function hideError() {
  formError.classList.remove("show");
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function renderFatal(msg) {
  document.getElementById("formTitle").textContent = "Something went wrong";
  formError.textContent = msg;
  formError.classList.add("show");
}

init();
