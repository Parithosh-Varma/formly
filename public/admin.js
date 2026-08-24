const listArea = document.getElementById("listArea");
const builderPanel = document.getElementById("builderPanel");
const adminError = document.getElementById("adminError");
const toastStack = document.getElementById("toastStack");
const qList = document.getElementById("qList");
const previewShell = document.getElementById("previewShell");
const previewBody = document.getElementById("previewBody");

const ICONS = {
  link: '<i class="iconoir-link"></i>',
  chart: '<i class="iconoir-graph-up"></i>',
  trash: '<i class="iconoir-trash"></i>',
  close: '<i class="iconoir-xmark"></i>',
  copy: '<i class="iconoir-copy"></i>',
  edit: '<i class="iconoir-edit-pencil"></i>',
  drag: '<i class="iconoir-menu"></i>',
};

let forms = [];
let editingId = null;

/* ---------- theme ---------- */
(function initTheme(){
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.setAttribute("data-theme","dark");
  const updateIcon=()=>{
    const cur=document.documentElement.getAttribute("data-theme");
    const btn=document.getElementById("themeToggle");
    if(btn) btn.innerHTML = cur==="dark" ? '☀' : '🌙';
  };
  updateIcon();
  document.getElementById("themeToggle")?.addEventListener("click",()=>{
    const cur=document.documentElement.getAttribute("data-theme");
    const nxt = cur==="dark"?"light":"dark";
    document.documentElement.setAttribute("data-theme",nxt);
    localStorage.setItem("theme",nxt);
    updateIcon();
    showToast(nxt==="dark"?"Dark mode on":"Light mode on","info");
  });
})();

/* ---------- toast ---------- */
function showToast(msg, type="info", dur=3200){
  if(!toastStack) return;
  const el=document.createElement("div");
  el.className=`toast ${type}`;
  el.setAttribute("role","status");
  el.innerHTML=`<span>${esc(msg)}</span><button type="button" aria-label="Dismiss">✕</button>`;
  el.querySelector("button").addEventListener("click",()=>dismissToast(el));
  toastStack.appendChild(el);
  el._t=setTimeout(()=>dismissToast(el),dur);
}
function dismissToast(el){
  if(!el||!el.parentNode) return;
  clearTimeout(el._t);
  el.style.animation="toastOut .22s ease forwards";
  setTimeout(()=>el.remove(),220);
}

/* ---------- modal ---------- */
function confirmModal(title, msg, opts={}){
  const backdrop=document.getElementById("confirmModal");
  const t=document.getElementById("modalTitle");
  const m=document.getElementById("modalMsg");
  const ok=document.getElementById("modalOk");
  const cancel=document.getElementById("modalCancel");
  if(!backdrop) return Promise.resolve(confirm(msg));
  t.textContent=title; m.textContent=msg;
  ok.textContent=opts.okText||"Confirm";
  ok.className= opts.danger ? "danger-btn" : "submit";
  backdrop.classList.add("show");
  ok.focus();
  return new Promise(resolve=>{
    const close=(v)=>{
      backdrop.classList.remove("show");
      ok.removeEventListener("click",onOk);
      cancel.removeEventListener("click",onCancel);
      backdrop.removeEventListener("click",onBackdrop);
      document.removeEventListener("keydown",onKey);
      resolve(v);
    };
    const onOk=()=>close(true);
    const onCancel=()=>close(false);
    const onBackdrop=(e)=>{ if(e.target===backdrop) close(false); };
    const onKey=(e)=>{ if(e.key==="Escape") close(false); };
    ok.addEventListener("click",onOk);
    cancel.addEventListener("click",onCancel);
    backdrop.addEventListener("click",onBackdrop);
    document.addEventListener("keydown",onKey);
  });
}

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
      '<div class="result info">No forms yet. Click <strong>+ New Form</strong> to create your first one. Try a template to get started faster.</div>';
    return;
  }
  listArea.innerHTML = forms
    .map(
      (f) => `
    <div class="form-row" data-id="${esc(String(f.id))}">
      <div class="form-info">
        <h3>${esc(f.title)}</h3>
        <p class="form-meta">ID #${esc(String(f.id))} · created ${esc(formatDate(f.created_at))} · <strong>${esc(String(f.responseCount))}</strong> ${f.responseCount === 1 ? "response" : "responses"}</p>
        ${f.description ? `<p class="form-meta" style="margin-top:6px;color:var(--muted)">${esc(f.description)}</p>` : ""}
      </div>
      <div class="row-actions">
        <button type="button" class="mini-btn" data-act="copy" data-id="${esc(String(f.id))}">${ICONS.link} Copy link</button>
        <a class="mini-btn" href="/results.html?form=${encodeURIComponent(f.id)}" target="_blank" rel="noopener">${ICONS.chart} Results</a>
        <button type="button" class="mini-btn" data-act="duplicate" data-id="${esc(String(f.id))}">${ICONS.copy} Duplicate</button>
        <button type="button" class="mini-btn" data-act="edit" data-id="${esc(String(f.id))}">${ICONS.edit} Edit</button>
        <button type="button" class="mini-btn" data-act="export" data-id="${esc(String(f.id))}"><i class="iconoir-download"></i> Export</button>
        <button type="button" class="mini-btn warn" data-act="clear" data-id="${esc(String(f.id))}">${ICONS.trash} Clear</button>
        <button type="button" class="mini-btn danger" data-act="delete" data-id="${esc(String(f.id))}">${ICONS.close} Delete</button>
      </div>
    </div>`
    )
    .join("");
}

