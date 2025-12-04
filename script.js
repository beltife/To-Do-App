// api url
const API_URL = "https://692950859d311cddf348ff9b.mockapi.io/todos";

// dom elements
const todoForm = document.getElementById("todo-form");
const list = document.getElementById("todo-list");
const addBtn = document.getElementById("addBtn");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");
const dueEl = document.getElementById("dueDate");
const statEl = document.getElementById("status");
const priorityEl = document.getElementById("priority");
const tagEl = document.getElementById("tag");
const tagSuggestionsEl = document.getElementById("tagSuggestions");
const searchEl = document.getElementById("search");
const priorityFilterEl = document.getElementById("filterPriority");
const deleteModal = document.getElementById("deleteModal");
const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
const deleteCancelBtn = document.getElementById("deleteCancelBtn");

// state
let editMode = false;
let editId = null;
let todosCache = [];
let pendingDeleteId = null;

// storage keys
const LOCAL_STORAGE_KEY = "beltifeTasks";
const SYNC_STATUS_KEY = "beltifeSyncStatus";

// format date for input field
function formatForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// format date for display
function formatForDisplay(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString();
}

// get all unique tags
function getAllUniqueTags() {
  var tagSet = {};
  if (Array.isArray(todosCache)) {
    todosCache.forEach(function (t) {
      if (t.tags && Array.isArray(t.tags)) {
        t.tags.forEach(function (tag) {
          tagSet[tag] = true;
        });
      }
    });
  }
  return Object.keys(tagSet).sort();
}

// show tag suggestions as user types
function showTagSuggestions(currentInput) {
  if (!currentInput.trim()) {
    tagSuggestionsEl.classList.remove("visible");
    return;
  }

  var allTags = getAllUniqueTags();
  // get the last comma to find current tag
  var lastCommaIdx = currentInput.lastIndexOf(",");
  var typedPart =
    lastCommaIdx === -1
      ? currentInput.trim().toLowerCase()
      : currentInput
          .substring(lastCommaIdx + 1)
          .trim()
          .toLowerCase();

  // filter tags that match
  var matches = allTags.filter(function (tag) {
    return tag.toLowerCase().indexOf(typedPart) === 0 && typedPart.length > 0;
  });

  if (matches.length === 0) {
    tagSuggestionsEl.classList.remove("visible");
    return;
  }

  // build dropdown list
  tagSuggestionsEl.innerHTML = "";
  matches.forEach(function (match) {
    var item = document.createElement("div");
    item.className = "tag-suggestion-item";
    item.textContent = match;
    item.addEventListener("click", function () {
      insertTagSuggestion(match);
    });
    tagSuggestionsEl.appendChild(item);
  });
  tagSuggestionsEl.classList.add("visible");
}

// insert selected tag into input
function insertTagSuggestion(tag) {
  var current = (tagEl && tagEl.value) || "";
  var lastCommaIdx = current.lastIndexOf(",");
  var beforeComma =
    lastCommaIdx === -1 ? "" : current.substring(0, lastCommaIdx + 1) + " ";
  tagEl.value = beforeComma + tag + ", ";
  tagSuggestionsEl.classList.remove("visible");
  tagEl.focus();
}

// save to local storage
function saveToLocalStorage(todos) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.warn("storage save failed:", e);
  }
}

// load from local storage
function loadFromLocalStorage() {
  try {
    var data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn("storage load failed:", e);
    return [];
  }
}

// track sync status
function markSyncStatus(status) {
  try {
    localStorage.setItem(SYNC_STATUS_KEY, status);
  } catch (e) {
    console.warn("sync status failed:", e);
  }
}

// filter tasks by priority and search
function getFilteredTodos() {
  var items = Array.isArray(todosCache) ? todosCache.slice() : [];
  var q = ((searchEl && searchEl.value) || "").toLowerCase().trim();
  var p = (priorityFilterEl && priorityFilterEl.value) || "all";

  // filter by priority
  if (p && p !== "all") {
    items = items.filter(function (t) {
      return (t.priority || "Medium") === p;
    });
  }

  // filter by search text
  if (q) {
    items = items.filter(function (t) {
      var tagsStr =
        t.tags && Array.isArray(t.tags) ? t.tags.join(" ").toLowerCase() : "";
      var title = (t.title || "").toLowerCase();
      var desc = (t.description || "").toLowerCase();
      return (
        title.indexOf(q) !== -1 ||
        desc.indexOf(q) !== -1 ||
        tagsStr.indexOf(q) !== -1
      );
    });
  }

  return items;
}

