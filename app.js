const STORAGE_KEY = "ai-learning-tracker-tasks";
const CATEGORIES = ["Vibe coding", "AI 工具", "产品思维", "基础编程", "软件发布", "复盘"];
const STATUSES = ["未开始", "进行中", "已完成", "暂缓"];
const PRIORITIES = ["高", "中", "低"];

const form = document.querySelector("#task-form");
const formTitle = document.querySelector("#form-title");
const titleInput = document.querySelector("#task-title");
const categoryInput = document.querySelector("#task-category");
const statusInput = document.querySelector("#task-status");
const priorityInput = document.querySelector("#task-priority");
const dueDateInput = document.querySelector("#task-due-date");
const noteInput = document.querySelector("#task-note");
const reviewInput = document.querySelector("#task-review");
const reviewHint = document.querySelector("#review-hint");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");

const exportButton = document.querySelector("#export-button");
const importFileInput = document.querySelector("#import-file");

const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");
const categoryFilter = document.querySelector("#category-filter");
const sortSelect = document.querySelector("#sort-select");
const resetFilterButton = document.querySelector("#reset-filter-button");
const quickFilterButtons = document.querySelectorAll(".quick-filter-button");

const summaryGrid = document.querySelector(".summary-grid");
const taskList = document.querySelector("#task-list");
const weekList = document.querySelector("#week-list");
const todayList = document.querySelector("#today-list");
const overdueList = document.querySelector("#overdue-list");
const emptyMessage = document.querySelector("#empty-message");
const toast = document.querySelector("#toast");

const totalCount = document.querySelector("#total-count");
const notStartedCount = document.querySelector("#not-started-count");
const progressCount = document.querySelector("#progress-count");
const doneCount = document.querySelector("#done-count");
const pausedCount = document.querySelector("#paused-count");
const todayCount = document.querySelector("#today-count");
const overdueCount = document.querySelector("#overdue-count");
const completionRate = document.querySelector("#completion-rate");
const completionBar = document.querySelector("#completion-bar");

let tasks = loadTasks();
let editingTaskId = null;
let activeQuickFilter = "";
let newTaskId = null;
let toastTimer = null;
let summaryTimer = null;

render();
updateReviewFieldState();

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = titleInput.value.trim();

  if (title === "") {
    alert("请先填写任务标题。");
    return;
  }

  const now = new Date().toISOString();
  const selectedStatus = statusInput.value;
  let toastMessage = "任务已新增。";

  if (editingTaskId) {
    tasks = tasks.map(function (task) {
      if (task.id !== editingTaskId) {
        return task;
      }

      const completedAt = getNextCompletedAt(task, selectedStatus);

      if (task.status !== "已完成" && selectedStatus === "已完成") {
        toastMessage = "任务已标记为已完成。";
      } else {
        toastMessage = "任务已更新。";
      }

      return {
        ...task,
        title: title,
        category: categoryInput.value,
        status: selectedStatus,
        priority: priorityInput.value,
        dueDate: dueDateInput.value,
        note: noteInput.value.trim(),
        review: reviewInput.value.trim(),
        completedAt: completedAt,
        updatedAt: now
      };
    });
  } else {
    const newTask = {
      id: "task-" + Date.now(),
      title: title,
      category: categoryInput.value,
      status: selectedStatus,
      priority: priorityInput.value,
      dueDate: dueDateInput.value,
      note: noteInput.value.trim(),
      review: reviewInput.value.trim(),
      completedAt: selectedStatus === "已完成" ? getTodayString() : null,
      createdAt: now,
      updatedAt: now
    };

    tasks.push(newTask);
    newTaskId = newTask.id;

    if (selectedStatus === "已完成") {
      toastMessage = "任务已新增并标记为已完成。";
    }
  }

  if (!saveTasks()) {
    return;
  }

  resetForm();
  render();
  showToast(toastMessage);
});

cancelEditButton.addEventListener("click", function () {
  resetForm();
});

statusInput.addEventListener("change", updateReviewFieldState);
exportButton.addEventListener("click", exportTasks);
importFileInput.addEventListener("change", importTasks);

searchInput.addEventListener("input", renderTaskList);
statusFilter.addEventListener("change", renderTaskList);
categoryFilter.addEventListener("change", renderTaskList);
sortSelect.addEventListener("change", renderTaskList);

quickFilterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const nextFilter = button.dataset.quickFilter;
    activeQuickFilter = activeQuickFilter === nextFilter ? "" : nextFilter;
    updateQuickFilterButtons();
    renderTaskList();
  });
});

resetFilterButton.addEventListener("click", function () {
  searchInput.value = "";
  statusFilter.value = "全部";
  categoryFilter.value = "全部";
  sortSelect.value = "due-asc";
  activeQuickFilter = "";
  updateQuickFilterButtons();
  renderTaskList();
});