listArea.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  const safeId = encodeURIComponent(id);
  const form = forms.find((f) => String(f.id) === id);
  switch (btn.dataset.act) {
    case "copy": {
      const url = `${location.origin}/?form=${safeId}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied!", "success");
        const orig = btn.innerHTML; btn.textContent="Copied!"; setTimeout(()=>btn.innerHTML=orig,1200);
      } catch {
        prompt("Copy this survey link:", url);
      }
      break;
    }
    case "export": {
      try {
        const res = await fetch(`/api/forms/${safeId}`);
        const data = await res.json();
        if(!res.ok) throw new Error(data.message);
        const blob = new Blob([JSON.stringify(data.form, null, 2)], {type:"application/json"});
        const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`form-${String(id).replace(/[^a-z0-9_-]/gi,"_")}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        showToast("Exported JSON","success");
      } catch(err){ showToast(err.message,"error"); }
      break;
    }
    case "duplicate": {
      try {
        const res = await fetch(`/api/forms/${safeId}`);
        const data = await res.json();
        if(!res.ok) throw new Error(data.message);
        openBuilderWithData({ title: data.form.title + " (copy)", description: data.form.description, questions: data.form.questions });
        showToast("Duplicated — edit and create","info");
      } catch(err){ showToast(err.message,"error"); }
      break;
    }
    case "edit": {
      try {
        const res = await fetch(`/api/forms/${safeId}`);
        const data = await res.json();
        if(!res.ok) throw new Error(data.message);
        openBuilderWithData({ title: data.form.title, description: data.form.description, questions: data.form.questions }, id);
        showToast("Loaded for editing — save as new form","info");
      } catch(err){ showToast(err.message,"error"); }
      break;
    }
    case "clear": {
      const ok = await confirmModal("Clear responses?", `Delete ALL ${form?.responseCount ?? ""} responses for "${form?.title}"? This cannot be undone.`, { okText:"Clear", danger:true });
      if (!ok) return;
      await act(() => fetch(`/api/forms/${safeId}/responses`, { method: "DELETE" }), `Responses cleared for form #${id}.`);
      break;
    }
    case "delete": {
      const ok = await confirmModal("Delete form?", `Delete the form "${form?.title}" AND all its responses? This cannot be undone.`, { okText:"Delete", danger:true });
      if (!ok) return;
      const ok2 = await confirmModal("Last chance", "Are you absolutely sure? This will permanently delete the form.", { okText:"Yes, delete", danger:true });
      if (!ok2) return;
      const success = await act(() => fetch(`/api/forms/${safeId}`, { method: "DELETE" }));
      if (success) {
        forms = forms.filter((f) => String(f.id) !== id);
        renderList();
      }
      break;
    }
  }
});

