// Replace this with your MockAPI or JSON Server endpoint
const API_URL = "https://692950859d311cddf348ff9b.mockapi.io/todos";

const todoForm = document.getElementById("todo-form");
let editMode = false;
let editId = null;

todoForm.addEventListener("submit", createTodo);
// Create Todo function

async function createTodo(e) {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const dueDate = document.getElementById("dueDate").value;

  if (!title || !dueDate) {
    alert("Title and Due Date are required!");
    return;
  }

  const todoData = {
    title,
    description,
    dueDate,
  };

  // If NOT edit mode → create new task
  if (!editMode) {
    todoData.completed = false;

    try {
      document.getElementById("addBtn").innerText = "Saving...";

      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(todoData),
      });

      todoForm.reset();
      fetchTodos();

      document.getElementById("addBtn").innerText = "Add Task";
    } catch (error) {
      console.error(error);
      alert("Failed to create task.");
    }
  }

  // If edit mode → update existing task
  else {
    try {
      document.getElementById("addBtn").innerText = "Updating...";

      await fetch(`${API_URL}/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(todoData),
      });

      todoForm.reset();
      fetchTodos();

      // Reset form to normal mode
      editMode = false;
      editId = null;

      document.getElementById("addBtn").innerText = "Add Task";
    } catch (error) {
      console.error(error);
      alert("Failed to update task.");
    }
  }
}

async function fetchTodos() {
  try {
    const res = await fetch(API_URL);
    const todos = await res.json();

    displayTodos(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
  }
}

// Edit function

function displayTodos(todos) {
  const list = document.getElementById("todo-list");
  list.innerHTML = ""; // Clear old items

  todos.forEach((todo) => {
    const isOverdue = new Date(todo.dueDate) < new Date();

    const item = document.createElement("div");
    item.className = `todo-item 
            ${todo.completed ? "completed" : ""} 
            ${isOverdue ? "overdue" : ""}
        `;

    item.innerHTML = `
            <div class="todo-left">
                <h3 class="todo-title">${todo.title}</h3>
                <p class="todo-desc">${todo.description || ""}</p>
                <p class="todo-date">Due: ${new Date(
                  todo.dueDate
                ).toLocaleString()}</p>
            </div>

            <div class="todo-actions">
                <button class="btn-complete" onclick="toggleComplete(${
                  todo.id
                }, ${todo.completed})">✔</button>
                <button class="btn-edit" onclick="editTodo(${
                  todo.id
                })">Edit</button>
                <button class="btn-delete" onclick="deleteTodo(${
                  todo.id
                })">Delete</button>
            </div>
        `;

    list.appendChild(item);
  });
}

// Load tasks when page opens
fetchTodos();

// API asyn

async function deleteTodo(id) {
  const confirmDelete = confirm("Are you sure you want to delete this task?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete");

    // Refresh UI
    fetchTodos();
  } catch (error) {
    console.error("Error deleting task:", error);
    alert("Could not delete the task!");
  }
}

async function toggleComplete(id, currentStatus) {
  const updatedStatus = !currentStatus;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        completed: updatedStatus,
      }),
    });

    if (!res.ok) throw new Error("Failed to update status");

    // Refresh the UI
    fetchTodos();
  } catch (error) {
    console.error("Error updating completion:", error);
    alert("Failed to update task status.");
  }
}

async function editTodo(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    const todo = await res.json();

    // Fill form with existing data
    document.getElementById("title").value = todo.title;
    document.getElementById("description").value = todo.description;
    document.getElementById("dueDate").value = todo.dueDate;

    // Switch to edit mode
    editMode = true;
    editId = id;

    // Change button text
    document.getElementById("addBtn").innerText = "Update Task";
  } catch (error) {
    console.error("Error loading task for edit:", error);
    alert("Could not load task for editing.");
  }
}
