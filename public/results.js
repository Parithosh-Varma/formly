const chartsEl = document.getElementById("charts");
const toastStack = document.getElementById("toastStack");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const filterQuestion = document.getElementById("filterQuestion");
const pagination = document.getElementById("pagination");
const pageInfo = document.getElementById("pageInfo");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const toolbar = document.getElementById("resultsToolbar");

let allData = null;
let currentChart = "bar";
let currentPage = 1;
const PAGE_SIZE = 5;
let currentFormId = null;

/* theme */
(function initTheme(){
  const saved = localStorage.getItem("theme");
  if(saved) document.documentElement.setAttribute("data-theme", saved);
  else if(window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.setAttribute("data-theme","dark");
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

function showToast(msg, type="info", dur=3200){
  if(!toastStack) return;
  const el=document.createElement("div");
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${esc(msg)}</span><button type="button">✕</button>`;
  el.querySelector("button").addEventListener("click",()=>dismissToast(el));
  toastStack.appendChild(el);
  el._t=setTimeout(()=>dismissToast(el),dur);
}
function dismissToast(el){ if(!el||!el.parentNode) return; clearTimeout(el._t); el.style.animation="toastOut .22s ease forwards"; setTimeout(()=>el.remove(),220); }
function confirmModal(title, msg, opts={}){
  const backdrop=document.getElementById("confirmModal");
  const t=document.getElementById("modalTitle");
  const m=document.getElementById("modalMsg");
  const ok=document.getElementById("modalOk");
  const cancel=document.getElementById("modalCancel");
  if(!backdrop) return Promise.resolve(confirm(msg));
  t.textContent=title; m.textContent=msg; ok.textContent=opts.okText||"Confirm"; ok.className= opts.danger ? "danger-btn" : "submit";
  backdrop.classList.add("show"); ok.focus();
  return new Promise(resolve=>{
    const close=(v)=>{ backdrop.classList.remove("show"); ok.removeEventListener("click",onOk); cancel.removeEventListener("click",onCancel); backdrop.removeEventListener("click",onBackdrop); document.removeEventListener("keydown",onKey); resolve(v); };
    const onOk=()=>close(true); const onCancel=()=>close(false);
    const onBackdrop=(e)=>{ if(e.target===backdrop) close(false); };
    const onKey=(e)=>{ if(e.key==="Escape") close(false); };
    ok.addEventListener("click",onOk); cancel.addEventListener("click",onCancel); backdrop.addEventListener("click",onBackdrop); document.addEventListener("keydown",onKey);
  });
}

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
  currentFormId = formId;
  wireToolbar();
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
    document.title = `Results — ${data.total} responses`;
    allData = data;
    if (data.total === 0) {
      document.getElementById("formTitle").textContent = "Survey Results";
      chartsEl.innerHTML = '<div class="result info">No responses yet — submit the survey first, then refresh this page.</div>';
      toolbar.style.display="none";
      pagination.classList.add("hidden");
      return;
    }
    // populate filterQuestion
    if(filterQuestion){
      const opts = Object.entries(data.summary).map(([qid,q])=> `<option value="${qid}">${esc(q.label.slice(0,40))}</option>`).join("");
      filterQuestion.innerHTML = `<option value="">All questions</option>`+opts;
    }
    toolbar.style.display="flex";
    renderCharts(data);
    // animate stats
    animateNumber("statTotal", data.total);
  } catch (err) {
    renderError(err.message);
  }
}
function animateNumber(id, target){
  const el=document.getElementById(id);
  if(!el || isNaN(target)) return;
  let cur=0; const step=Math.ceil(target/20); const timer=setInterval(()=>{ cur=Math.min(target, cur+step); el.textContent=cur; if(cur>=target) clearInterval(timer); }, 30);
}
function mergeTextAnswers(publicSummary, ownerSummary) {
  const merged = JSON.parse(JSON.stringify(publicSummary));
  for (const [qid, s] of Object.entries(merged)) {
    if (s.type === "text") s.answers = ownerSummary[qid]?.answers || [];
  }
  return merged;
}
function wireToolbar(){
  searchInput?.addEventListener("input", debounce(()=>{ currentPage=1; if(allData) renderCharts(allData); }, 250));
  sortSelect?.addEventListener("change", ()=>{ currentPage=1; if(allData) renderCharts(allData); });
  filterQuestion?.addEventListener("change", ()=>{ currentPage=1; if(allData) renderCharts(allData); });
  document.getElementById("chartBarBtn")?.addEventListener("click", ()=> switchChart("bar"));
  document.getElementById("chartDonutBtn")?.addEventListener("click", ()=> switchChart("donut"));
  document.getElementById("exportCsvBtn")?.addEventListener("click", exportCsv);
  document.getElementById("copyLinkBtn")?.addEventListener("click", async ()=>{
    const url=location.href;
    try{ await navigator.clipboard.writeText(url); showToast("Link copied","success"); } catch{ prompt("Copy link:",url); }
  });
  prevPageBtn?.addEventListener("click", ()=>{ if(currentPage>1){ currentPage--; renderCharts(allData); }});
  nextPageBtn?.addEventListener("click", ()=>{ currentPage++; renderCharts(allData); });
  document.getElementById("clearBtn")?.addEventListener("click", async ()=>{
    const ok=await confirmModal("Clear all responses?","This will delete ALL responses for this form. Cannot be undone.",{ okText:"Clear all", danger:true });
    if(!ok) return;
    try{
      const res=await fetch(`/api/forms/${currentFormId}/responses`,{method:"DELETE"});
      const data=await res.json();
      if(!res.ok) throw new Error(data.message);
      showToast("Responses cleared","success");
      setTimeout(()=>location.reload(),700);
    } catch(err){ showToast(err.message,"error"); }
  });
}
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function switchChart(type){
  currentChart=type;
  document.getElementById("chartBarBtn")?.classList.toggle("on", type==="bar");
  document.getElementById("chartDonutBtn")?.classList.toggle("on", type==="donut");
  if(allData) renderCharts(allData);
}
function filteredEntries(){
  if(!allData) return [];
  let entries = Object.entries(allData.summary);
  const qFilter = filterQuestion?.value || "";
  if(qFilter) entries = entries.filter(([qid])=> qid===qFilter);
  const term = (searchInput?.value || "").trim().toLowerCase();
  if(term){
    entries = entries.filter(([qid,q])=>{
      if(q.label.toLowerCase().includes(term)) return true;
      if(q.type==="text" && q.answers?.some(a=> a.toLowerCase().includes(term))) return true;
      if(q.counts && Object.keys(q.counts).some(k=> k.toLowerCase().includes(term))) return true;
      return false;
    });
  }
  const sort = sortSelect?.value || "default";
  if(sort==="alpha"){
    entries.sort((a,b)=> a[1].label.localeCompare(b[1].label));
  } else if(sort==="count"){
    // sort by total counts descending - for mixed types, textCount first
    entries.sort((a,b)=>{
      const ca = a[1].type==="text" ? (a[1].textCount||0) : Object.values(a[1].counts||{}).reduce((s,v)=>s+v,0);
      const cb = b[1].type==="text" ? (b[1].textCount||0) : Object.values(b[1].counts||{}).reduce((s,v)=>s+v,0);
      return cb-ca;
    });
  }
  return entries;
}
function renderCharts(data) {
  const entries = filteredEntries();
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  if(currentPage>totalPages) currentPage=totalPages;
  const pageEntries = entries.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);
  if(!pageEntries.length){
    chartsEl.innerHTML = `<div class="result info">No questions match your filter.</div>`;
    pagination.classList.add("hidden");
    return;
  }
  chartsEl.innerHTML = pageEntries.map(([qid, q]) => questionCard(qid, q, data.total)).join("");
  requestAnimationFrame(() => {
    chartsEl.querySelectorAll(".bar-fill").forEach((el) => {
      el.style.width = el.dataset.width;
    });
  });
  // pagination UI
  if(entries.length > PAGE_SIZE){
    pagination.classList.remove("hidden");
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} · ${entries.length} questions`;
    prevPageBtn.disabled = currentPage===1;
    nextPageBtn.disabled = currentPage===totalPages;
  } else {
    pagination.classList.add("hidden");
  }
  // enhance text answers filtering within cards
  if(searchInput?.value){
    const term=searchInput.value.trim().toLowerCase();
    chartsEl.querySelectorAll(".text-answers li").forEach(li=>{
      const match = li.textContent.toLowerCase().includes(term);
      li.style.display = match ? "" : "none";
      if(match && term) {
        const txt=li.textContent;
        const idx=txt.toLowerCase().indexOf(term);
        if(idx!==-1){
          li.innerHTML = `${esc(txt.slice(0,idx))}<mark style="background:#fef08a;padding:0 2px;border-radius:3px">${esc(txt.slice(idx,idx+term.length))}</mark>${esc(txt.slice(idx+term.length))}`;
        }
      }
    });
  }
}
function questionCard(qid, q, total) {
  const num = qid.replace("q", "");
  let body = "";
  if (q.type === "text") {
    if (q.answers?.length) {
      // paginate text answers inside card: show 6 per card page? For simplicity show all but with search filter above
      const answersToShow = q.answers.slice(0, 20); // limit to 20 to avoid overflow
      const more = q.answers.length - answersToShow.length;
      body = `<ul class="text-answers">${answersToShow.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>${more>0?`<p class="hint">+${more} more answers — export CSV to see all</p>`:""}<p class="hint">${q.answers.length} written answer(s)</p>`;
    } else if (q.textCount > 0) {
      body = `<p class="empty-note">${q.textCount} written ${q.textCount === 1 ? "answer" : "answers"} — visible to the survey owner only.</p>`;
    } else {
      body = '<p class="empty-note">No answers yet.</p>';
    }
  } else {
    if(currentChart==="donut"){
      body = donutChart(q, total);
    } else {
      const sort = sortSelect?.value;
      let counts = Object.entries(q.counts);
      if(sort==="count") counts.sort((a,b)=>b[1]-a[1]);
      else if(sort==="alpha") counts.sort((a,b)=>a[0].localeCompare(b[0]));
      else counts.sort((a,b)=>b[1]-a[1]);
      const rows = counts.map(([opt, count], i) => barRow(opt, count, total, i));
      body = `<div class="bars">${rows.join("")}</div>`;
      if (q.type === "checkbox" && total > 0) {
        body += `<p class="hint">Percentages = share of respondents (multi-select).</p>`;
      }
    }
  }
  return `
    <section class="result-card" data-qid="${qid}">
      <h3><span class="qnum">${num}</span><span>${esc(q.label)}</span><span style="margin-left:auto;font-size:11px;font-weight:650;color:var(--subtle);text-transform:uppercase;letter-spacing:.05em">${esc(q.type)}</span></h3>
      ${body}
    </section>`;
}
function donutChart(q, total){
  const entries = Object.entries(q.counts).filter(([,c])=>c>0);
  if(!entries.length) return '<p class="empty-note">No data for donut</p>';
  const colors = ["#111318","#2a303c","#4b5563","#9ca3af","#d1d5db","#f3f4f6","#f59e0b","#059669"];
  // build conic-gradient
  let start=0;
  const segs = entries.map(([label,count],i)=>{
    const pct = total? (count/total)*100 : 0;
    const color = colors[i%colors.length];
    const seg = `${color} ${start}% ${start+pct}%`;
    start+=pct;
    return seg;
  }).join(", ");
  const gradient = `conic-gradient(${segs})`;
  const legend = entries.map(([label,count],i)=>{
    const pct = total? Math.round(count/total*100):0;
    return `<div class="legend-row"><span class="legend-swatch" style="background:${colors[i%colors.length]}"></span><span style="flex:1">${esc(label)}</span><span style="font-weight:700;font-variant-numeric:tabular-nums">${count} · ${pct}%</span></div>`;
  }).join("");
  return `<div class="donut-wrap"><div class="donut" style="background:${gradient}"><div class="donut-center">${total} total</div></div><div class="donut-legend">${legend}</div></div>`;
}
function barRow(label, count, total, i) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const alpha = Math.max(0.18, 0.92 - i * 0.12);
  const isDark = document.documentElement.getAttribute("data-theme")==="dark";
  const bg = isDark ? `rgba(240,241,243,${alpha})` : `rgba(17,19,24,${alpha})`;
  return `
    <div class="bar-row">
      <div class="bar-meta"><span class="bar-label">${esc(label)}</span>
        <span class="bar-count">${count} &middot; ${pct}%</span></div>
      <div class="bar-track"><div class="bar-fill" data-width="${pct}%" style="background:${bg}"></div></div>
    </div>`;
}
function exportCsv(){
  if(!allData) return;
  const rows=[];
  // header: question labels
  const qEntries=Object.entries(allData.summary);
  const headers = qEntries.map(([qid,q])=> `"${q.label.replace(/"/g,'""')}"`);
  rows.push(headers.join(","));
  // if we have responses detail
  if(allData.responses && allData.responses.length){
    allData.responses.forEach(r=>{
      const vals = qEntries.map(([qid,q])=>{
        const v=r.answers[qid];
        let s="";
        if(Array.isArray(v)) s=v.join("; ");
        else if(v!=null) s=String(v);
        return `"${s.replace(/"/g,'""')}"`;
      });
      rows.push(vals.join(","));
    });
  } else {
    // summary-only fallback: counts
    qEntries.forEach(([qid,q])=>{
      if(q.type==="text"){
        rows.push(`"${q.label.replace(/"/g,'""')}","${q.textCount} text answers"`);
      } else {
        Object.entries(q.counts).forEach(([opt,c])=>{
          rows.push(`"${q.label.replace(/"/g,'""')}","${opt.replace(/"/g,'""')}",${c}`);
        });
      }
    });
  }
  const blob=new Blob([rows.join("\n")],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`survey-${currentFormId||"export"}.csv`; a.click(); URL.revokeObjectURL(a.href);
  showToast("CSV exported","success");
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function renderEmpty(msg) {
  document.getElementById("formTitle").textContent = "No forms yet";
  chartsEl.innerHTML = `<div class="result info">${esc(msg)}</div>`;
  toolbar.style.display="none";
}
function renderError(msg) {
  document.getElementById("formTitle").textContent = "Something went wrong";
  chartsEl.innerHTML = `<div class="result error">${esc(msg)}</div>`;
  toolbar.style.display="none";
}
init();
