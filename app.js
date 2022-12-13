const express = require("express");
var csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const app = express();
const { Todo } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.get("/", async (request, response) => {
  try {
    const overduetodos = await Todo.overdue();
    const duetodaytodos = await Todo.dueToday();
    const duelatertodos = await Todo.dueLater();
    const completedtodos = await Todo.completedTodos();

    if (request.accepts("html")) {
      response.render("index", {
        title: "To-Do Manager",
        overduetodos,
        duetodaytodos,
        duelatertodos,
        completedtodos,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        overduetodos,
        duetodaytodos,
        duelatertodos,
        completedtodos,
      });
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/", function (request, response) {
  response.send("Hello World");
});

app.get("/todos", async function (_request, response) {
  console.log("Processing list of all Todos ...");

  // FILL IN YOUR CODE HERE

  // First, we have to query our PostgerSQL database using Sequelize to get list of all Todos.
  // Then, we have to respond with all Todos, like:
  // response.send(todos)
  try {
    const todos = await Todo.findAll({
      order: [["id", "ASC"]],
    });
    return response.json(todos);
  } catch (error) {
    console.log(error);
    return response.status(500).send(error);
  }
});

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/todos", async function (request, response) {
  try {
    await Todo.addTodo({
      title: request.body.title,
      dueDate: request.body.dueDate,
    });
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id", async function (request, response) {
  const todo = await Todo.findByPk(request.params.id);
  try {
    const todo = await Todo.findByPk(request.params.id);
    const updatedTodo = await todo.setCompletionStatus(request.body.completed);
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  console.log("We have to delete a Todo with ID: ", request.params.id);
  // FILL IN YOUR CODE HERE

  // First, we have to query our database to delete a Todo by ID.
  // Then, we have to respond back with true/false based on whether the Todo was deleted or not.
  // response.send(true)
  try {
    const result = await Todo.remove(request.params.id);
    return response.json({ success: result == 1 });
  } catch (error) {
    return response.status(422).json(error);
  }
});

module.exports = app;