async function act(fetchFn, okMsg) {
  try {
    const res = await fetchFn();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || "Action failed.");
    if (okMsg) showToast(okMsg,"success");
    init();
    return true;
  } catch (err) {
    showError(err.message);
    showToast(err.message,"error");
    return false;
  }
}

/* ---------- Builder ---------- */
document.getElementById("newFormBtn").addEventListener("click", () => {
  openBuilderEmpty();
});
document.getElementById("cancelBtn").addEventListener("click", closeBuilder);
document.getElementById("addQBtn").addEventListener("click", () => { addQuestionRow(); updatePreview(); });

function openBuilderEmpty(){
  editingId=null;
  builderPanel.classList.remove("hidden");
  listArea.classList.add("hidden");
  document.getElementById("newFormBtn").classList.add("hidden");
  qList.innerHTML="";
  addQuestionRow();
  updatePreview();
}
function openBuilderWithData(data, editId=null){
  editingId = editId;
  builderPanel.classList.remove("hidden");
  listArea.classList.add("hidden");
  document.getElementById("newFormBtn").classList.add("hidden");
  document.getElementById("bTitle").value = data.title || "";
  document.getElementById("bDesc").value = data.description || "";
  qList.innerHTML="";
  (data.questions||[]).forEach(q=>{
    // map backend question to builder row
    let type = q.type;
    let opts = q.options ? q.options.join("\n") : "";
    // detect rating/scale heuristic for display
    if (type==="radio" && q.options && q.options.length===5 && q.options.every((o,i)=>String(o)===String(i+1))) {
      // could be rating, keep as radio but will show as rating in preview
    }
    const row = addQuestionRow({ type, label: q.label, options: opts, required: q.required!==false, allowOther: !!q.allowOther });
    // after creation, set values
    if (type==="rating"||type==="scale") {
      // these types are virtual; map to radio
      row.querySelector(".qb-type").value = type;
      row.querySelector(".qb-type").dispatchEvent(new Event("change"));
    }
  });
  if(!(data.questions||[]).length) addQuestionRow();
  updatePreview();
}

const TEMPLATES = {
  feedback: {
    title: "Course Feedback — Week 4",
    description: "Help us improve the course",
    questions: [
      { type:"radio", label:"How would you rate the course overall?", options:["Excellent","Good","Average","Poor"], required:true },
      { type:"checkbox", label:"What did you find most useful? (select all)", options:["Lectures","Assignments","Discussions","Resources"], required:false },
      { type:"text", label:"Any suggestions?", required:false },
    ]
  },
  ai: {
    title: "Student AI Use Survey",
    description: "How AI impacts your study",
    questions: [
      { type:"dropdown", label:"How often do you use AI tools for study?", options:["Daily","Weekly","Rarely","Never"], required:true },
      { type:"rating", label:"How helpful is AI for your learning?", options:["1","2","3","4","5"], required:true },
      { type:"scale", label:"AI has reduced my study stress (1=not at all, 5=very much)", options:["1","2","3","4","5"], required:true },
      { type:"text", label:"Share an example of AI helping or hindering", required:false },
    ]
  },
  nps: {
    title: "NPS Survey",
    description: "How likely to recommend us?",
    questions: [
      { type:"scale", label:"How likely are you to recommend us to a friend? (0-10)", options:["0","1","2","3","4","5","6","7","8","9","10"], required:true },
      { type:"text", label:"What is the main reason for your score?", required:false },
    ]
  },
  blank: { title:"", description:"", questions:[{type:"radio",label:"",options:"",required:true}] }
};

document.getElementById("builderTemplates")?.addEventListener("click",(e)=>{
  const chip=e.target.closest("[data-template]");
  if(!chip) return;
  const tpl=TEMPLATES[chip.dataset.template];
  if(!tpl) return;
  document.getElementById("bTitle").value=tpl.title;
  document.getElementById("bDesc").value=tpl.description;
  qList.innerHTML="";
  tpl.questions.forEach(q=> addQuestionRow({ type: q.type==="rating"||q.type==="scale"? q.type: q.type, label:q.label, options: Array.isArray(q.options)? q.options.join("\n"):"", required:q.required!==false, allowOther: !!q.allowOther }));
  updatePreview();
  showToast(`Template "${chip.textContent.trim()}" loaded`,"info");
});

