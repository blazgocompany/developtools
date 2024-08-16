const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: true,
});

// Helper function to generate a random string
function generateRandomString(length = 10) {
  return crypto.randomBytes(length).toString('hex');
}

// Helper function to hash a string
function hashAndTruncate(input, length = 64) {
  const hash = crypto.createHash("sha256");
  hash.update(input);
  const fullHash = hash.digest("hex");
  return fullHash.slice(0, length);
}
app.use(express.json());
app.use("/resources/home", express.static(path.join(__dirname, "pages", "home")));
app.use("/animations/resources/editor", express.static(path.join(__dirname, "pages", "editor")));

// Serve the home page
app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "pages", "home", "component.html");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("We aren't able to fetch that file.");
      console.error(err);
      return;
    }
    res.send(data);
  });
});


app.post("/internal/login.blazgo", async (req, res) => {
  const { username, password } = req.body;
  const client = await pool.connect();

  try {
    const result = await client.query(
      "SELECT id, password_hash FROM Users WHERE name = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).send("Invalid credentials");
    }

    const user = result.rows[0];

    // Verify password with bcrypt
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      // Generate a new session ID and update the user's record
      const sessionId = crypto.randomBytes(16).toString('hex');
      await client.query(
        "UPDATE Users SET sessionId = $1 WHERE id = $2",
        [sessionId, user.id]
      );
      res.cookie('sessionId', sessionId, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

      // Set the session ID in a cookie
      res.status(200).send(sessionId);
    } else {
      res.status(401).send("Invalid credentials");
    }
  } catch (err) {
    console.error("Error during login:", err.stack);
    res.status(500).send("Error during login");
  } finally {
    client.release();
  }
});


app.post("/internal/signup.blazgo", async (req, res) => {
  const { username, password } = req.body;
  let client;

  try {
    // Validate input
    if (!username || !password) {
      return res.status(400).send("Username and password are required");
    }

    // Hash the password
    const saltRounds = 10; // Adjust as needed
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate a new session ID (optional)
    const sessionId = crypto.randomBytes(16).toString('hex');

    // Acquire a connection from the pool
    client = await pool.connect();

    // Insert the new user into the Users table
    const result = await client.query(
      "INSERT INTO Users (name, password_hash, sessionId) VALUES ($1, $2, $3) RETURNING id",
      [username, passwordHash, sessionId]
    );

    // Check if the insertion was successful
    if (result.rowCount > 0) {
      // Optionally set the session ID in a cookie or other session management system
      res.cookie('sessionId', sessionId, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.status(200).send("Signup successful");
    } else {
      res.status(500).send("Signup failed");
    }
  } catch (error) {
    // Log and handle the error
    console.error('Error during signup:', error);
    res.status(500).send("An error occurred during signup");
  } finally {
    // Ensure the connection is always released
    if (client) {
      client.release();
    }
  }
});

app.get("/internal/checkauth.blazgo", async (req, res) => {
  // Get the session ID from cookies or headers
  const sessionId = getCookie(req, "sessionId"); // Adjust based on where the session ID is stored
  
  if (!sessionId) {
    return res.json({ isAuthenticated: false });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id FROM Users WHERE sessionId = $1",
      [sessionId]
    );

    if (result.rows.length > 0) {
      // User is authenticated
      res.json({ isAuthenticated: true });
    } else {
      // User is not authenticated
      res.json({ sessionId: sessionId, isAuthenticated: false });
    }
  } catch (err) {
    console.error("Error checking authentication:", err.stack);
    res.status(500).send("Error checking authentication");
  } finally {
    client.release();
  }
});


app.get("/onboard", (req, res) => {
  const filePath = path.join(__dirname, "pages", "onboard", "component.html");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("We aren't able to fetch that file.");
      console.error(err);
      return;
    }
    res.send(data);
  });
});
app.get("/login", (req, res) => {
  const filePath = path.join(__dirname, "pages", "login", "component.html");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("We aren't able to fetch that file.");
      console.error(err);
      return;
    }
    res.send(data);
  });
});
app.get("/signup", (req, res) => {
  const filePath = path.join(__dirname, "pages", "signup", "component.html");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("We aren't able to fetch that file.");
      console.error(err);
      return;
    }
    res.send(data);
  });
});

function getCookie(req, name) {
  // Retrieve the cookie header
  var cookieHeader = req.headers.cookie;
  
  // If there are no cookies, return undefined
  if (!cookieHeader) {
      return undefined;
  }
  
  // Split the cookie header into individual cookies
  var cookies = cookieHeader.split('; ');
  
  // Loop through each cookie and find the one with the matching name
  for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].split('=');
      var cookieName = parts[0];
      var cookieValue = parts[1];
      
      // If the name matches, return the value
      if (cookieName === name) {
          return cookieValue;
      }
  }
  
  // If the cookie is not found, return undefined
  return undefined;
}



