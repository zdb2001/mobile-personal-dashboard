const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");

let todos = JSON.parse(
  localStorage.getItem("todos") || "[]"
);


function saveTodos() {
  localStorage.setItem(
    "todos",
    JSON.stringify(todos)
  );
}


function render() {
  list.innerHTML = "";

  for (const todo of todos) {

    const li = document.createElement("li");
    li.className = "todo-item";

    if (todo.done) {
      li.classList.add("done");
    }


    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = todo.done;

    checkbox.addEventListener("change", function () {
      todo.done = checkbox.checked;

      saveTodos();
      render();
    });


    const span = document.createElement("span");

    span.className = "todo-text";
    span.textContent = todo.text;


    const deleteButton = document.createElement("button");

    deleteButton.className = "delete-button";
    deleteButton.textContent = "删除";

    deleteButton.addEventListener("click", function () {

      todos = todos.filter(function (item) {
        return item.id !== todo.id;
      });

      saveTodos();
      render();
    });


    li.append(
      checkbox,
      span,
      deleteButton
    );

    list.append(li);
  }
}


form.addEventListener("submit", function (event) {

  event.preventDefault();

  const text = input.value.trim();

  if (text === "") {
    return;
  }

  const todo = {
    id: Date.now(),
    text: text,
    done: false
  };

  todos.push(todo);

  saveTodos();
  render();

  input.value = "";
});


render();