function addQuestionRow(prefill={}){
  const row = document.createElement("div");
  row.className = "q-builder";
  row.draggable = true;
  const typeVal = prefill.type || "radio";
  const labelVal = esc(prefill.label||"");
  const optsVal = esc(prefill.options||"");
  const reqChecked = prefill.required!==false ? "checked":"";
  const otherChecked = prefill.allowOther ? "checked":"";
  row.innerHTML = `
    <div class="qb-top">
      <span class="drag-handle" title="Drag to reorder" aria-label="Drag to reorder">${ICONS.drag}</span>
      <select class="qb-type" aria-label="Question type">
        <option value="radio" ${typeVal==="radio"?"selected":""}>Radio (single choice)</option>
        <option value="checkbox" ${typeVal==="checkbox"?"selected":""}>Checkbox (multi-select)</option>
        <option value="dropdown" ${typeVal==="dropdown"?"selected":""}>Dropdown</option>
        <option value="text" ${typeVal==="text"?"selected":""}>Text (open answer)</option>
        <option value="rating" ${typeVal==="rating"?"selected":""}>Rating ★ (1-5)</option>
        <option value="scale" ${typeVal==="scale"?"selected":""}>Linear scale (1-5 / 1-10)</option>
      </select>
      <button type="button" class="mini-btn danger qb-remove" aria-label="Remove question">${ICONS.close}</button>
    </div>
    <input class="qb-label" type="text" placeholder="Question text — e.g., How often do you study late?" value="${labelVal}">
    <textarea class="qb-options" rows="3" placeholder="Options — one per line&#10;Daily&#10;Weekly">${optsVal}</textarea>
    <div class="qb-toggles">
      <label><input type="checkbox" class="qb-required" ${reqChecked}> Required</label>
      <label class="qb-other-wrap"><input type="checkbox" class="qb-other" ${otherChecked}> Allow &ldquo;Other&rdquo; write-in</label>
    </div>`;
  const removeBtn = row.querySelector(".qb-remove");
  removeBtn.addEventListener("click", () => { row.remove(); updatePreview(); });

  const typeSel = row.querySelector(".qb-type");
  const optsEl = row.querySelector(".qb-options");
  const otherWrap = row.querySelector(".qb-other-wrap");
  const syncType = ()=>{
    const v=typeSel.value;
    if(v==="text"){ optsEl.classList.add("hidden"); otherWrap.classList.add("hidden"); optsEl.value=""; }
    else if(v==="rating"){ optsEl.classList.remove("hidden"); otherWrap.classList.add("hidden"); if(!optsEl.value.trim()) optsEl.value="1\n2\n3\n4\n5"; }
    else if(v==="scale"){ optsEl.classList.remove("hidden"); otherWrap.classList.add("hidden"); if(!optsEl.value.trim()) optsEl.value="1\n2\n3\n4\n5"; }
    else { optsEl.classList.remove("hidden"); otherWrap.classList.remove("hidden"); }
    updatePreview();
  };
  typeSel.addEventListener("change", syncType);
  syncType();

  // live preview on input
  row.querySelectorAll("input, textarea, select").forEach(el=> el.addEventListener("input", debounce(updatePreview, 300)));
  row.querySelectorAll("input, select").forEach(el=> el.addEventListener("change", updatePreview));

  // drag & drop
  row.addEventListener("dragstart", (e)=>{
    row.classList.add("dragging");
    e.dataTransfer.effectAllowed="move";
    e.dataTransfer.setData("text/plain","drag");
    row._dragIdx = [...qList.children].indexOf(row);
  });
  row.addEventListener("dragend", ()=> row.classList.remove("dragging"));
  row.addEventListener("dragover", (e)=>{
    e.preventDefault();
    row.classList.add("drag-over");
  });
  row.addEventListener("dragleave", ()=> row.classList.remove("drag-over"));
  row.addEventListener("drop", (e)=>{
    e.preventDefault();
    row.classList.remove("drag-over");
    const dragging = qList.querySelector(".dragging");
    if(!dragging || dragging===row) return;
    const rect = row.getBoundingClientRect();
    const after = (e.clientY - rect.top) > rect.height/2;
    if(after) row.after(dragging);
    else row.before(dragging);
    updatePreview();
    showToast("Reordered","info",1400);
  });

  qList.appendChild(row);
  return row;
}