// Create a new file with a random string as identifier
app.post("/internal/createfile.blazgo", async (req, res) => {
  const { name, data } = req.body;
  const randomString = generateRandomString(); // Generate a unique string


  const sessionId = getCookie(req, "sessionId"); // Adjust based on where the session ID is stored
  
  if (!sessionId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const client = await pool.connect();
  try {



    userquery = await client.query(
      "SELECT id FROM Users WHERE sessionId = $1",
      [sessionId]
    );

    const userId = userquery.rows[0].id; // Adjust based on your session management
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }


    const result = await client.query(
      "INSERT INTO Animator_Files (Name, Data, unique_id, user_id) VALUES ($1, $2, $3, $4) RETURNING id",
      ["Untitled File", Buffer.from("W10="), randomString, userId]
    );
    res.json({ success: true, id: result.rows[0].id, unique_id: randomString });
  } catch (err) {
    console.error("Error creating file:", err.stack);
    res.status(500).json({ success: false, message: "Error creating file" });
  } finally {
    client.release();
  }
});

app.get("/internal/getfiles.blazgo", async (req, res) => {
  const client = await pool.connect();

  const sessionId = getCookie(req, "sessionId"); // Adjust based on where the session ID is stored
  
  if (!sessionId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Assume the user ID is stored in the session

    var result = await client.query(
      "SELECT id FROM Users WHERE sessionId = $1",
      [sessionId]
    );

    const userId = result.rows[0].id; // Adjust based on your session management
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    result = await client.query(
      "SELECT id, name, modifieddate, unique_id FROM Animator_Files WHERE user_id = $1",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching data:", err.stack);
    res.status(500).send("Error fetching data");
  } finally {
    client.release();
  }
});


// Delete a file by its unique ID
app.post("/internal/deletefile.blazgo", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: "Unique ID is required" });
  }

  const client = await pool.connect();
  try {
    const result = await client.query("DELETE FROM Animator_Files WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount > 0) {
      res.json({ success: true, message: "File deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("Error executing query:", err.stack);
    res.status(500).json({ success: false, message: "Error deleting file" });
  } finally {
    client.release();
  }
});

// Rename a file by its unique ID
app.post("/internal/renamefile.blazgo", async (req, res) => {
  const { id, newName } = req.body;
  if (!id || !newName) {
    return res.status(400).json({ success: false, message: "Unique ID and new name are required" });
  }

  const client = await pool.connect();
  try {
    const result = await client.query("UPDATE Animator_Files SET name = $1 WHERE id = $2 RETURNING *", [newName, id]);
    if (result.rowCount > 0) {
      res.json({ success: true, message: "File renamed successfully", file: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("Error executing query:", err.stack);
    res.status(500).json({ success: false, message: "Error renaming file" });
  } finally {
    client.release();
  }
});

// Update file data by its unique ID
app.post("/internal/updatefiledata.blazgo", async (req, res) => {
  const { unique_id, newData } = req.body;
  if (!unique_id || !newData) {
    return res.status(400).json({ success: false, message: "Unique ID and new data are required" });
  }

  const client = await pool.connect();
  try {
    const encodedData = Buffer.from(newData, "utf-8");
    const result = await client.query("UPDATE Animator_Files SET data = $1 WHERE unique_id = $2 RETURNING *", [encodedData, unique_id]);
    if (result.rowCount > 0) {
      res.json({ success: true, message: "File data updated successfully", file: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("Error executing query:", err.stack);
    res.status(500).json({ success: false, message: "Error updating file data" });
  } finally {
    client.release();
  }
});

// Serve animation page with file data based on unique ID
app.get("/animations/:unique_id", async (req, res) => {
  const unique_id = req.params.unique_id;
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT * FROM Animator_Files WHERE unique_id = $1", [unique_id]);
    if (result.rowCount > 0) {
      const data = Buffer.from(result.rows[0].data).toString('utf-8');
      const filePath = path.join(__dirname, "pages", "editor", "component.html");
      fs.readFile(filePath, "utf8", (err, fileData) => {
        if (err) {
          res.status(500).send("We aren't able to fetch that file.");
          console.error(err);
          return;
        }
        res.send(fileData + `<script>importTweensFromJSON(\`${data}\`)</script>`);
      });
    } else {
      res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("Error fetching data:", err.stack);
    res.status(500).send("Error fetching data");
  } finally {
    client.release();
  }
});


app.get("/test", async (req, res) => {
  let client;
  try {
    // Acquire a connection from the pool
    client = await pool.connect();

    // Define the SQL query to create or update the Users table
    const query = `
      TRUNCATE TABLE Animator_Files;
    `;

    // Execute the SQL query
    const result = await client.query(query);

    // Log the result
    console.log(result);

    // Send a success response
    res.send("Users table created or updated successfully");
  } catch (error) {
    // Log and handle the error
    console.error('Error executing query:', error);

    // Send an error response
    res.status(500).send("An error occurred while creating or updating the table");
  } finally {
    // Ensure the connection is always released
    if (client) {
      client.release();
    }
  }
});



app.get("/dump-users", async (req, res) => {
  let client;
  try {
    // Acquire a connection from the pool
    client = await pool.connect();

    // Define the SQL query to select all data from the Users table
    const query = `
      SELECT * FROM Users;
    `;

    // Execute the SQL query
    const result = await client.query(query);

    // Log the result
    console.log(result.rows);

    // Send the result as a JSON response
    res.json(result.rows);
  } catch (error) {
    // Log and handle the error
    console.error('Error executing query:', error);

    // Send an error response
    res.status(500).send("An error occurred while dumping the Users table");
  } finally {
    // Ensure the connection is always released
    if (client) {
      client.release();
    }
  }
});




app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
