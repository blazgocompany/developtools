const express = require("express");
var fs = require("fs"),
  path = require("path");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config(); 
app.get("/", (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Home</title>       
            <link rel="stylesheet" type="text/css" href="home/styles.css">
        </head>
        <body>
            <script>
                 <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.6.1"></script>
    <link rel="stylesheet" href="styles/styles.css">
    <link rel="stylesheet" href="styles/home.css">
    <script src="scripts/home.js"></script>
    <div class="nav">
        <div class="controls">
            <button class="dot-grid-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <title>dots-grid</title>
                    <path
                        d="M12 16C13.1 16 14 16.9 14 18S13.1 20 12 20 10 19.1 10 18 10.9 16 12 16M12 10C13.1 10 14 10.9 14 12S13.1 14 12 14 10 13.1 10 12 10.9 10 12 10M12 4C13.1 4 14 4.9 14 6S13.1 8 12 8 10 7.1 10 6 10.9 4 12 4M6 16C7.1 16 8 16.9 8 18S7.1 20 6 20 4 19.1 4 18 4.9 16 6 16M6 10C7.1 10 8 10.9 8 12S7.1 14 6 14 4 13.1 4 12 4.9 10 6 10M6 4C7.1 4 8 4.9 8 6S7.1 8 6 8 4 7.1 4 6 4.9 4 6 4M18 16C19.1 16 20 16.9 20 18S19.1 20 18 20 16 19.1 16 18 16.9 16 18 16M18 10C19.1 10 20 10.9 20 12S19.1 14 18 14 16 13.1 16 12 16.9 10 18 10M18 4C19.1 4 20 4.9 20 6S19.1 8 18 8 16 7.1 16 6 16.9 4 18 4Z" />
                </svg>
            </button>
            <div class="divider"></div>
            <div class="tabs">
                <input class="sr-only" id="files" type="radio" name="tabs" value="files" />
                <label for="files">My Files</label>
                <input class="sr-only" id="more" type="radio" name="tabs" value="more" />
                <label for="more">More</label>
                <div class="tabs__indicator" aria-hidden="true">
                    <div class="tabs__track">
                        <label for="files">My Files</label>
                        <label for="more">More</label>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="content">
        <div class="fileheader">
            <h1>My Files</h1>
        </div>
        <div class="filecontainer">
            
        </div>
            

        </div>
    </div>
            </script>
        </body>
        </html>
    `);
});

app.get('/somepage', async (req, res) => {
    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  
    try {
      // Connect to the PostgreSQL server
      await client.connect();
  
      // Create a table if it doesn't exist (consider moving this to a setup script)
      await client.query(`
        CREATE TABLE IF NOT EXISTS Animator_Files (
          id SERIAL PRIMARY KEY,
          Name VARCHAR(255) NOT NULL,
          Data BYTEA,
          ModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
  
      // Insert data into the table (consider moving this to a setup script)
      await client.query(`
        INSERT INTO Animator_Files (Name, Data) 
        VALUES 
        ($1, $2),
        ($3, $4)
      `, [
        'Example File', Buffer.from('Sample data in binary'),
        'Another File', Buffer.from('More sample data')
      ]);
  
      // Read data from the table
      const result = await client.query('SELECT * FROM Animator_Files');
  
      // Respond with data
      res.json(result.rows);
    } catch (err) {
      console.error('Error executing query', err.stack);
      res.status(500).send('Internal Server Error');
    } finally {
      // Ensure the client is properly closed
      await client.end();
    }
  });

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