// 从浏览器 localStorage 读取任务，并把 v0.2 旧数据补齐为 v0.3 数据。
function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);
    return Array.isArray(parsedTasks) ? parsedTasks.map(normalizeTask) : [];
  } catch (error) {
    console.error("读取任务失败：", error);
    return [];
  }
}

// 保存任务到 localStorage。
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("保存任务失败：", error);
    alert("保存失败，请检查浏览器是否允许使用 localStorage。");
    return false;
  }
}

function render() {
  renderSummary();
  renderFocusLists();
  renderTaskList();
}

// 计算首页仪表盘数据，并触发轻微更新反馈。
function renderSummary() {
  const todayTasks = getTodayTasks();
  const overdueTasks = getOverdueTasks();
  const notStartedTasks = getTasksByStatus("未开始");
  const progressTasks = getTasksByStatus("进行中");
  const doneTasks = getTasksByStatus("已完成");
  const pausedTasks = getTasksByStatus("暂缓");
  const rate = tasks.length === 0 ? 0 : Math.round((doneTasks.length / tasks.length) * 100);

  totalCount.textContent = tasks.length;
  notStartedCount.textContent = notStartedTasks.length;
  progressCount.textContent = progressTasks.length;
  doneCount.textContent = doneTasks.length;
  pausedCount.textContent = pausedTasks.length;
  todayCount.textContent = todayTasks.length;
  overdueCount.textContent = overdueTasks.length;
  completionRate.textContent = rate + "%";
  completionBar.style.width = rate + "%";

  pulseSummary();
}

function renderFocusLists() {
  renderCompactList(weekList, getThisWeekTasks(), "本周还没有安排任务。");
  renderCompactList(todayList, getTodayTasks(), "今天没有到期任务。");
  renderCompactList(overdueList, getOverdueTasks(), "目前没有逾期未完成任务。");
}

