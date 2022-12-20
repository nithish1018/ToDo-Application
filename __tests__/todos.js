const request = require("supertest");
var cheerio = require("cheerio");
jest.setTimeout(10000);

const db = require("../models/index");
const app = require("../app");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}
const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });
  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Peter",
      lastName: "Parker",
      email: "peterparker@gmail.com",
      password: "petermj1018",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });
  test("User A shouldn't able to update User B's todos", async () => {
    //creating user A account
    //let agent = request.agent(server);
    let result = await agent.get("/signup");
    let csrfToken = extractCsrfToken(result);
    result = await agent.post("/users").send({
      firstName: "Bruce",
      lastName: "Wayne",
      email: "batman@gmail.com",
      password: "batmanvengeance",
      _csrf: csrfToken,
    });
    //create todo
    result = await agent.get("/todos");
    csrfToken = extractCsrfToken(result);
    result = await agent.post("/todos").send({
      title: "Talk with CatWoman",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const UserATodoId = result.id;
    //logout the above user
    await agent.get("/signout");
    //create another user account
    result = await agent.get("/signup");
    csrfToken = extractCsrfToken(result);
    result = await agent.post("/users").send({
      firstName: "Peter",
      lastName: "Parker",
      email: "spiderman@gmail.com",
      password: "withgreatpowercomesgreatresposibility",
      _csrf: csrfToken,
    });
    // //create todo
    // result = await agent.get("/todos");
    // csrfToken = extractCsrfToken(result);
    // result= await agent.post("/todos").send({
    //   title: "Meet MJ",
    //   dueDate: new Date().toISOString(),
    //   completed: false,
    //   _csrf: csrfToken,
    // });

    //Try to update first user todo from second user account
    result = await agent.get("/todos");
    csrfToken = extractCsrfToken(result);
    const markCompleteResponse = await agent.put(`/todos/${UserATodoId}`).send({
      _csrf: csrfToken,
      completed: true,
    });
    expect(markCompleteResponse.statusCode).toBe(422);
    //Try marking incomplete
    result = await agent.get("/todos");
    csrfToken = extractCsrfToken(result);
    const markInCompleteResponse = await agent
      .put(`/todos/${UserATodoId}`)
      .send({
        _csrf: csrfToken,
        completed: false,
      });
    expect(markInCompleteResponse.statusCode).toBe(422);
  });

  test("One user shouldn't be able delete other's todos", async () => {
    //creating user A account
    const agent = request.agent(server);
    let result = await agent.get("/signup");
    let csrfToken = extractCsrfToken(result);
    result = await agent.post("/users").send({
      firstName: "Tony",
      lastName: "Stark",
      email: "ironman@gmail.com",
      password: "I'm IronMan",
      _csrf: csrfToken,
    });
    //create todo
    result = await agent.get("/todos");
    csrfToken = extractCsrfToken(result);
    result = await agent.post("/todos").send({
      title: "Beat Thanos",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    console.log("sklhjwhffljejadg", result);
    const UserATodoId = result.id;
    //logout the above user
    await agent.get("/signout");
    //create another user account
    result = await agent.get("/signup");
    csrfToken = extractCsrfToken(result);
    result = await agent.post("/users").send({
      firstName: "Steve",
      lastName: "Rogers",
      email: "captainamerica@gmail.com",
      password: "ICanDoThisAllDay",
      _csrf: csrfToken,
    });
    //create todo
    result = await agent.get("/todos");
    csrfToken = extractCsrfToken(result);
    result = await agent.post("/todos").send({
      title: "Talk with bucky",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const UserBTodoId = result.id;
    //Try to delete first user todo from second user account
    result = await agent.get("/todos");
    csrfToken = extractCsrfToken(result);
    let deleteTodoResponse = await agent.delete(`/todos/${UserATodoId}`).send({
      _csrf: csrfToken,
    });
    expect(deleteTodoResponse.statusCode).toBe(422);
    //Try to delete second user todo from first user account

    await login(agent, "ironman@gmail.com", "I'm IronMan");
    result = await agent.get("/todos");
    csrfToken = extractCsrfToken(result);
    deleteTodoResponse = await agent.delete(`/todos/${UserBTodoId}`).send({
      _csrf: csrfToken,
    });
    expect(deleteTodoResponse.statusCode).toBe(422);
  }, 30000);

  test("Creates a todo and responds with json at /todos POST endpoint", async () => {
    const agent = request.agent(server);
    await login(agent, "peterparker@gmail.com", "petermj1018");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Marks a todo with the given ID as complete", async () => {
    const agent = request.agent(server);
    await login(agent, "peterparker@gmail.com", "petermj1018");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
        completed: true,
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });

  test("Marks a todo with the given ID as Incomplete", async () => {
    const agent = request.agent(server);
    await login(agent, "peterparker@gmail.com", "petermj1018");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
        completed: true,
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const markInCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
        completed: false,
      });
    const parsedUpdateResponse2 = JSON.parse(markInCompleteResponse.text);
    expect(parsedUpdateResponse2.completed).toBe(false);
  });

  test("Deletes a todo with the given ID if it exists", async () => {
    const agent = request.agent(server);
    await login(agent, "peterparker@gmail.com", "petermj1018");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Watch Spiderman 3",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
    //testing for possible case
    const todoid = latestTodo.id;
    const deleteResponseTrue = await agent.delete(`/todos/${todoid}`).send({
      _csrf: csrfToken,
    });
    const parsedDeleteResponseTrue = JSON.parse(
      deleteResponseTrue.text
    ).success;
    expect(parsedDeleteResponseTrue).toBe(true);

    //testing for cases in which deletion is not possible
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const deleteResponseFail = await agent.delete(`/todos/${todoid}`).send({
      _csrf: csrfToken,
    });
    const parsedDeleteResponseFail = JSON.parse(
      deleteResponseFail.text
    ).success;
    expect(parsedDeleteResponseFail).toBe(false);
  });
  test("Sign Out", async () => {
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });
});
