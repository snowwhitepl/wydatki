// backtick = `

/*
Wydatki – logika aplikacji
- lokalne przechowywanie (localStorage)
- obsługa przecinka i kropki w kwocie
- filtr miesięczny, import/eksport JSON
*/

const LS_KEY = "wydatki_v1";

const form = document.getElementById("form");
const amountEl = document.getElementById("amount");
const categoryEl = document.getElementById("category");
const dateEl = document.getElementById("date");
const noteEl = document.getElementById("note");

const listEl = document.getElementById("list");
const totalEl = document.getElementById("total");
const clearBtn = document.getElementById("clearAll");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const monthFilter = document.getElementById("monthFilter");
const tpl = document.getElementById("itemTemplate");

// domyślnie dzisiejsza data
dateEl.valueAsDate = new Date();

let items = load();
renderAll(items);
populateMonthFilter(items);

/* ========== Dodawanie ========== */
form.addEventListener("submit", (e) => {
e.preventDefault();

// akceptujemy "12,50" oraz "12.50"
const raw = (amountEl.value ?? "").trim().replace(",", ".");
const amount = parseFloat(raw);

if (Number.isNaN(amount) || amount <= 0) {
amountEl.focus();
return;
}

const item = {
id: uid(),
amount,
category: categoryEl.value || "Inne",
date: (dateEl.value || new Date().toISOString()).slice(0, 10),
note: (noteEl.value || "").trim()
};

items.push(item);
save(items);

// reset formularza + ponownie ustaw dzisiejszą datę
form.reset();
dateEl.valueAsDate = new Date();

renderAll(items);
populateMonthFilter(items);
});

/* ========== Usuwanie (delegacja) ========== */
listEl.addEventListener("click", (e) => {
const btn = e.target.closest(".item__delete");
if (!btn) return;

const id = btn.closest(".item").dataset.id;
items = items.filter((i) => i.id !== id);
save(items);
renderAll(items);
populateMonthFilter(items);
});

/* ========== Czyszczenie całości ========== */
clearBtn.addEventListener("click", () => {
if (!confirm("Usunąć wszystkie wpisy?")) return;
items = [];
save(items);
renderAll(items);
populateMonthFilter(items);
});

/* ========== Filtr miesiąca ========== */
monthFilter.addEventListener("change", () => renderAll(items));

/* ========== Eksport / Import JSON ========== */
exportBtn.addEventListener("click", () => {
const blob = new Blob([JSON.stringify(items, null, 2)], {
type: "application/json",
});
const url = URL.createObjectURL(blob);
const a = Object.assign(document.createElement("a"), {
href: url,
download: "wydatki.json",
});
document.body.appendChild(a);
a.click();
URL.revokeObjectURL(url);
a.remove();
});

importInput.addEventListener("change", async (e) => {
const file = e.target.files?.[0];
if (!file) return;

try {
const text = await file.text();
const data = JSON.parse(text);
if (!Array.isArray(data)) throw new Error("Zły format pliku");

items = data.map(normalizeItem);
save(items);
renderAll(items);
populateMonthFilter(items);
} catch (err) {
alert("Nie udało się wczytać pliku: " + err.message);
} finally {
importInput.value = "";
}
});

/* ================= funkcje pomocnicze ================= */

function renderAll(arr) {
listEl.innerHTML = "";

const month = monthFilter.value;
const filtered =
month === "all" ? arr : arr.filter((i) => i.date.slice(0, 7) === month);

let total = 0;

for (const it of filtered) {
total += it.amount;

const node = tpl.content.firstElementChild.cloneNode(true);
node.dataset.id = it.id;

node.querySelector(".item__amount").textContent = formatPLN(it.amount);
node.querySelector(".item__category").textContent = "• " + it.category;
node.querySelector(".item__date").textContent = formatDatePL(it.date);
node.querySelector(".item__note").textContent = it.note || "";

listEl.appendChild(node);
}

totalEl.textContent = formatPLN(total);
}

function populateMonthFilter(arr) {
const months = Array.from(new Set(arr.map((i) => i.date.slice(0, 7))))
.sort()
.reverse();

const prev = monthFilter.value;
monthFilter.innerHTML =
`<option value="all">Wszystkie</option>` +
months.map((m) => `<option value="${m}">${m}</option>`).join("");

if (months.includes(prev)) monthFilter.value = prev;
}

function formatPLN(v) {
return new Intl.NumberFormat("pl-PL", {
style: "currency",
currency: "PLN",
maximumFractionDigits: 2,
}).format(v);
}

function formatDatePL(iso) {
const [y, m, d] = iso.split("-");
return `${d}.${m}.${y}`;
}

function save(arr) {
localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function load() {
try {
const raw = localStorage.getItem(LS_KEY);
return raw ? JSON.parse(raw).map(normalizeItem) : [];
} catch {
return [];
}
}

function normalizeItem(it) {
const amount = Number(String(it.amount).replace(",", "."));
const date = (it.date || new Date().toISOString()).slice(0, 10);
return {
id: it.id || uid(),
amount: Number.isFinite(amount) ? amount : 0,
category: it.category || "Inne",
date,
note: it.note || "",
};
}

function uid() {
// prosty, unikatowy identyfikator
return (crypto.getRandomValues(new Uint32Array(1))[0]).toString(36);
}