function renderCompactList(container, list, emptyText) {
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<p class="mini-empty">${emptyText}</p>`;
    return;
  }

  list.forEach(function (task) {
    container.appendChild(createTaskCard(task, false));
  });
}

function renderTaskList() {
  const visibleTasks = getVisibleTasks();

  taskList.innerHTML = "";
  emptyMessage.textContent = tasks.length === 0
    ? "暂无任务，先添加一个学习任务吧。"
    : "当前筛选没有结果，可以尝试重置筛选。";
  emptyMessage.classList.toggle("hidden", visibleTasks.length > 0);

  visibleTasks.forEach(function (task) {
    taskList.appendChild(createTaskCard(task, true));
  });

  if (newTaskId) {
    window.setTimeout(function () {
      newTaskId = null;
    }, 250);
  }
}

// 合并搜索、普通筛选、快捷筛选和排序，返回当前应该显示的任务。
function getVisibleTasks() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const selectedCategory = categoryFilter.value;
  const selectedSort = sortSelect.value;

  const filteredTasks = tasks.filter(function (task) {
    const title = String(task.title || "").toLowerCase();
    const note = String(task.note || "").toLowerCase();
    const review = String(task.review || "").toLowerCase();
    const keywordMatched = keyword === "" || title.includes(keyword) || note.includes(keyword) || review.includes(keyword);
    const statusMatched = selectedStatus === "全部" || task.status === selectedStatus;
    const categoryMatched = selectedCategory === "全部" || task.category === selectedCategory;
    const quickFilterMatched = isMatchedByQuickFilter(task);

    return keywordMatched && statusMatched && categoryMatched && quickFilterMatched;
  });

  return sortTasks(filteredTasks, selectedSort);
}

function isMatchedByQuickFilter(task) {
  if (activeQuickFilter === "today") {
    return isToday(task);
  }

  if (activeQuickFilter === "week") {
    return isThisWeek(task);
  }

  if (activeQuickFilter === "overdue") {
    return task.status !== "已完成" && isOverdue(task);
  }

  if (activeQuickFilter === "done") {
    return task.status === "已完成";
  }

  return true;
}

// 排序时复制数组，避免改变原始 tasks 顺序。
function sortTasks(taskArray, sortType) {
  const copiedTasks = [...taskArray];

  copiedTasks.sort(function (firstTask, secondTask) {
    if (sortType === "due-desc") {
      return secondTask.dueDate.localeCompare(firstTask.dueDate);
    }

    return firstTask.dueDate.localeCompare(secondTask.dueDate);
  });

  return copiedTasks;
}

function createTaskCard(task, showActions) {
  const card = document.createElement("article");
  card.className = "task-card";

  if (task.id === newTaskId) {
    card.classList.add("is-new");
  }

  if (task.status === "已完成") {
    card.classList.add("done");
  } else if (isOverdue(task)) {
    card.classList.add("overdue");
  } else if (isToday(task)) {
    card.classList.add("today");
  }

  const dueClass = getDueClass(task);
  const noteText = task.note ? task.note : "暂无备注";
  const reviewHtml = task.review
    ? `<p class="task-review"><strong>完成复盘：</strong>${escapeHtml(task.review)}</p>`
    : "";
  const completedAtHtml = task.completedAt
    ? `<span class="tag">完成：${formatDate(task.completedAt)}</span>`
    : "";

  card.innerHTML = `
    <div class="task-top">
      <div>
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <div class="task-meta">
          <span class="tag">${escapeHtml(task.category)}</span>
          <span class="tag status-${task.status}">${escapeHtml(task.status)}</span>
          <span class="tag priority-${task.priority}">优先级：${escapeHtml(task.priority)}</span>
          <span class="tag ${dueClass}">截止：${formatDate(task.dueDate)}</span>
          ${completedAtHtml}
        </div>
        <p class="task-note">${escapeHtml(noteText)}</p>
        ${reviewHtml}
      </div>
    </div>
  `;

  if (showActions) {
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "small-button";
    editButton.textContent = "编辑";
    editButton.addEventListener("click", function () {
      startEditTask(task.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "small-button delete-button";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", function () {
      deleteTask(task.id);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    card.querySelector(".task-top").appendChild(actions);
  }

  return card;
}

function startEditTask(taskId) {
  const task = tasks.find(function (item) {
    return item.id === taskId;
  });

  if (!task) {
    return;
  }

  editingTaskId = task.id;
  titleInput.value = task.title;
  categoryInput.value = task.category;
  statusInput.value = task.status;
  priorityInput.value = task.priority;
  dueDateInput.value = task.dueDate;
  noteInput.value = task.note;
  reviewInput.value = task.review;

  formTitle.textContent = "编辑学习任务";
  submitButton.textContent = "保存修改";
  cancelEditButton.classList.remove("hidden");
  updateReviewFieldState();
  titleInput.focus();
}

function deleteTask(taskId) {
  const shouldDelete = confirm("确定要删除这个学习任务吗？");

  if (!shouldDelete) {
    return;
  }

  tasks = tasks.filter(function (task) {
    return task.id !== taskId;
  });

  if (editingTaskId === taskId) {
    resetForm();
  }

  if (!saveTasks()) {
    return;
  }

  render();
  showToast("任务已删除。");
}

function resetForm() {
  editingTaskId = null;
  form.reset();
  priorityInput.value = "中";
  reviewInput.value = "";
  formTitle.textContent = "添加学习任务";
  submitButton.textContent = "保存任务";
  cancelEditButton.classList.add("hidden");
  updateReviewFieldState();
}

function updateReviewFieldState() {
  const canWriteReview = statusInput.value === "已完成";
  reviewInput.disabled = !canWriteReview;
  reviewHint.textContent = canWriteReview
    ? "现在可以填写完成复盘。"
    : "将状态改为“已完成”后，可以填写完成复盘。";
  reviewHint.classList.toggle("active", canWriteReview);
}

// 根据状态变化生成或清空完成日期。
function getNextCompletedAt(task, nextStatus) {
  if (nextStatus === "已完成") {
    return task.completedAt || getTodayString();
  }

  return null;
}

// 导出当前任务为包含 v0.3 字段的 JSON 文件。
function exportTasks() {
  const exportData = tasks.map(normalizeTask);
  const jsonText = JSON.stringify(exportData, null, 2);
  const backupFile = new Blob([jsonText], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(backupFile);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = "ai-learning-tracker-backup.json";
  downloadLink.click();

  URL.revokeObjectURL(downloadUrl);
  showToast("数据已导出。");
}

// 导入 JSON 文件，兼容 v0.2 旧数据，校验通过后覆盖当前任务。
function importTasks(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function () {
    try {
      const importedData = JSON.parse(reader.result);
      const checkedTasks = validateImportedTasks(importedData);
      const shouldImport = confirm("导入会覆盖当前任务，是否继续？");

      if (!shouldImport) {
        importFileInput.value = "";
        return;
      }

      const oldTasks = tasks;
      tasks = checkedTasks;

      if (!saveTasks()) {
        tasks = oldTasks;
        return;
      }

      resetForm();
      render();
      showToast("导入成功。");
    } catch (error) {
      alert("导入失败：" + error.message);
    }

    importFileInput.value = "";
  };

  reader.onerror = function () {
    alert("导入失败：无法读取这个文件。");
    importFileInput.value = "";
  };

  reader.readAsText(file);
}

// 检查导入文件是否是合法任务数组，并补齐 v0.3 新字段。
function validateImportedTasks(importedData) {
  if (!Array.isArray(importedData)) {
    throw new Error("JSON 内容必须是任务数组。");
  }

  const usedIds = new Set();

  return importedData.map(function (task, index) {
    if (!task || typeof task !== "object") {
      throw new Error(`第 ${index + 1} 条任务格式不正确。`);
    }

    if (typeof task.title !== "string" || task.title.trim() === "") {
      throw new Error(`第 ${index + 1} 条任务缺少任务标题。`);
    }

    if (!CATEGORIES.includes(task.category)) {
      throw new Error(`第 ${index + 1} 条任务分类不正确。`);
    }

    if (!STATUSES.includes(task.status)) {
      throw new Error(`第 ${index + 1} 条任务状态不正确。`);
    }

    if (task.priority && !PRIORITIES.includes(task.priority)) {
      throw new Error(`第 ${index + 1} 条任务优先级不正确。`);
    }

    if (!isValidDateString(task.dueDate)) {
      throw new Error(`第 ${index + 1} 条任务截止日期不正确。`);
    }

    const normalizedTask = normalizeTask(task, index);

    if (usedIds.has(normalizedTask.id)) {
      normalizedTask.id = "task-" + Date.now() + "-" + index;
    }

    usedIds.add(normalizedTask.id);
    return normalizedTask;
  });
}

// 把旧任务补齐成 v0.3 任务，避免升级后丢失数据。
function normalizeTask(task, index) {
  if (!task || typeof task !== "object") {
    task = {};
  }

  const now = new Date().toISOString();
  const status = STATUSES.includes(task.status) ? task.status : "未开始";
  const priority = PRIORITIES.includes(task.priority) ? task.priority : "中";
  let completedAt = typeof task.completedAt === "string" && task.completedAt.trim() !== ""
    ? getDatePart(task.completedAt)
    : null;

  if (status === "已完成" && !completedAt) {
    completedAt = getDatePart(task.updatedAt) || getDatePart(task.createdAt) || getTodayString();
  }

  if (status !== "已完成") {
    completedAt = null;
  }

  return {
    id: typeof task.id === "string" && task.id.trim() !== "" ? task.id : "task-" + Date.now() + "-" + (index || 0),
    title: typeof task.title === "string" ? task.title.trim() : "",
    category: CATEGORIES.includes(task.category) ? task.category : "Vibe coding",
    status: status,
    priority: priority,
    dueDate: isValidDateString(task.dueDate) ? task.dueDate : getTodayString(),
    note: typeof task.note === "string" ? task.note : "",
    review: typeof task.review === "string" ? task.review : "",
    completedAt: completedAt,
    createdAt: typeof task.createdAt === "string" ? task.createdAt : now,
    updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : now
  };
}

function getTasksByStatus(status) {
  return tasks.filter(function (task) {
    return task.status === status;
  });
}

function getThisWeekTasks() {
  return tasks.filter(isThisWeek);
}

function getTodayTasks() {
  return tasks.filter(function (task) {
    return task.status !== "已完成" && isToday(task);
  });
}

function getOverdueTasks() {
  return tasks.filter(function (task) {
    return task.status !== "已完成" && isOverdue(task);
  });
}

function isToday(task) {
  return task.dueDate === getTodayString();
}

function isThisWeek(task) {
  const weekRange = getCurrentWeekRange();
  return task.dueDate >= weekRange.start && task.dueDate <= weekRange.end;
}

function isOverdue(task) {
  return task.dueDate < getTodayString();
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 返回本周周一到周日的日期字符串。
function getCurrentWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);

  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: formatDateToInputValue(monday),
    end: formatDateToInputValue(sunday)
  };
}

function getDueClass(task) {
  if (task.status === "已完成") {
    return "";
  }

  if (isOverdue(task)) {
    return "due-overdue";
  }

  if (isToday(task)) {
    return "due-today";
  }

  return "";
}

function isValidDateString(dateString) {
  if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const parts = dateString.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function getDatePart(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : "";
}

function formatDateToInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "未设置";
  }

  const parts = dateString.split("-");
  return `${parts[0]}年${parts[1]}月${parts[2]}日`;
}

function updateQuickFilterButtons() {
  quickFilterButtons.forEach(function (button) {
    button.classList.toggle("active", button.dataset.quickFilter === activeQuickFilter);
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    toast.classList.remove("show");
  }, 2000);
}

function pulseSummary() {
  summaryGrid.classList.remove("summary-updated");

  window.clearTimeout(summaryTimer);
  window.requestAnimationFrame(function () {
    summaryGrid.classList.add("summary-updated");
    summaryTimer = window.setTimeout(function () {
      summaryGrid.classList.remove("summary-updated");
    }, 250);
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
