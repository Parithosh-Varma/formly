const listArea = document.getElementById("listArea");
const builderPanel = document.getElementById("builderPanel");
const adminError = document.getElementById("adminError");

const ICONS = {
  link: '<i class="iconoir-link"></i>',
  chart: '<i class="iconoir-graph-up"></i>',
  trash: '<i class="iconoir-trash"></i>',
  close: '<i class="iconoir-xmark"></i>',
};

let forms = [];

async function init() {
  try {
    const res = await fetch("/api/admin/forms");
    if (res.status === 403 || res.status === 503) return renderRestricted();
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to load.");

    forms = data.forms;
    renderList();
  } catch (err) {
    renderError(err.message);
  }
}

function renderList() {
  if (!forms.length) {
    listArea.innerHTML =
      '<div class="result info">No forms yet. Click <strong>+ New Form</strong> to create your first one.</div>';
    return;
  }

  listArea.innerHTML = forms
    .map(
      (f) => `
    <div class="form-row">
      <div class="form-info">
        <h3>${esc(f.title)}</h3>
        <p class="form-meta">ID #${f.id} · created ${formatDate(f.created_at)} · <strong>${f.responseCount}</strong> ${f.responseCount === 1 ? "response" : "responses"}</p>
      </div>
      <div class="row-actions">
        <button type="button" class="mini-btn" data-act="copy" data-id="${f.id}">${ICONS.link} Copy link</button>
        <a class="mini-btn" href="/results.html?form=${f.id}" target="_blank" rel="noopener">${ICONS.chart} Results</a>
        <button type="button" class="mini-btn warn" data-act="clear" data-id="${f.id}">${ICONS.trash} Clear</button>
        <button type="button" class="mini-btn danger" data-act="delete" data-id="${f.id}">${ICONS.close} Delete</button>
      </div>
    </div>`
    )
    .join("");
}

listArea.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  const form = forms.find((f) => String(f.id) === id);

  switch (btn.dataset.act) {
    case "copy": {
      const url = `${location.origin}/?form=${id}`;
      try {
        await navigator.clipboard.writeText(url);
        flash(btn, "Copied!");
      } catch {
        prompt("Copy this survey link:", url);
      }
      break;
    }
    case "clear": {
      if (!confirm(`Delete ALL ${form?.responseCount ?? ""} responses for "${form?.title}"? This cannot be undone.`)) return;
      await act(() => fetch(`/api/forms/${id}/responses`, { method: "DELETE" }), `Responses cleared for form #${id}.`);
      break;
    }
    case "delete": {
      if (!confirm(`Delete the form "${form?.title}" AND all its responses?\n\nThis cannot be undone.`)) return;
      if (!confirm("Are you sure? Last chance.")) return;
      await act(() => fetch(`/api/forms/${id}`, { method: "DELETE" }));
      forms = forms.filter((f) => String(f.id) !== id);
      renderList();
      break;
    }
  }
});

async function act(fetchFn, okMsg) {
  try {
    const res = await fetchFn();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || "Action failed.");
    if (okMsg) alert(okMsg);
    init();
  } catch (err) {
    showError(err.message);
  }
}

/* ---------- Builder ---------- */

document.getElementById("newFormBtn").addEventListener("click", () => {
  builderPanel.classList.remove("hidden");
  listArea.classList.add("hidden");
  document.getElementById("newFormBtn").classList.add("hidden");
  addQuestionRow();
});

document.getElementById("cancelBtn").addEventListener("click", closeBuilder);

document.getElementById("addQBtn").addEventListener("click", () => addQuestionRow());

function addQuestionRow() {
  const row = document.createElement("div");
  row.className = "q-builder";
  row.innerHTML = `
    <div class="qb-top">
      <select class="qb-type">
        <option value="radio">Radio (single choice)</option>
        <option value="checkbox">Checkbox (multi-select)</option>
        <option value="dropdown">Dropdown</option>
        <option value="text">Text (open answer)</option>
      </select>
      <button type="button" class="mini-btn danger qb-remove">${ICONS.close}</button>
    </div>
    <input class="qb-label" type="text" placeholder="Question text — e.g., How often do you study late?">
    <textarea class="qb-options" rows="3" placeholder="Options — one per line&#10;Daily&#10;Weekly"></textarea>
    <div class="qb-toggles">
      <label><input type="checkbox" class="qb-required" checked> Required</label>
      <label><input type="checkbox" class="qb-other"> Allow &ldquo;Other&rdquo; write-in</label>
    </div>`;
  row.querySelector(".qb-remove").addEventListener("click", () => row.remove());
  row.querySelector(".qb-type").addEventListener("change", (e) => {
    const isText = e.target.value === "text";
    row.querySelector(".qb-options").classList.toggle("hidden", isText);
    row.querySelector(".qb-other").closest("label").classList.toggle("hidden", isText);
  });
  document.getElementById("qList").appendChild(row);
}

document.getElementById("createBtn").addEventListener("click", async () => {
  const title = document.getElementById("bTitle").value.trim();
  const description = document.getElementById("bDesc").value.trim();
  const questions = [];
  let localErr = "";

  document.querySelectorAll("#qList .q-builder").forEach((row, i) => {
    const label = row.querySelector(".qb-label").value.trim();
    const type = row.querySelector(".qb-type").value;
    const options = row
      .querySelector(".qb-options")
      .value.split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const required = row.querySelector(".qb-required").checked;

    if (!localErr) {
      if (!label) localErr = `Question ${i + 1}: missing question text.`;
      else if (type !== "text" && options.length < 2)
        localErr = `Question ${i + 1}: needs at least 2 options (one per line).`;
    }

    const q = { type, label, required };
    if (type !== "text") {
      q.options = options;
      q.allowOther = row.querySelector(".qb-other").checked;
    }
    questions.push(q);
  });

  if (!title) localErr = localErr || "Form needs a title.";
  if (!questions.length) localErr = localErr || "Add at least one question.";
  if (localErr) return showError(localErr);

  const btn = document.getElementById("createBtn");
  btn.disabled = true;
  btn.textContent = "Creating…";

  try {
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, questions }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.errors?.[0] || data.message || "Create failed.");

    closeBuilder();
    init();
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.textContent = "Create form";
  }
});

function closeBuilder() {
  builderPanel.classList.add("hidden");
  listArea.classList.remove("hidden");
  document.getElementById("newFormBtn").classList.remove("hidden");
  document.getElementById("bTitle").value = "";
  document.getElementById("bDesc").value = "";
  document.getElementById("qList").innerHTML = "";
  hideError();
}

/* ---------- utils ---------- */

function flash(btn, text) {
  const original = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = original), 1200);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function showError(msg) {
  adminError.textContent = msg;
  adminError.classList.remove("hidden");
}

function hideError() {
  adminError.classList.add("hidden");
}

function renderRestricted() {
  document.querySelector("h1").textContent = "${ICONS.lock} Access restricted";
  listArea.innerHTML =
    '<div class="result error">Admin access is restricted to allowlisted IPs.</div>';
  document.getElementById("newFormBtn").classList.add("hidden");
}

function renderError(msg) {
  listArea.innerHTML = `<div class="result error">${esc(msg)}</div>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

init();
