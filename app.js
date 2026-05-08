const STORAGE_KEY = "ai-learning-tracker-tasks";

const form = document.querySelector("#task-form");
const formTitle = document.querySelector("#form-title");
const titleInput = document.querySelector("#task-title");
const categoryInput = document.querySelector("#task-category");
const statusInput = document.querySelector("#task-status");
const dueDateInput = document.querySelector("#task-due-date");
const noteInput = document.querySelector("#task-note");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");

const statusFilter = document.querySelector("#status-filter");
const categoryFilter = document.querySelector("#category-filter");
const resetFilterButton = document.querySelector("#reset-filter-button");

const taskList = document.querySelector("#task-list");
const todayList = document.querySelector("#today-list");
const overdueList = document.querySelector("#overdue-list");
const emptyMessage = document.querySelector("#empty-message");

const totalCount = document.querySelector("#total-count");
const progressCount = document.querySelector("#progress-count");
const todayCount = document.querySelector("#today-count");
const overdueCount = document.querySelector("#overdue-count");

let tasks = loadTasks();
let editingTaskId = null;

render();

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = titleInput.value.trim();

  if (title === "") {
    alert("请先填写任务标题。");
    return;
  }

  const now = new Date().toISOString();

  if (editingTaskId) {
    tasks = tasks.map(function (task) {
      if (task.id !== editingTaskId) {
        return task;
      }

      return {
        ...task,
        title: title,
        category: categoryInput.value,
        status: statusInput.value,
        dueDate: dueDateInput.value,
        note: noteInput.value.trim(),
        updatedAt: now
      };
    });
  } else {
    const newTask = {
      id: "task-" + Date.now(),
      title: title,
      category: categoryInput.value,
      status: statusInput.value,
      dueDate: dueDateInput.value,
      note: noteInput.value.trim(),
      createdAt: now,
      updatedAt: now
    };

    tasks.push(newTask);
  }

  saveTasks();
  resetForm();
  render();
});

cancelEditButton.addEventListener("click", function () {
  resetForm();
});

statusFilter.addEventListener("change", renderTaskList);
categoryFilter.addEventListener("change", renderTaskList);

resetFilterButton.addEventListener("click", function () {
  statusFilter.value = "全部";
  categoryFilter.value = "全部";
  renderTaskList();
});

function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    return JSON.parse(savedTasks);
  } catch (error) {
    console.error("读取任务失败：", error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
  renderSummary();
  renderFocusLists();
  renderTaskList();
}

function renderSummary() {
  const todayTasks = getTodayTasks();
  const overdueTasks = getOverdueTasks();
  const progressTasks = tasks.filter(function (task) {
    return task.status === "进行中";
  });

  totalCount.textContent = tasks.length;
  progressCount.textContent = progressTasks.length;
  todayCount.textContent = todayTasks.length;
  overdueCount.textContent = overdueTasks.length;
}

function renderFocusLists() {
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
  const selectedStatus = statusFilter.value;
  const selectedCategory = categoryFilter.value;

  const filteredTasks = tasks.filter(function (task) {
    const statusMatched = selectedStatus === "全部" || task.status === selectedStatus;
    const categoryMatched = selectedCategory === "全部" || task.category === selectedCategory;
    return statusMatched && categoryMatched;
  });

  taskList.innerHTML = "";
  emptyMessage.classList.toggle("hidden", filteredTasks.length > 0);

  filteredTasks.forEach(function (task) {
    taskList.appendChild(createTaskCard(task, true));
  });
}

function createTaskCard(task, showActions) {
  const card = document.createElement("article");
  card.className = "task-card";

  if (task.status === "已完成") {
    card.classList.add("done");
  } else if (isOverdue(task)) {
    card.classList.add("overdue");
  } else if (isToday(task)) {
    card.classList.add("today");
  }

  const dueClass = getDueClass(task);
  const noteText = task.note ? task.note : "暂无备注";

  card.innerHTML = `
    <div class="task-top">
      <div>
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <div class="task-meta">
          <span class="tag">${escapeHtml(task.category)}</span>
          <span class="tag status-${task.status}">${escapeHtml(task.status)}</span>
          <span class="tag ${dueClass}">截止：${formatDate(task.dueDate)}</span>
        </div>
        <p class="task-note">${escapeHtml(noteText)}</p>
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
  dueDateInput.value = task.dueDate;
  noteInput.value = task.note;

  formTitle.textContent = "编辑学习任务";
  submitButton.textContent = "保存修改";
  cancelEditButton.classList.remove("hidden");
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

  saveTasks();
  render();
}

function resetForm() {
  editingTaskId = null;
  form.reset();
  formTitle.textContent = "添加学习任务";
  submitButton.textContent = "保存任务";
  cancelEditButton.classList.add("hidden");
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

function formatDate(dateString) {
  if (!dateString) {
    return "未设置";
  }

  const parts = dateString.split("-");
  return `${parts[0]}年${parts[1]}月${parts[2]}日`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
