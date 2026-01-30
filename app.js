// ===============================
// HRIS YG - app.js
// ===============================

const STORAGE_KEY = "yg_hris_employees_v3";

const UNITS = [
  "Batik Omah Laweyan",
  "Batik Omah Laweyan Cemani",
  "Uniform",
  "Saudagar Laweyan",
  "Solo Baru",
  "Digital Creative",
  "Umroh",
];

let employees = [];
let editingId = null;

// -------- Helpers
const $ = (id) => document.getElementById(id);

const fmtIDR = (n) => {
  const num = Number(n || 0);
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(num);
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const calcTHP = (e) => {
  return (
    toNumber(e.gajiPokok) +
    toNumber(e.tunjangan) +
    toNumber(e.lembur) +
    toNumber(e.perjalananDinas) -
    toNumber(e.potongan)
  );
};

const getStatus = (e) => {
  return e.tglResign && e.tglResign.trim() !== "" ? "Tidak Aktif" : "Aktif";
};

const uid = () => "EMP-" + Math.random().toString(16).slice(2) + "-" + Date.now();

// -------- Storage
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    employees = raw ? JSON.parse(raw) : [];
  } catch {
    employees = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}

// -------- UI Init
function initUnits() {
  const unitSelect = $("unit");
  const filterUnit = $("filterUnit");

  unitSelect.innerHTML = `<option value="">Pilih</option>` + UNITS.map(u => `<option value="${u}">${u}</option>`).join("");

  filterUnit.innerHTML =
    `<option value="ALL">Semua Unit</option>` +
    UNITS.map(u => `<option value="${u}">${u}</option>`).join("");
}

function setPwaStatus(text) {
  $("pwaStatus").textContent = text;
}

// -------- Form
function getFormData() {
  const e = {
    id: editingId || uid(),
    nama: $("nama").value.trim(),
    nik: $("nik").value.trim(),
    tglLahir: $("tglLahir").value || "",
    jk: $("jk").value,
    unit: $("unit").value,
    tglJoin: $("tglJoin").value || "",
    tglResign: $("tglResign").value || "",
    jabatan: $("jabatan").value.trim(),
    telp: $("telp").value.trim(),
    email: $("email").value.trim(),
    alamat: $("alamat").value.trim(),
    gajiPokok: toNumber($("gajiPokok").value),
    tunjangan: toNumber($("tunjangan").value),
    lembur: toNumber($("lembur").value),
    perjalananDinas: toNumber($("perjalananDinas").value),
    potongan: toNumber($("potongan").value),
    updatedAt: new Date().toISOString(),
  };

  return e;
}

function fillForm(e) {
  $("nama").value = e.nama || "";
  $("nik").value = e.nik || "";
  $("tglLahir").value = e.tglLahir || "";
  $("jk").value = e.jk || "";
  $("unit").value = e.unit || "";
  $("tglJoin").value = e.tglJoin || "";
  $("tglResign").value = e.tglResign || "";
  $("jabatan").value = e.jabatan || "";
  $("telp").value = e.telp || "";
  $("email").value = e.email || "";
  $("alamat").value = e.alamat || "";
  $("gajiPokok").value = toNumber(e.gajiPokok);
  $("tunjangan").value = toNumber(e.tunjangan);
  $("lembur").value = toNumber(e.lembur);
  $("perjalananDinas").value = toNumber(e.perjalananDinas);
  $("potongan").value = toNumber(e.potongan);

  updateTHPPreview();
}

function resetForm() {
  editingId = null;
  $("empForm").reset();
  $("gajiPokok").value = 0;
  $("tunjangan").value = 0;
  $("lembur").value = 0;
  $("perjalananDinas").value = 0;
  $("potongan").value = 0;
  updateTHPPreview();

  $("btnDelete").style.display = "none";
  $("editModeLabel").textContent = "Mode: Tambah";
  $("btnSave").textContent = "Simpan";
}

function updateTHPPreview() {
  const temp = getFormData();
  $("thp").value = fmtIDR(calcTHP(temp));
}

// -------- Table Rendering
function getFilteredEmployees() {
  const unit = $("filterUnit").value;
  const q = $("search").value.trim().toLowerCase();

  return employees.filter((e) => {
    const matchUnit = unit === "ALL" ? true : e.unit === unit;
    const matchQ =
      q === "" ||
      (e.nama || "").toLowerCase().includes(q) ||
      (e.nik || "").toLowerCase().includes(q);
    return matchUnit && matchQ;
  });
}

