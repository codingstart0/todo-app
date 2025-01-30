const apiBaseUrl = 'http://localhost:3000';

const endpoints = {
  getTodos: () => `${apiBaseUrl}/todos`,
  getTodo: (id) => `${apiBaseUrl}/todos/${id}`,
  createTodo: () => `${apiBaseUrl}/todos`,
  updateTodo: (id) => `${apiBaseUrl}/todos/${id}`,
  deleteTodo: (id) => `${apiBaseUrl}/todos/${id}`,
};

const localStorageKeyTodos = 'todos';
let todos = [];
let lastIndex = 0;

function handleApiResponse(response) {
  try {
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

async function fetchApi(apiBaseUrl, method, data, headers) {
  const _headers = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const options = {
    method,
    headers: _headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(apiBaseUrl, options);
  return handleApiResponse(response);
}

async function fetchTodosApi() {
  return fetchApi(endpoints.getTodos(), 'GET');
}

async function createTodoApi(todo) {
  return fetchApi(endpoints.createTodo(), 'POST', todo);
}

async function deleteTodoApi(todoId) {
  return fetchApi(endpoints.deleteTodo(todoId), 'DELETE');
}

async function updateTodoApi(todoId, data) {
  return fetchApi(endpoints.updateTodo(todoId), 'PATCH', data);
}

async function loadTodos() {
  todos = await fetchTodosApi();

  todos?.forEach((todo) => {
    addTodoToDOM(todo);
  });
}

function showModal(modalOptions) {
  const modalElement = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalActions = document.getElementById('modal-actions');

  const modal = new bootstrap.Modal(modalElement, {
    backdrop: 'static',
  });

  const { title = '', message, actions } = modalOptions;

  modalTitle.textContent = title;
  modalMessage.innerHTML = message;
  modalActions.innerHTML = '';

  if (actions) {
    actions.forEach(({ label, callback, btnStyle = '' }) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.className = `btn ${btnStyle}`;
      button.onclick = () => {
        if (callback) {
          callback();
        }
        modal.hide();
      };
      modalActions.appendChild(button);
    });
  } else {
    const button = document.createElement('button');
    button.textContent = 'Close';
    button.className = 'btn';
    button.onclick = () => {
      modal.hide();
    };
    modalActions.appendChild(button);
  }

  modal.show();
}

function registerTodoEvents() {
  document
    .getElementById('new-todo-form')
    .addEventListener('submit', (event) => {
      event.preventDefault();
      addTodo();
    });

  document
    .getElementById('hide-todos')
    .addEventListener('click', hideCompletedTodos);

  document.getElementById('show-todos').addEventListener('click', showAllTodos);

  document
    .getElementById('clear-completed-todos')
    .addEventListener('click', clearCompletedTodos);

  document
    .getElementById('clear-all-todos')
    .addEventListener('click', clearAllTodos);
}

function getAllTodosText() {
  return todos.map((todo) => {
    return todo.text.toUpperCase();
  });
}

function formatText(text) {
  return text.trim().replace(/\s+/g, ' ');
}

function todoExists(text, excludeTodoId) {
  const existingTodosText = todos
    .filter((todo) => todo.id !== excludeTodoId)
    .map((todo) => todo.text.toUpperCase());

  if (existingTodosText.includes(text.toUpperCase())) {
    showModal({
      title: 'Warning',
      message: 'This todo already exists!',
    });
    return true; // Indicates that a duplicate exists
  }
  return false; // No duplicates found
}

async function addTodo() {
  const input = document.getElementById('todo-input');
  let todoText = formatText(input.value);

  if (!todoText || todoExists(todoText)) return;

  try {
    const newTodo = createTodoObject(todoText);
    const addedTodo = await createTodoApi(newTodo);
    todos.push(addedTodo);
    addTodoToDOM(addedTodo);
    input.value = '';
  } catch (error) {
    showModal({
      title: 'Error',
      message: 'Failed to add the todo. Please try again.',
    });
  }
}

function getTodoById(todoId) {
  return todos.find((todo) => {
    return todo.id === todoId;
  });
}

function getTodoElementById(todoId) {
  return document.getElementById(`todo-id-${todoId}`);
}

function createTodoObject(text) {
  const todo = {
    text: text,
    completed: false,
  };

  return todo;
}

function saveTodoToLocalStorage(todoItemsArray) {
  localStorage.setItem(
    localStorageKeyTodos,
    JSON.stringify(todoItemsArray || [])
  );
}

function createTodoLabelElement(todo) {
  const label = document.createElement('label');
  label.className = 'todo-label';
  label.innerText = todo.text;
  label.addEventListener('click', (event) => {
    editTodo(todo, event);
  });

  if (todo.completed) {
    label.classList.add('completed');
  }
  return label;
}

function addTodoToDOM(todo) {
  const li = document.createElement('li');
  li.className = 'list-group-item todo-item';
  li.id = `todo-id-${todo.id}`;

  li.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
        <div class="todo-checkbox-and-label-wrapper">
            <input type="checkbox" class="form-check-input" ${
              todo.completed ? 'checked="checked"' : ''
            } />
        </div>
        <button class="btn btn-danger btn-sm">Remove</button>
    </div>
  `;

  const todoCheckboxAndLabelWrapperElement = li.querySelector(
    '.todo-checkbox-and-label-wrapper'
  );
  const checkbox = todoCheckboxAndLabelWrapperElement.querySelector(
    'input[type="checkbox"]'
  );
  const label = createTodoLabelElement(todo);

  todoCheckboxAndLabelWrapperElement.appendChild(label);

  // Bind onchange to the checkbox, not the li
  checkbox.addEventListener('change', (event) => {
    toggleComplete(todo.id, event);
  });

  const removeBtn = li.querySelector('.btn-danger');
  removeBtn.addEventListener('click', () => {
    removeTodo(todo);
  });

  document.getElementById('todo-list').appendChild(li);
}

function editTodo(todo, event) {
  const labelElement = event.target;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control';
  input.value = todo.text;
  labelElement.replaceWith(input);
  input.focus();

  input.addEventListener('blur', () => {
    saveEditedTodo(input, todo);
  });

  input.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      input.blur();
    }
  });
}

function saveEditedTodo(input, todo) {
  const newText = formatText(input.value) || todo.text; // Revert if empty

  if (newText === todo.text || todoExists(newText, todo.id)) {
    input.replaceWith(createTodoLabelElement(todo)); // Replace with the original label
    return; // Exit without making an API request
  }

  const label = createTodoLabelElement({ ...todo, text: newText });

  todos = todos.map((todoItem) =>
    todoItem.id === todo.id ? { ...todoItem, text: newText } : todoItem
  );

  input.replaceWith(label);
  saveTodoToLocalStorage(todos);

  updateTodoApi(todo.id, { text: newText });
}

function toggleComplete(todoId, event) {
  const todo = getTodoById(todoId);
  const checkbox = event.target;

  if (todo && checkbox) {
    todo.completed = checkbox.checked;
    saveTodoToLocalStorage(todos);

    const todoElement = getTodoElementById(todoId);
    const label = todoElement.querySelector('.todo-label');

    if (todo.completed) {
      label.classList.add('completed');
    } else {
      label.classList.remove('completed');
    }
    updateTodoApi(todoId, { completed: todo.completed });
  }
}

async function removeTodoCompletely(todoId) {
  try {
    await deleteTodoApi(todoId);
    removeTodoFromArray(todoId);
    removeTodoFromDOM(todoId);
  } catch (error) {
    showModal({
      title: 'Error',
      message: 'Failed to delete the todo. Please try again.',
    });
  }
}

function removeTodoFromArray(todoId) {
  const updatedTodos = todos.filter((todoItem) => todoItem.id !== todoId);
  todos = updatedTodos;
  saveTodoToLocalStorage(updatedTodos);
}

function removeTodoFromDOM(todoId) {
  const todoElement = getTodoElementById(todoId);

  if (todoElement) {
    todoElement.remove();
  }
}

function removeTodo(todo) {
  if (todo.completed) {
    removeTodoCompletely(todo.id);
  } else {
    showModal({
      title: 'Please confirm',
      message: `Todo <strong>${todo.text}</strong> is not completed. Do you really want to delete it?`,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Delete',
          btnStyle: 'btn-danger',
          callback: () => removeTodoCompletely(todo.id),
        },
      ],
    });
  }
}

function clearCompletedTodos() {
  todos.forEach((todo) => {
    if (todo.completed) {
      removeTodoCompletely(todo.id);
    }
  });
}

function hideCompletedTodos() {
  todos.forEach((todoItem) => {
    const todoElement = getTodoElementById(todoItem.id);
    if (todoElement)
      if (todoItem.completed) {
        todoElement.classList.add('d-none');
      } else {
        todoElement.classList.remove('d-none');
      }
  });
}

function showAllTodos() {
  todos.forEach((todoItem) => {
    const todoElement = getTodoElementById(todoItem.id);
    if (todoElement) {
      todoElement.classList.remove('d-none');
    }
  });
}

function clearAllTodos() {
  todos.forEach((todo) => {
    removeTodoCompletely(todo.id);
  });
}

loadTodos();
registerTodoEvents();
