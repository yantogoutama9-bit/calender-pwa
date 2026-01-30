// HRIS Offline PWA - app.js
// + Jenis Kelamin + Grafik L/P + Turnover resign (nonaktif)

const APP_VERSION = "1.1";
const LS_KEY = "HRIS_EMPLOYEES_V1";

const UNITS = [
  "Batik Omah Laweyan",
  "Batik Omah Laweyan Cemani",
  "Uniform",
  "Saudagar Laweyan",
  "Solo Baru",
  "Digital Creative",
  "Umroh",
];

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function rupiah(n) {
  const num = Number(n || 0);
  return "Rp " + num.toLocaleString("id-ID");
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function uid() {
  return "EMP-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function calcNet(emp) {
  return safeNum(emp.gajiPokok) + safeNum(emp.tunjangan) - safeNum(emp.potongan);
}

function clampPct(x) {
  return Math.max(0, Math.min(100, x));
}

// ===== State =====
let employees = [];
let editingId = null;

// ===== Storage =====
function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error(e);
    return [];
  }
}

function saveData() {
  localStorage.setItem(LS_KEY, JSON.stringify(employees));
  $("dataStatus").textContent = `💾 Data: tersimpan (${employees.length})`;
}

// ===== UI Populate =====
function populateUnits() {
  const unitSel = $("unit");
  const filterUnit = $("filterUnit");

  unitSel.innerHTML = "";
  filterUnit.innerHTML = `<option value="">Semua Unit</option>`;

  for (const u of UNITS) {
    const opt1 = document.createElement("option");
    opt1.value = u;
    opt1.textContent = u;
    unitSel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = u;
    opt2.textContent = u;
    filterUnit.appendChild(opt2);
  }
}

function resetForm() {
  editingId = null;
  $("formTitle").textContent = "➕ Tambah Karyawan";
  $("editingPill").style.display = "none";
  $("btnDelete").style.display = "none";
  $("btnSave").textContent = "💾 Simpan";

  $("nama").value = "";
  $("nik").value = "";
  $("status").value = "aktif";
  $("jk").value = "L";
  $("unit").value = UNITS[0] || "";
  $("jabatan").value = "";
  $("gajiPokok").value = "";
  $("tunjangan").value = "";
  $("potongan").value = "";
  $("catatan").value = "";
}

function setEdit(emp) {
  editingId = emp.id;
  $("formTitle").textContent = "✏️ Edit Karyawan";
  $("editingPill").style.display = "inline-flex";
  $("btnDelete").style.display = "inline-block";
  $("btnSave").textContent = "💾 Update";

  $("nama").value = emp.nama || "";
  $("nik").value = emp.nik || "";
  $("status").value = emp.status || "aktif";
  $("jk").value = emp.jk || "L";
  $("unit").value = emp.unit || (UNITS[0] || "");
  $("jabatan").value = emp.jabatan || "";
  $("gajiPokok").value = safeNum(emp.gajiPokok);
  $("tunjangan").value = safeNum(emp.tunjangan);
  $("potongan").value = safeNum(emp.potongan);
  $("catatan").value = emp.catatan || "";
}

function renderCharts(listFiltered) {
  // Grafik pakai DATA AKTIF untuk L/P
  const aktif = listFiltered.filter(e => e.status === "aktif");
  const totalAktif = aktif.length;

  const cntL = aktif.filter(e => (e.jk || "L") === "L").length;
  const cntP = aktif.filter(e => (e.jk || "L") === "P").length;

  $("cntL").textContent = cntL;
  $("cntP").textContent = cntP;

  const pctL = totalAktif ? (cntL / totalAktif) * 100 : 0;
  $("barL").style.width = `${clampPct(pctL)}%`;

  // Turnover: resign = nonaktif (pakai data hasil filter)
  const totalAll = listFiltered.length;
  const resign = listFiltered.filter(e => e.status === "nonaktif").length;

  $("cntResign").textContent = resign;
  $("cntTotal").textContent = totalAll;

  const rate = totalAll ? (resign / totalAll) * 100 : 0;
  $("rateResign").textContent = `${rate.toFixed(1)}%`;

  $("barResign").style.width = `${clampPct(rate)}%`;
}

