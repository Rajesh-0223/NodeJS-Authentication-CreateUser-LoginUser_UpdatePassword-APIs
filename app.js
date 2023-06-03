const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// User register

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
        SELECT
        *
        FROM 
        user
        WHERE
        username = '${username}';`;
  const userData = await db.get(selectUserQuery);

  if (userData === undefined) {
    let postNewUserQuery = `
            INSERT INTO 
            user (username, name, password, gender, location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`;
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      let newUserDetails = await db.run(postNewUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User login
app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `
        SELECT 
        *
        FROM 
        user
        WHERE
        username = '${username}';`;
  const userData = await db.get(selectUserQuery);

  if (userData === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, userData.password);

    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// change current password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const checkForUserQuery = `
        SELECT
        *
        FROM 
        user
        WHERE
        username = '${username}';`;
  const userData = await db.get(checkForUserQuery);

  if (userData === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = await bcrypt.compare(
      oldPassword,
      userData.password
    );

    if (isValidPassword === true) {
      const lengthOfNewPassword = newPassword.length;
      if (lengthOfNewPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);

        const updatePasswordQuery = `
                    UPDATE
                    user
                    SET
                    password = '${encryptedPassword}'
                    WHERE
                    username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
