// =======================
// CONFIG SUPABASE
// =======================
const SUPABASE_URL = "https://iygjugvybdocwdlsmtdg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z2p1Z3Z5YmRvY3dkbHNtdGRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDAzNTUsImV4cCI6MjA4NTMxNjM1NX0.eRn9ILl2w4I_VGLfijPfrikKEv5jFOfVDT-dKft81HM";

let supabaseClient = null;
let employeesCache = [];

// =======================
// DOM
// =======================
const statusText = document.getElementById("statusText");
const loginBox = document.getElementById("loginBox");
const appBox = document.getElementById("appBox");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnReload = document.getElementById("btnReload");
const loginMsg = document.getElementById("loginMsg");
const tbodyEmployees = document.getElementById("tbodyEmployees");
const filterUnit = document.getElementById("filterUnit");
const summaryText = document.getElementById("summaryText");

function setStatus(html) {
  statusText.innerHTML = `Status: ${html}`;
}

function showLogin(msg = "") {
  loginBox.classList.remove("hide");
  appBox.classList.add("hide");
  loginMsg.innerHTML = msg ? msg : "";
}

function showApp() {
  loginBox.classList.add("hide");
  appBox.classList.remove("hide");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function calcStatus(row) {
  // otomatis nonaktif kalau ada resign_date
  if (row?.resign_date) return "Tidak Aktif";
  return "Aktif";
}

function formatDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID");
  } catch {
    return d;
  }
}

// =======================
// INIT
// =======================
function initSupabase() {
  if (!window.supabase) {
    setStatus(`<span class="danger">Supabase library tidak kebaca ❌</span>`);
    showLogin(`<span class="danger">CDN Supabase gagal load. Cek internet / script tag.</span>`);
    return false;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  setStatus(`<span class="ok">Supabase siap ✅</span>`);
  return true;
}

async function checkSessionAndAutoLogin() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showLogin(`<span class="danger">Session error: ${esc(error.message)}</span>`);
    return;
  }

  if (data?.session?.user) {
    showApp();
    await loadEmployees();
    renderAll();
  } else {
    showLogin(`<span class="muted">Silakan login dulu.</span>`);
  }
}

// =======================
// AUTH
// =======================
async function handleLogin() {
  loginMsg.innerHTML = `<span class="muted">Login...</span>`;
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginMsg.innerHTML = `<span class="danger">Email & password wajib diisi.</span>`;
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginMsg.innerHTML = `<span class="danger">Gagal: ${esc(error.message)}</span>`;
    return;
  }

  if (!data?.user) {
    loginMsg.innerHTML = `<span class="danger">Login gagal (user kosong).</span>`;
    return;
  }

  loginMsg.innerHTML = `<span class="ok">Login sukses ✅</span>`;
  showApp();
  await loadEmployees();
  renderAll();
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  employeesCache = [];
  tbodyEmployees.innerHTML = "";
  showLogin(`<span class="muted">Logout sukses.</span>`);
}

// =======================
// DATA
// =======================
async function loadEmployees() {
  setStatus(`<span class="muted">Loading data...</span>`);

  const { data, error } = await supabaseClient
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    setStatus(`<span class="danger">Load gagal ❌</span>`);
    showApp();
    tbodyEmployees.innerHTML = `
      <tr><td colspan="8" class="danger">Error load: ${esc(error.message)}</td></tr>
    `;
    return;
  }

  employeesCache = data || [];
  setStatus(`<span class="ok">Data loaded ✅ (${employeesCache.length})</span>`);
}

function buildUnitOptions() {
  const units = Array.from(new Set(employeesCache.map(e => e.unit_kerja).filter(Boolean))).sort();
  const base = ["Semua Unit", ...units];

  filterUnit.innerHTML = base.map(u => `<option value="${esc(u)}">${esc(u)}</option>`).join("");
}

function renderTable() {
  const selected = filterUnit.value || "Semua Unit";
  let rows = employeesCache;

  if (selected !== "Semua Unit") {
    rows = rows.filter(e => (e.unit_kerja || "") === selected);
  }

  if (!rows.length) {
    tbodyEmployees.innerHTML = `<tr><td colspan="8" class="muted">Belum ada data.</td></tr>`;
    return;
  }

  tbodyEmployees.innerHTML = rows.map(e => {
    const status = calcStatus(e);
    return `
      <tr>
        <td>${esc(e.nama)}</td>
        <td>${esc(e.nomor_karyawan)}</td>
        <td>${esc(e.jenis_kelamin)}</td>
        <td>${esc(e.unit_kerja)}</td>
        <td>${esc(e.jabatan)}</td>
        <td>${status === "Aktif" ? `<span class="ok">Aktif</span>` : `<span class="danger">Tidak Aktif</span>`}</td>
        <td>${formatDate(e.join_date)}</td>
        <td>${formatDate(e.resign_date)}</td>
      </tr>
    `;
  }).join("");
}

function renderSummary() {
  const total = employeesCache.length;
  const aktif = employeesCache.filter(e => !e.resign_date).length;
  const nonaktif = total - aktif;

  summaryText.textContent = `Total: ${total} | Aktif: ${aktif} | Tidak Aktif: ${nonaktif}`;
}

function renderAll() {
  buildUnitOptions();
  renderSummary();
  renderTable();
}

// =======================
// EVENTS
// =======================
btnLogin.addEventListener("click", (e) => {
  e.preventDefault();
  handleLogin();
});

btnLogout.addEventListener("click", (e) => {
  e.preventDefault();
  handleLogout();
});

btnReload.addEventListener("click", async (e) => {
  e.preventDefault();
  await loadEmployees();
  renderAll();
});

filterUnit.addEventListener("change", () => {
  renderTable();
});

// =======================
// BOOT
// =======================
(function boot() {
  const ok = initSupabase();
  if (!ok) return;

  checkSessionAndAutoLogin().catch(err => {
    setStatus(`<span class="danger">Boot error ❌</span>`);
    showLogin(`<span class="danger">Boot error: ${esc(err.message || err)}</span>`);
  });
})();