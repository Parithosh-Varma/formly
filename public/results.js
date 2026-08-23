const chartsEl = document.getElementById("charts");

async function init() {
  const params = new URLSearchParams(location.search);
  let formId = params.get("form");

  if (!formId) {
    try {
      const res = await fetch("/api/forms");
      const data = await res.json();
      if (!data.forms?.length) return renderEmpty("No forms exist yet.");
      formId = data.forms[0].id;
    } catch {
      return renderError("Could not reach the server.");
    }
  }

  load(formId);
}

async function load(formId) {
  try {
    const pubRes = await fetch(`/api/forms/${formId}/summary`);
    const pub = await pubRes.json();
    if (!pubRes.ok || !pub.success) throw new Error(pub.message || "Failed to load.");

    let data = pub;
    try {
      const ownRes = await fetch(`/api/forms/${formId}/responses`);
      if (ownRes.ok) {
        const own = await ownRes.json();
        if (own.success) {
          data = { ...pub, responses: own.responses };
          data.summary = mergeTextAnswers(pub.summary, own.summary);
          document.getElementById("clearBtn").classList.remove("hidden");
          if (own.responses.length > 0) {
            document.getElementById("statLast").textContent = formatDate(own.responses[0].submitted_at);
          }
        }
      }
    } catch {}

    document.getElementById("statTotal").textContent = data.total;
    document.title = `Results — Survey`;

    if (data.total === 0) {
      document.getElementById("formTitle").textContent = "Survey Results";
      chartsEl.innerHTML =
        '<div class="result info">No responses yet — submit the survey first, then refresh this page.</div>';
      return;
    }

    renderCharts(data);
  } catch (err) {
    renderError(err.message);
  }
}

function mergeTextAnswers(publicSummary, ownerSummary) {
  const merged = JSON.parse(JSON.stringify(publicSummary));
  for (const [qid, s] of Object.entries(merged)) {
    if (s.type === "text") s.answers = ownerSummary[qid]?.answers || [];
  }
  return merged;
}

function renderCharts(data) {
  const questions = Object.entries(data.summary);
  chartsEl.innerHTML = questions.map(([qid, q]) => questionCard(qid, q, data.total)).join("");

  requestAnimationFrame(() => {
    chartsEl.querySelectorAll(".bar-fill").forEach((el) => {
      el.style.width = el.dataset.width;
    });
  });
}

function questionCard(qid, q, total) {
  const num = qid.replace("q", "");
  let body = "";

  if (q.type === "text") {
    if (q.answers?.length) {
      body = `<ul class="text-answers">${q.answers.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`;
    } else if (q.textCount > 0) {
      body = `<p class="empty-note">${q.textCount} written ${q.textCount === 1 ? "answer" : "answers"} — visible to the survey owner only.</p>`;
    } else {
      body = '<p class="empty-note">No answers yet.</p>';
    }
  } else {
    const rows = Object.entries(q.counts)
      .sort((a, b) => b[1] - a[1])
      .map(([opt, count], i) => barRow(opt, count, total, i));

    body = `<div class="bars">${rows.join("")}</div>`;

    if (q.type === "checkbox" && total > 0) {
      body += `<p class="hint">Percentages = share of respondents (multi-select).</p>`;
    }
  }

  return `
    <section class="result-card">
      <h3><span class="qnum">${num}</span><span>${esc(q.label)}</span></h3>
      ${body}
    </section>`;
}

function barRow(label, count, total, i) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const alpha = Math.max(0.18, 0.92 - i * 0.12);
  return `
    <div class="bar-row">
      <div class="bar-meta"><span class="bar-label">${esc(label)}</span>
        <span class="bar-count">${count} &middot; ${pct}%</span></div>
      <div class="bar-track"><div class="bar-fill" data-width="${pct}%" style="background: rgba(17,19,24,${alpha})"></div></div>
    </div>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function renderEmpty(msg) {
  document.getElementById("formTitle").textContent = "No forms yet";
  chartsEl.innerHTML = `<div class="result info">${esc(msg)}</div>`;
}

function renderError(msg) {
  document.getElementById("formTitle").textContent = "Something went wrong";
  chartsEl.innerHTML = `<div class="result error">${esc(msg)}</div>`;
}

init();
