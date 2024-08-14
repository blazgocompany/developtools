const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

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
app.use("/resources/editor", express.static(path.join(__dirname, "pages", "editor")));

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

// Create a new file with a random string as identifier
app.post("/internal/createfile.blazgo", async (req, res) => {
  const { name, data } = req.body;
  const randomString = generateRandomString(); // Generate a unique string

  if (!name || !data) {
    return res.status(400).json({ success: false, message: "File name and data are required" });
  }

  const client = await pool.connect();
  try {
    const encodedData = Buffer.from(data, "utf-8");
    const result = await client.query(
      "INSERT INTO Animator_Files (name, data, unique_id) VALUES ($1, $2, $3) RETURNING id",
      [name, encodedData, randomString]
    );
    res.json({ success: true, id: result.rows[0].id, unique_id: randomString });
  } catch (err) {
    console.error("Error creating file:", err.stack);
    res.status(500).json({ success: false, message: "Error creating file" });
  } finally {
    client.release();
  }
});

// Get files for the file list
app.get("/internal/getfiles.blazgo", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT id, name, modifieddate, unique_id FROM Animator_Files");
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
  const { unique_id } = req.body;
  if (!unique_id) {
    return res.status(400).json({ success: false, message: "Unique ID is required" });
  }

  const client = await pool.connect();
  try {
    const result = await client.query("DELETE FROM Animator_Files WHERE unique_id = $1 RETURNING *", [unique_id]);
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
  const { unique_id, newName } = req.body;
  if (!unique_id || !newName) {
    return res.status(400).json({ success: false, message: "Unique ID and new name are required" });
  }

  const client = await pool.connect();
  try {
    const result = await client.query("UPDATE Animator_Files SET name = $1 WHERE unique_id = $2 RETURNING *", [newName, unique_id]);
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
    
    // Perform the database query
    const result = await client.query("ALTER TABLE Animator_Files ADD unique_id varchar(255)");
    
    // Log the result
    console.log(result);

    // Send a success response (optional)
    res.send("Table updated successfully");
  } catch (error) {
    // Log and handle the error
    console.error('Error executing query:', error);

    // Send an error response
    res.status(500).send("An error occurred while updating the table");
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