function renderKPIs(list) {
  const aktif = list.filter(e => e.status === "aktif").length;
  const nonaktif = list.filter(e => e.status === "nonaktif").length;

  const totalPayroll = list
    .filter(e => e.status === "aktif")
    .reduce((acc, e) => acc + calcNet(e), 0);

  $("kpiAktif").textContent = aktif;
  $("kpiNonaktif").textContent = nonaktif;
  $("kpiPayroll").textContent = rupiah(totalPayroll);
}

function getFilteredList() {
  const q = $("search").value.trim().toLowerCase();
  const fu = $("filterUnit").value;
  const fs = $("filterStatus").value;

  let list = [...employees];

  if (q) {
    list = list.filter(e =>
      (e.nama || "").toLowerCase().includes(q) ||
      (e.nik || "").toLowerCase().includes(q) ||
      (e.jabatan || "").toLowerCase().includes(q)
    );
  }
  if (fu) list = list.filter(e => e.unit === fu);
  if (fs) list = list.filter(e => e.status === fs);

  // Sort: aktif dulu, lalu nama
  list.sort((a, b) => {
    if (a.status !== b.status) return a.status === "aktif" ? -1 : 1;
    return (a.nama || "").localeCompare(b.nama || "", "id");
  });

  return list;
}

function renderTable() {
  const list = getFilteredList();

  $("countPill").textContent = `${list.length} data`;
  renderKPIs(list);
  renderCharts(list);

  const tbody = $("tbody");
  tbody.innerHTML = "";

  if (list.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" class="muted">Belum ada data. Tambahkan karyawan dulu ya 😄</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const emp of list) {
    const tr = document.createElement("tr");

    const statusBadge = emp.status === "aktif"
      ? `<span class="status"><span class="dot good"></span> Aktif</span>`
      : `<span class="status"><span class="dot bad"></span> Tidak Aktif</span>`;

    tr.innerHTML = `
      <td><b>${emp.nama || "-"}</b><div class="muted" style="font-size:12px;margin-top:3px">${emp.catatan ? "📝 " + emp.catatan : ""}</div></td>
      <td>${emp.nik || "-"}</td>
      <td>${emp.jk === "P" ? "P" : "L"}</td>
      <td>${emp.unit || "-"}</td>
      <td>${emp.jabatan || "-"}</td>
      <td>${statusBadge}</td>
      <td class="money">${rupiah(calcNet(emp))}</td>
      <td>
        <div class="actions">
          <button class="small" data-act="edit" data-id="${emp.id}">✏️ Edit</button>
          <button class="small" data-act="toggle" data-id="${emp.id}">
            ${emp.status === "aktif" ? "🚫 Nonaktifkan" : "✅ Aktifkan"}
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

function upsertEmployee(data) {
  if (editingId) {
    const idx = employees.findIndex(e => e.id === editingId);
    if (idx >= 0) {
      employees[idx] = { ...employees[idx], ...data };
      toast("✅ Data karyawan di-update");
    }
  } else {
    employees.unshift({
      id: uid(),
      createdAt: new Date().toISOString(),
      ...data,
    });
    toast("✅ Karyawan ditambahkan");
  }
  saveData();
  renderTable();
  resetForm();
}

function deleteEmployee(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;

  const ok = confirm(`Hapus karyawan:\n\n${emp.nama}\n(${emp.nik || "-"})\n\nYakin?`);
  if (!ok) return;

  employees = employees.filter(e => e.id !== id);
  saveData();
  renderTable();
  resetForm();
  toast("🗑️ Data dihapus");
}

function toggleStatus(id) {
  const idx = employees.findIndex(e => e.id === id);
  if (idx < 0) return;

  const cur = employees[idx].status || "aktif";
  employees[idx].status = cur === "aktif" ? "nonaktif" : "aktif";

  saveData();
  renderTable();
  toast("🔁 Status diubah");
}

function exportJSON() {
  const payload = {
    app: "HRIS Offline PWA",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    employees,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hris-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("⬇️ Export berhasil");
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.employees;

      if (!Array.isArray(incoming)) {
        alert("File JSON tidak valid.");
        return;
      }

      employees = incoming.map(e => ({
        id: e.id || uid(),
        createdAt: e.createdAt || new Date().toISOString(),
        nama: e.nama || "",
        nik: e.nik || "",
        status: e.status === "nonaktif" ? "nonaktif" : "aktif",
        jk: e.jk === "P" ? "P" : "L",
        unit: e.unit || (UNITS[0] || ""),
        jabatan: e.jabatan || "",
        gajiPokok: safeNum(e.gajiPokok),
        tunjangan: safeNum(e.tunjangan),
        potongan: safeNum(e.potongan),
        catatan: e.catatan || "",
      }));

      saveData();
      renderTable();
      resetForm();
      toast("⬆️ Import berhasil");
    } catch (e) {
      console.error(e);
      alert("Gagal import. File JSON rusak / format salah.");
    }
  };
  reader.readAsText(file);
}

// ===== Events =====
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const act = btn.dataset.act;
  const id = btn.dataset.id;

  if (act === "edit") {
    const emp = employees.find(x => x.id === id);
    if (emp) setEdit(emp);
  }
  if (act === "toggle") toggleStatus(id);
});

$("empForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    nama: $("nama").value.trim(),
    nik: $("nik").value.trim(),
    status: $("status").value,
    jk: $("jk").value,
    unit: $("unit").value,
    jabatan: $("jabatan").value.trim(),
    gajiPokok: safeNum($("gajiPokok").value),
    tunjangan: safeNum($("tunjangan").value),
    potongan: safeNum($("potongan").value),
    catatan: $("catatan").value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (!data.nama) {
    toast("⚠️ Nama wajib diisi");
    return;
  }

  upsertEmployee(data);
});

$("btnResetForm").addEventListener("click", () => resetForm());

$("btnDelete").addEventListener("click", () => {
  if (!editingId) return;
  deleteEmployee(editingId);
});

$("search").addEventListener("input", () => renderTable());
$("filterUnit").addEventListener("change", () => renderTable());
$("filterStatus").addEventListener("change", () => renderTable());

$("btnExport").addEventListener("click", exportJSON);

$("btnImport").addEventListener("click", () => {
  $("fileInput").value = "";
  $("fileInput").click();
});

$("fileInput").addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (f) importJSON(f);
});

$("btnResetAll").addEventListener("click", () => {
  const ok = confirm("Reset semua data HRIS? Ini akan menghapus semua karyawan dari perangkat ini.");
  if (!ok) return;
  employees = [];
  saveData();
  renderTable();
  resetForm();
  toast("🧨 Data di-reset");
});

// ===== PWA =====
async function initPWA() {
  $("ver").textContent = APP_VERSION;

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
      $("pwaStatus").textContent = "📦 PWA: siap offline";
    } catch (e) {
      console.warn(e);
      $("pwaStatus").textContent = "📦 PWA: gagal (cek hosting)";
    }
  } else {
    $("pwaStatus").textContent = "📦 PWA: tidak didukung";
  }
}

// ===== Init =====
(function init() {
  populateUnits();
  employees = loadData();

  // Migrasi data lama (yang belum ada jk) biar gak error
  employees = employees.map(e => ({
    ...e,
    jk: e.jk === "P" ? "P" : "L",
  }));

  saveData();
  resetForm();
  renderTable();
  initPWA();
})();