// allow dropping on list itself
qList.addEventListener("dragover", e=> e.preventDefault());
qList.addEventListener("drop", e=>{
  const dragging = qList.querySelector(".dragging");
  if(!dragging) return;
  // if dropped on empty space, append
  if(e.target===qList) qList.appendChild(dragging);
});

/* ---------- live preview ---------- */
document.getElementById("previewBtn")?.addEventListener("click", ()=>{
  if(previewShell.style.display==="none"){ previewShell.style.display=""; updatePreview(); }
  else previewShell.style.display="none";
});
document.getElementById("previewToggle")?.addEventListener("click", ()=> previewShell.style.display="none");

function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }

function collectBuilderQuestions(){
  const qs=[];
  qList.querySelectorAll(".q-builder").forEach((row,i)=>{
    const label=row.querySelector(".qb-label").value.trim() || `Question ${i+1}`;
    let type=row.querySelector(".qb-type").value;
    let options = row.querySelector(".qb-options").value.split("\n").map(s=>s.trim()).filter(Boolean);
    const required=row.querySelector(".qb-required").checked;
    const allowOther=row.querySelector(".qb-other").checked;
    // map virtual types to preview display
    let displayAs=null;
    if(type==="rating"||type==="scale"){ displayAs=type; type="radio"; if(options.length<2) options=["1","2","3","4","5"]; }
    qs.push({ id:`q${i+1}`, type, label, options, required, allowOther, displayAs });
  });
  return qs;
}
function updatePreview(){
  if(!previewBody || previewShell.style.display==="none") return;
  const qs=collectBuilderQuestions();
  if(!qs.length){ previewBody.innerHTML='<p class="empty-note">No questions yet</p>'; return; }
  previewBody.innerHTML = qs.map((q,idx)=>{
    const num=idx+1;
    const head=`<div style="font-weight:700;font-size:14px;margin-bottom:8px">${num}. ${esc(q.label)} ${q.required?"":'<span style="color:var(--subtle);font-weight:500">(optional)</span>'}</div>`;
    if(q.displayAs==="rating"){
      return `<div class="question">${head}<div class="rating-row" style="margin-top:8px">${q.options.map(o=>`<span class="rating-star" style="cursor:default">★</span>`).join("")}</div></div>`;
    }
    if(q.displayAs==="scale"){
      return `<div class="question">${head}<div class="scale-row">${q.options.map(o=>`<span class="scale-btn" style="cursor:default">${esc(o)}</span>`).join("")}</div></div>`;
    }
    if(q.type==="text") return `<div class="question">${head}<textarea placeholder="Share your thoughts..." rows="2" style="width:100%;margin-top:8px;padding:10px;border:1px solid var(--border);border-radius:10px" disabled></textarea></div>`;
    if(q.type==="dropdown") return `<div class="question">${head}<div class="custom-select-trigger" style="margin-top:8px;opacity:.7">Select an option…</div></div>`;
    const opts = q.options.map(o=>`<label class="option" style="pointer-events:none"><span class="control"></span><span class="option-text">${esc(o)}</span></label>`).join("");
    return `<div class="question">${head}<div class="options" style="margin-top:8px">${opts}${q.allowOther?'<label class="option"><span class="control"></span><span class="option-text">Other</span></label>':''}</div></div>`;
  }).join("");
}

