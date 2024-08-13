const express = require("express");
const { Client } = require("pg");
const path = require("path");
const fs = require("fs");
const app = express();
const crypto = require("crypto");
const port = process.env.PORT || 3000;
function hashAndTruncate(input, length = 64) {
  // Create a SHA-256 hash of the input string
  const hash = crypto.createHash("sha256");
  hash.update(input);
  const fullHash = hash.digest("hex");

  // Truncate the hash to the specified length
  return fullHash.slice(0, length);
}
app.use(express.json());
// Serve static files
app.use(
  "/resources/home",
  express.static(path.join(__dirname, "pages", "home"))
);
app.use(
  "/resources/editor",
  express.static(path.join(__dirname, "pages", "editor"))
);

let Database = {
  connect: function () {
    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: true,
    });
    this.isConnected = true;
    client.connect();
    return client;
  },
  disconnect: function (client) {
    client.end();
  },
  isConnected: false,
};

app.get("/", (req, res) => {
  // Path to the file you want to serve
  const filePath = path.join(__dirname, "pages", "home", "component.html");

  // Read the file and send it as a response
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("We aren't able to fetch that file.");
      console.error(err);
      return;
    }
    res.send(data);
  });
});

app.get("/internal/getfiles.blazgo", (req, res) => {
  console.log("hit");
  let db = Database.connect();
  console.log("connected");
  db.query("SELECT * FROM Animator_Files", (err, result) => {
    console.log("inside");
    if (err) {
      console.log("error");
      console.error(err.stack);
      res.status(500).send("Error fetching data");
    } else {
      console.log("sent");
      res.json(result);
      db.end();
    }
  });
});

app.post("/internal/deletefile.blazgo", async (req, res) => {
  console.log("Request Body:", req.body);

  const { id } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "File ID is required" });
  }

  const client = Database.connect(); // Use your existing Database object

  try {
    const result = await client.query(
      "DELETE FROM Animator_Files WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount > 0) {
      res.json({ success: true, message: "File deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("Error executing query:", err.stack);
    res.status(500).json({ success: false, message: "Error deleting file" });
  } finally {
    client.end(); // Ensure client is disconnected
  }
});

app.get("/internal/createfile.blazgo", async (req, res) => {
  const client = Database.connect();
  try {
    const result = await client.query(
      "INSERT INTO Animator_Files (Name, Data) VALUES ($1, $2) RETURNING id",
      ["Untitled File", Buffer.from("W10=")]
    );

    if (result.rowCount > 0) {
      const newId = result.rows[0].id; // Assuming 'id' is the column name for the primary key
      res.json({ success: true, id: newId });
      app.get(
        "/animations/" + hashAndTruncate(result.rows[0].id.toString()),
        (req, res) => {
          console.log(hashAndTruncate(result.rows[0].id.toString()))
          let db = Database.connect();
          console.log("connected");
          db.query("SELECT * FROM Animator_Files WHERE id = " + result.rows[0].id, (err, result) => {
            console.log("inside");
            if (err) {
              console.log("error");
              console.error(err.stack);
              res.status(500).send("Error fetching data");
            } else {
              var data = Buffer.toString(result.rows[0].data)
              data = Buffer.from(data, 'base64')
              data = data.toString('utf-8')
              const filePath = path.join(__dirname, "pages", "editor", "component.html");

              // Read the file and send it as a response
              fs.readFile(filePath, "utf8", (err, data) => {
                if (err) {
                  res.status(500).send("We aren't able to fetch that file.");
                  console.error(err);
                  return;
                }
                res.send(data + "<script>importTweensFromJSON(`" + data + "`)</script>");
              });
              
            }
          });
        }
      );
    } else {
      res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("Error executing query:", err.stack);
    res.status(500).json({ success: false, message: "Error inserting file" });
  } finally {
    client.end(); // Ensure client is disconnected
  }
});

app.post("/internal/renamefile.blazgo", async (req, res) => {
  console.log("Request Body:", req.body);

  const { id, newName } = req.body;

  if (!id || !newName) {
    return res
      .status(400)
      .json({ success: false, message: "File ID and new name are required" });
  }

  const client = Database.connect(); // Use your existing Database object

  try {
    // Update the file name where the ID matches
    const result = await client.query(
      "UPDATE Animator_Files SET Name = $1 WHERE id = $2 RETURNING *",
      [newName, id]
    );

    if (result.rowCount > 0) {
      res.json({
        success: true,
        message: "File renamed successfully",
        file: result.rows[0],
      });
    } else {
      res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("Error executing query:", err.stack);
    res.status(500).json({ success: false, message: "Error renaming file" });
  } finally {
    client.end(); // Ensure client is disconnected
  }
});

app.post("/internal/updatefiledata.blazgo", async (req, res) => {
  console.log("Request Body:", req.body);

  const { id, newData } = req.body;

  if (!id || !newData) {
    return res
      .status(400)
      .json({ success: false, message: "File ID and new data are required" });
  }

  const client = Database.connect(); // Use your existing Database object

  try {
    // Encode the new data into a Buffer
    const encodedData = Buffer.from(newData, "utf-8");

    // Update the file data where the ID matches
    const result = await client.query(
      "UPDATE Animator_Files SET Data = $1 WHERE id = $2 RETURNING *",
      [encodedData, id]
    );

    if (result.rowCount > 0) {
      res.json({
        success: true,
        message: "File data updated successfully",
        file: result.rows[0],
      });
    } else {
      res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (err) {
    console.error("Error executing query:", err.stack);
    res
      .status(500)
      .json({ success: false, message: "Error updating file data" });
  } finally {
    client.end(); // Ensure client is disconnected
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