function renderTable() {
  const list = getFilteredEmployees();
  const tbody = $("empTable");
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="muted">Belum ada data (atau filter kosong).</td></tr>`;
    return;
  }

  for (const e of list) {
    const status = getStatus(e);
    const thp = calcTHP(e);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <button type="button" data-act="edit" data-id="${e.id}">Edit</button>
      </td>
      <td>
        <span class="pill ${status === "Aktif" ? "ok" : "no"}">
          ${status}
        </span>
      </td>
      <td>${escapeHtml(e.nama)}</td>
      <td>${escapeHtml(e.nik)}</td>
      <td>${escapeHtml(e.jk || "-")}</td>
      <td>${escapeHtml(e.unit || "-")}</td>
      <td>${escapeHtml(e.jabatan || "-")}</td>
      <td>${escapeHtml(e.tglJoin || "-")}</td>
      <td>${escapeHtml(e.tglResign || "-")}</td>
      <td>${fmtIDR(thp)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// -------- KPI + Charts
function renderKPI() {
  const total = employees.length;
  const resign = employees.filter(e => getStatus(e) === "Tidak Aktif").length;
  const aktif = total - resign;

  $("kpiTotal").textContent = total;
  $("kpiAktif").textContent = aktif;
  $("kpiResign").textContent = resign;
}

// Simple Canvas Bar Chart (no external libs)
function drawBarChart(canvas, labels, values) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;

  ctx.clearRect(0, 0, w, h);

  const pad = 22 * devicePixelRatio;
  const maxVal = Math.max(1, ...values);

  // axis
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(148,163,184,.35)";
  ctx.lineWidth = 1 * devicePixelRatio;
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  const barW = (w - pad * 2) / values.length * 0.6;
  const gap = (w - pad * 2) / values.length * 0.4;

  ctx.font = `${11 * devicePixelRatio}px system-ui`;
  ctx.fillStyle = "rgba(226,232,240,.9)";

  values.forEach((v, i) => {
    const x = pad + i * (barW + gap) + gap * 0.5;
    const barH = (h - pad * 2) * (v / maxVal);
    const y = h - pad - barH;

    // bar
    ctx.fillStyle = "rgba(34,197,94,.65)";
    ctx.fillRect(x, y, barW, barH);

    // value
    ctx.fillStyle = "rgba(226,232,240,.9)";
    ctx.fillText(String(v), x, y - 6 * devicePixelRatio);

    // label
    ctx.fillStyle = "rgba(148,163,184,.95)";
    ctx.fillText(labels[i], x, h - pad + 14 * devicePixelRatio);
  });
}

function renderCharts() {
  // Gender
  const male = employees.filter(e => e.jk === "Laki-laki").length;
  const female = employees.filter(e => e.jk === "Perempuan").length;
  drawBarChart($("chartGender"), ["L", "P"], [male, female]);

  // Turnover (jumlah resign)
  const resign = employees.filter(e => getStatus(e) === "Tidak Aktif").length;
  drawBarChart($("chartTurnover"), ["Resign"], [resign]);
}

// -------- Actions
function upsertEmployee(newEmp) {
  // unique by NIK (recommended)
  const idxById = employees.findIndex(e => e.id === newEmp.id);
  const idxByNik = employees.findIndex(e => e.nik === newEmp.nik && e.id !== newEmp.id);

  if (idxByNik !== -1) {
    alert("Nomor Karyawan (NIK) sudah dipakai. Ganti dulu ya bro 😄");
    return false;
  }

  if (idxById === -1) employees.unshift(newEmp);
  else employees[idxById] = newEmp;

  return true;
}

function deleteEmployee(id) {
  employees = employees.filter(e => e.id !== id);
}

// -------- Export/Import JSON
function exportJSON() {
  const blob = new Blob([JSON.stringify(employees, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hris_karyawan_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSONFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("Format tidak valid");

      // merge by id
      employees = data.map(x => ({
        id: x.id || uid(),
        nama: x.nama || "",
        nik: x.nik || "",
        tglLahir: x.tglLahir || "",
        jk: x.jk || "",
        unit: x.unit || "",
        tglJoin: x.tglJoin || "",
        tglResign: x.tglResign || "",
        jabatan: x.jabatan || "",
        telp: x.telp || "",
        email: x.email || "",
        alamat: x.alamat || "",
        gajiPokok: toNumber(x.gajiPokok),
        tunjangan: toNumber(x.tunjangan),
        lembur: toNumber(x.lembur),
        perjalananDinas: toNumber(x.perjalananDinas),
        potongan: toNumber(x.potongan),
        updatedAt: x.updatedAt || new Date().toISOString(),
      }));

      saveData();
      renderAll();
      resetForm();
      alert("Import JSON sukses ✅");
    } catch (err) {
      alert("Gagal import JSON ❌ Pastikan file JSON-nya benar.");
    }
  };
  reader.readAsText(file);
}

// -------- Export Excel
function exportExcel() {
  if (typeof XLSX === "undefined") {
    alert("Library Excel belum kebaca. Pastikan internet nyala pas export ya bro 😄");
    return;
  }

  const rows = getFilteredEmployees().map(e => {
    const status = getStatus(e);
    const thp = calcTHP(e);

    return {
      Status: status,
      Nama: e.nama,
      NIK: e.nik,
      "Tgl Lahir": e.tglLahir || "",
      "Jenis Kelamin": e.jk || "",
      "Unit Kerja": e.unit || "",
      Jabatan: e.jabatan || "",
      "Tgl Join": e.tglJoin || "",
      "Tgl Resign": e.tglResign || "",
      Telepon: e.telp || "",
      Email: e.email || "",
      Alamat: e.alamat || "",
      "Gaji Pokok": toNumber(e.gajiPokok),
      Tunjangan: toNumber(e.tunjangan),
      Lembur: toNumber(e.lembur),
      "Perjalanan Dinas": toNumber(e.perjalananDinas),
      Potongan: toNumber(e.potongan),
      THP: thp,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Karyawan");

  const filename = `HRIS_Karyawan_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// -------- Render All
function renderAll() {
  renderTable();
  renderKPI();
  renderCharts();
}

// -------- Events
function bindEvents() {
  $("empForm").addEventListener("submit", (ev) => {
    ev.preventDefault();

    const e = getFormData();

    if (!e.nama || !e.nik || !e.jk || !e.unit) {
      alert("Nama, NIK, Jenis Kelamin, dan Unit Kerja wajib diisi ya bro 🙏");
      return;
    }

    const ok = upsertEmployee(e);
    if (!ok) return;

    saveData();
    renderAll();
    resetForm();
  });

  $("btnReset").addEventListener("click", resetForm);

  $("empTable").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");

    if (act === "edit") {
      const emp = employees.find(x => x.id === id);
      if (!emp) return;

      editingId = emp.id;
      fillForm(emp);

      $("btnDelete").style.display = "inline-block";
      $("editModeLabel").textContent = "Mode: Edit";
      $("btnSave").textContent = "Update";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  $("btnDelete").addEventListener("click", () => {
    if (!editingId) return;
    const ok = confirm("Yakin mau hapus data karyawan ini?");
    if (!ok) return;

    deleteEmployee(editingId);
    saveData();
    renderAll();
    resetForm();
  });

  ["gajiPokok", "tunjangan", "lembur", "perjalananDinas", "potongan"].forEach(id => {
    $(id).addEventListener("input", updateTHPPreview);
  });

  $("tglResign").addEventListener("input", () => {
    // status auto by tglResign, no extra field needed
    renderAll();
  });

  $("filterUnit").addEventListener("change", renderAll);
  $("search").addEventListener("input", renderAll);

  $("btnExportJson").addEventListener("click", exportJSON);
  $("btnImportJson").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (ev) => {
    const f = ev.target.files?.[0];
    if (f) importJSONFile(f);
    ev.target.value = "";
  });

  $("btnExportExcel").addEventListener("click", exportExcel);
}

// -------- PWA
function initPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then(() => {
      setPwaStatus("Status: PWA siap (offline-ready) ✅");
    }).catch(() => {
      setPwaStatus("Status: PWA gagal register ❌");
    });
  } else {
    setPwaStatus("Status: Browser belum support PWA ⚠️");
  }
}

// -------- Boot
function boot() {
  initUnits();
  loadData();
  bindEvents();
  initPWA();
  resetForm();
  renderAll();
}

boot();