/* ---------- import / export ---------- */
document.getElementById("exportJsonBtn")?.addEventListener("click",()=>{
  const payload = {
    title: document.getElementById("bTitle").value.trim(),
    description: document.getElementById("bDesc").value.trim(),
    questions: collectBuilderQuestions().map(q=>{
      // for export, keep displayAs as real type if present
      if(q.displayAs) return { type:q.displayAs, label:q.label, options:q.options, required:q.required };
      if(q.type==="text") return { type:q.type, label:q.label, required:q.required };
      return { type:q.type, label:q.label, options:q.options, required:q.required, allowOther:q.allowOther };
    })
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${payload.title||"form"}.json`.replace(/\s+/g,"_"); a.click(); URL.revokeObjectURL(a.href);
  showToast("Exported JSON","success");
});
document.getElementById("importJsonInput")?.addEventListener("change", async (e)=>{
  const file=e.target.files[0]; if(!file) return;
  if (file.size > 200 * 1024) { showToast("File too large (max 200KB)","error"); e.target.value=""; return; }
  try{
    const text=await file.text();
    if (text.length > 200 * 1024) throw new Error("JSON too large");
    const data=JSON.parse(text);
    const qs = Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : null);
    if(!Array.isArray(qs)) throw new Error("Invalid JSON: expected questions array");
    if (qs.length > 50) throw new Error("Too many questions (max 50)");
    for (const q of qs) {
      if (!q || typeof q.label !== "string" || q.label.length > 300) throw new Error("Question label too long or missing");
      if (q.options && Array.isArray(q.options) && q.options.length > 20) throw new Error("Too many options (max 20)");
      if (q.options && Array.isArray(q.options) && q.options.some(o=> typeof o==="string" && o.length>100)) throw new Error("Option too long (max 100)");
    }
    if(data.title && data.title.length > 200) throw new Error("Title too long (max 200)");
    if(data.description && data.description.length > 500) throw new Error("Description too long (max 500)");
    if(data.title) document.getElementById("bTitle").value=data.title;
    if(data.description) document.getElementById("bDesc").value=data.description;
    qList.innerHTML="";
    qs.forEach(q=>{
      addQuestionRow({ type:q.type, label:q.label, options: Array.isArray(q.options)? q.options.join("\n"):"", required:q.required!==false, allowOther: !!q.allowOther });
    });
    updatePreview();
    showToast("Imported JSON","success");
  } catch(err){ showToast("Import failed: "+err.message,"error"); }
  e.target.value="";
});

document.getElementById("createBtn").addEventListener("click", async () => {
  const title = document.getElementById("bTitle").value.trim();
  const description = document.getElementById("bDesc").value.trim();
  const questions = [];
  let localErr = "";
  document.querySelectorAll("#qList .q-builder").forEach((row, i) => {
    const label = row.querySelector(".qb-label").value.trim();
    let type = row.querySelector(".qb-type").value;
    let options = row.querySelector(".qb-options").value.split("\n").map((s) => s.trim()).filter(Boolean);
    const required = row.querySelector(".qb-required").checked;
    if (!localErr) {
      if (!label) localErr = `Question ${i + 1}: missing question text.`;
      else if (type !== "text" && options.length < 2)
        localErr = `Question ${i + 1}: needs at least 2 options (one per line).`;
    }
    // map virtual types to server-compatible
    if(type==="rating"||type==="scale"){
      type="radio";
      // ensure numeric options
      if(options.length<2) options=["1","2","3","4","5"];
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
  if (localErr) { showError(localErr); showToast(localErr,"error"); return; }
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
    showToast("Form created!","success");
    closeBuilder();
    init();
  } catch (err) {
    showError(err.message);
    showToast(err.message,"error");
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
  qList.innerHTML = "";
  previewShell.style.display="none";
  hideError();
  const btn=document.getElementById("createBtn");
  btn.disabled=false; btn.textContent="Create form";
}
/* ---------- utils ---------- */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function showError(msg) {
  adminError.textContent = msg;
  adminError.classList.remove("hidden");
}
function hideError() {
  adminError.classList.add("hidden");
}
function renderRestricted() {
  document.querySelector("h1").textContent = "Access restricted";
  listArea.innerHTML = '<div class="result error">Admin access is restricted to allowlisted IPs.</div>';
  document.getElementById("newFormBtn").classList.add("hidden");
}
function renderError(msg) {
  listArea.innerHTML = `<div class="result error">${esc(msg)}</div>`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
init();