// show status messages
function showStatus(message, type = "info", timeout = 4000) {
  const el = statEl || document.getElementById("status");
  if (!el) {
    alert(message);
    return;
  }

  el.textContent = message;
  el.className = "status " + type;
  el.removeAttribute("hidden");

  if (timeout > 0) {
    setTimeout(function () {
      el.setAttribute("hidden", "true");
    }, timeout);
  }
}

// add or update task
async function createTodo(e) {
  e.preventDefault();

  const title = titleEl.value.trim();
  const description = descEl.value.trim();
  const dueDate = dueEl.value;
  var priority = (priorityEl && priorityEl.value) || "Medium";
  var tagsStr = (tagEl && tagEl.value.trim()) || "";

  // parse tags
  var tagsArray = tagsStr
    .split(",")
    .map(function (t) {
      return t.trim();
    })
    .filter(function (t) {
      return t.length > 0;
    });

  // validate
  if (!title || !dueDate) {
    showStatus("Title and Due Date are required!", "error");
    return;
  }

  try {
    addBtn.disabled = true;
    addBtn.classList.add("loading");
    addBtn.innerText = editMode ? "Updating..." : "Saving...";

    let res;
    if (!editMode) {
      // new task
      todoData.completed = false;
      res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(todoData),
      });
    } else {
      // update task
      res = await fetch(`${API_URL}/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(todoData),
      });
    }
    if (!res.ok) throw new Error("Network response was not ok");

    todoForm.reset();
    editMode = false;
    editId = null;
    addBtn.innerText = "Add Task";
    showStatus("Task saved.", "success");
    // focus title for quick entry
    titleEl.focus();
    fetchTodos();
  } catch (error) {
    console.error(error);
    showStatus("Failed to save task. Please try again.", "error");
  } finally {
    addBtn.disabled = false;
    addBtn.classList.remove("loading");
    if (!editMode) addBtn.innerText = "Add Task";
  }
}

// fetch tasks from api
async function fetchTodos() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to fetch");
    const todos = await res.json();

    // update cache
    todosCache = todos || [];
    saveToLocalStorage(todosCache);
    markSyncStatus("synced");
    displayTodos(getFilteredTodos());
  } catch (error) {
    console.error("Error fetching todos:", error);
    // try local storage
    var cached = loadFromLocalStorage();
    if (cached && cached.length > 0) {
      todosCache = cached;
      showStatus("Offline mode: showing saved tasks.", "info", 3000);
      markSyncStatus("offline");
      displayTodos(getFilteredTodos());
    } else {
      list.innerHTML = `<p class="empty-state">Unable to load tasks.</p>`;
      showStatus("Unable to load tasks. No offline data available.", "error");
    }
  }
}

// render tasks
function displayTodos(todos) {
  list.innerHTML = ""; // clear old

  // empty state
  if (!Array.isArray(todos) || todos.length === 0) {
    list.innerHTML = `<p class="empty-state">No tasks yet. Add your first task above.</p>`;
    return;
  }

  todos.forEach((todo) => {
    // check if overdue
    const isOverdue = todo.dueDate
      ? new Date(todo.dueDate) < new Date()
      : false;

    const item = document.createElement("div");
    item.className = "todo-item";
    if (todo.completed) item.classList.add("completed");
    if (isOverdue) item.classList.add("overdue");

    // left side content
    const left = document.createElement("div");
    left.className = "todo-left";

    // badges
    const badgesWrap = document.createElement("div");
    badgesWrap.className = "badges";
    if (todo.priority) {
      var pBadge = document.createElement("span");
      pBadge.className = "badge priority-" + todo.priority;
      pBadge.textContent = todo.priority;
      badgesWrap.appendChild(pBadge);
    }
    if (todo.tags && Array.isArray(todo.tags)) {
      todo.tags.forEach(function (tag) {
        var tBadge = document.createElement("span");
        tBadge.className = "badge tag";
        tBadge.textContent = tag;
        badgesWrap.appendChild(tBadge);
      });
    }

    const titleEl = document.createElement("h3");
    titleEl.className = "todo-title";
    titleEl.textContent = todo.title;

    const descEl = document.createElement("p");
    descEl.className = "todo-desc";
    descEl.textContent = todo.description || "";

    const dateEl = document.createElement("p");
    dateEl.className = "todo-date";
    dateEl.textContent = "Due: " + formatForDisplay(todo.dueDate);

    left.appendChild(badgesWrap);
    left.appendChild(titleEl);
    left.appendChild(descEl);
    left.appendChild(dateEl);

    // Actions
    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const completeBtn = document.createElement("button");
    completeBtn.className = "btn-complete";
    completeBtn.type = "button";
    completeBtn.setAttribute("aria-label", "Toggle complete");
    completeBtn.textContent = "✔";
    completeBtn.addEventListener("click", function () {
      toggleComplete(todo.id, !!todo.completed);
    });

    const editBtnEl = document.createElement("button");
    editBtnEl.className = "btn-edit";
    editBtnEl.type = "button";
    editBtnEl.setAttribute("aria-label", "Edit task");
    editBtnEl.textContent = "Edit";
    editBtnEl.addEventListener("click", function () {
      editTodo(todo.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", "Delete task");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function () {
      deleteTodo(todo.id);
    });

    actions.appendChild(completeBtn);
    actions.appendChild(editBtnEl);
    actions.appendChild(deleteBtn);

    item.appendChild(left);
    item.appendChild(actions);

    list.appendChild(item);
  });
}

// init app
todoForm.addEventListener("submit", createTodo);
fetchTodos();

// search - real time filter
if (searchEl) {
  searchEl.addEventListener("input", function () {
    displayTodos(getFilteredTodos());
  });
}

// priority filter
if (priorityFilterEl) {
  priorityFilterEl.addEventListener("change", function () {
    displayTodos(getFilteredTodos());
  });
}

// tag input autocomplete
if (tagEl) {
  tagEl.addEventListener("input", function () {
    showTagSuggestions(tagEl.value);
  });
  // hide suggestions on blur
  tagEl.addEventListener("blur", function () {
    setTimeout(function () {
      tagSuggestionsEl.classList.remove("visible");
    }, 200);
  });
}

// delete modal functions
function showDeleteModal(id) {
  pendingDeleteId = id;
  deleteModal.removeAttribute("hidden");
  deleteConfirmBtn.focus();
}

function hideDeleteModal() {
  pendingDeleteId = null;
  deleteModal.setAttribute("hidden", "true");
}

// handle delete confirm
function handleDeleteConfirm() {
  if (pendingDeleteId) {
    const idToDelete = pendingDeleteId;
    hideDeleteModal();
    performDelete(idToDelete);
  }
}

// modal button events
if (deleteConfirmBtn && deleteCancelBtn && deleteModal) {
  deleteConfirmBtn.addEventListener("click", handleDeleteConfirm);

  // cancel button
  deleteCancelBtn.addEventListener("click", function () {
    hideDeleteModal();
  });

  // close on escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !deleteModal.hasAttribute("hidden")) {
      hideDeleteModal();
    }
  });
}

// delete via api
async function performDelete(id) {
  try {
    // call api
    const deleteUrl = `${API_URL}/${id}`;
    const res = await fetch(deleteUrl, { method: "DELETE" });

    if (!res.ok) {
      // api error
      const errorText = await res.text();
      throw new Error("API returned " + res.status + ": " + errorText);
    }

    // success - refresh list
    fetchTodos();
    showStatus("Task deleted.", "success");
  } catch (error) {
    console.error("Delete error:", error);
    showStatus("Delete failed: " + error.message, "error");
  }
}

// trigger delete modal
async function deleteTodo(id) {
  console.log("deleteTodo called with id:", id);
  showDeleteModal(id);
}

// toggle complete
async function toggleComplete(id, currentStatus) {
  const updatedStatus = !currentStatus;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: updatedStatus }),
    });

    if (!res.ok) throw new Error("Failed to update status");
    fetchTodos();
  } catch (error) {
    console.error("Error updating completion:", error);
    showStatus("Failed to update task status.", "error");
  }
}

// load task for editing
async function editTodo(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to load task");
    const todo = await res.json();

    // fill form
    titleEl.value = todo.title;
    descEl.value = todo.description || "";
    dueEl.value = formatForInput(todo.dueDate);
    priorityEl.value = todo.priority || "Medium";
    // format tags
    var tagsDisplay =
      todo.tags && Array.isArray(todo.tags)
        ? todo.tags.join(", ") + (todo.tags.length > 0 ? ", " : "")
        : "";
    tagEl.value = tagsDisplay;

    // edit mode
    editMode = true;
    editId = id;

    // change button
    addBtn.innerText = "Update Task";
  } catch (error) {
    console.error("Error loading task for edit:", error);
    showStatus("Could not load task for editing.", "error");
  }
}
