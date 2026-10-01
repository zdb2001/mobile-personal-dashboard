const $ = (selector) => document.querySelector(selector);
const pad = (number) => String(number).padStart(2, "0");
const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const now = new Date();
let selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
let visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1);
let diaries = JSON.parse(localStorage.getItem("diaries") || "{}");
let todos = JSON.parse(localStorage.getItem("todos") || "[]");
let exportMode = false;
let exportSelection = new Set();
let toastTimer;

const calendarDays = $("#calendar-days");
const diaryInput = $("#diary-input");

function saveDiaries() {
  localStorage.setItem("diaries", JSON.stringify(diaries));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("zh-CN", options).format(date);
}

function renderCalendar() {
  $("#calendar-month").textContent = `${visibleMonth.getFullYear()}年 ${visibleMonth.getMonth() + 1}月`;
  calendarDays.innerHTML = "";
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = date.getDate();
    button.setAttribute("aria-label", `${key}${diaries[key]?.trim() ? "，有日记" : ""}`);
    if (date.getMonth() !== month) button.classList.add("other");
    if (key === toKey(now)) button.classList.add("today");
    if (!exportMode && key === toKey(selectedDate)) button.classList.add("selected");
    if (exportSelection.has(key)) button.classList.add("export-selected");
    if (diaries[key]?.trim()) {
      const dot = document.createElement("i");
      dot.className = "diary-dot";
      dot.setAttribute("aria-hidden", "true");
      button.append(dot);
    }
    button.addEventListener("click", () => {
      if (exportMode) {
        if (!diaries[key]?.trim()) {
          showToast("这一天还没有日记");
          return;
        }
        exportSelection.has(key) ? exportSelection.delete(key) : exportSelection.add(key);
        updateExportControls();
        renderCalendar();
        return;
      }
      selectedDate = date;
      if (date.getMonth() !== month) visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      renderAllDiary();
    });
    calendarDays.append(button);
  }
}

function renderEditor() {
  const key = toKey(selectedDate);
  $("#date-badge span").textContent = `${selectedDate.getMonth() + 1} 月`;
  $("#date-badge strong").textContent = pad(selectedDate.getDate());
  $("#editor-weekday").textContent = formatDate(selectedDate, { weekday: "long" });
  $("#editor-full-date").textContent = formatDate(selectedDate, { year: "numeric", month: "long", day: "numeric" });
  diaryInput.value = diaries[key] || "";
  updateWordCount();
  const hasDiary = Boolean(diaries[key]?.trim());
  $("#save-state").textContent = hasDiary ? "已保存" : "尚未记录";
  $("#save-state").classList.toggle("saved", hasDiary);
}

function renderAllDiary() {
  renderCalendar();
  renderEditor();
}

function updateWordCount() {
  const count = diaryInput.value.replace(/\s/g, "").length;
  $("#word-count").textContent = `${count} 字`;
}

function saveCurrentDiary() {
  const key = toKey(selectedDate);
  const text = diaryInput.value.trim();
  if (text) diaries[key] = diaryInput.value;
  else delete diaries[key];
  saveDiaries();
  renderAllDiary();
  showToast(text ? "日记已保存" : "空白日记已移除");
}

function setExportMode(active) {
  exportMode = active;
  exportSelection.clear();
  $("#export-bar").hidden = !active;
  $("#export-toggle").hidden = active;
  $("#export-hint").hidden = !active;
  diaryInput.disabled = active;
  $("#save-diary").disabled = active;
  updateExportControls();
  renderCalendar();
}

function updateExportControls() {
  $("#export-count").textContent = `已选择 ${exportSelection.size} 篇`;
  $("#download-export").disabled = exportSelection.size === 0;
}

function exportDiaries() {
  const keys = [...exportSelection].sort();
  if (!keys.length) return;
  const content = keys.map((key) => {
    const title = formatDate(fromKey(key), { year: "numeric", month: "long", day: "numeric", weekday: "long" });
    return `${title}\n${"—".repeat(18)}\n${diaries[key].trim()}`;
  }).join("\n\n\n");
  const blob = new Blob([`拾光日记\n\n${content}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `拾光日记_${keys[0]}_${keys[keys.length - 1]}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`已导出 ${keys.length} 篇日记`);
  setExportMode(false);
}

function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

function renderTodos() {
  const list = $("#todo-list");
  list.innerHTML = "";
  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item${todo.done ? " done" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.setAttribute("aria-label", `完成：${todo.text}`);
    checkbox.addEventListener("change", () => { todo.done = checkbox.checked; saveTodos(); renderTodos(); });
    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;
    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "删除";
    remove.addEventListener("click", () => { todos = todos.filter((item) => item.id !== todo.id); saveTodos(); renderTodos(); });
    li.append(checkbox, span, remove);
    list.append(li);
  });
  const remaining = todos.filter((todo) => !todo.done).length;
  $("#todo-progress").textContent = `${remaining} 项待完成`;
  $("#empty-todo").classList.toggle("visible", todos.length === 0);
}

document.querySelectorAll(".nav-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab, .view").forEach((element) => element.classList.remove("active"));
    tab.classList.add("active");
    $(`#${tab.dataset.view}-view`).classList.add("active");
  });
});

$("#prev-month").addEventListener("click", () => { visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1); renderCalendar(); });
$("#next-month").addEventListener("click", () => { visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1); renderCalendar(); });
$("#back-today").addEventListener("click", () => { selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1); renderAllDiary(); });
diaryInput.addEventListener("input", () => { updateWordCount(); $("#save-state").textContent = "尚未保存"; $("#save-state").classList.remove("saved"); });
$("#save-diary").addEventListener("click", saveCurrentDiary);
$("#export-toggle").addEventListener("click", () => setExportMode(true));
$("#cancel-export").addEventListener("click", () => setExportMode(false));
$("#download-export").addEventListener("click", exportDiaries);
$("#select-month").addEventListener("click", () => {
  Object.keys(diaries).filter((key) => {
    const date = fromKey(key);
    return date.getFullYear() === visibleMonth.getFullYear() && date.getMonth() === visibleMonth.getMonth() && diaries[key].trim();
  }).forEach((key) => exportSelection.add(key));
  updateExportControls();
  renderCalendar();
});
$("#todo-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#todo-input");
  const text = input.value.trim();
  if (!text) return;
  todos.unshift({ id: Date.now(), text, done: false });
  saveTodos(); renderTodos(); input.value = "";
});

$("#today-label").textContent = formatDate(now, { year: "numeric", month: "long", day: "numeric", weekday: "short" });
renderAllDiary();
renderTodos();
