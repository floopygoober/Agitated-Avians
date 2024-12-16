const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(cors());

let levels = {};

// Get a specific level by ID
app.get("/level/:id", (req, res) => {
    const levelId = req.params.id;
    const filePath = path.join(__dirname, "levels", `${levelId}.json`);

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading level data: ", err);
            return res.status(404).send("Level not found");
        }
        res.send(data);
    });
});

// Save a level with a specific ID
app.post("/level/:id", (req, res) => {
    const levelId = req.params.id;
    const filePath = path.join(__dirname, "levels", `${levelId}.json`);
    const levelData = req.body;

    if (!Array.isArray(levelData) || levelData.length === 0) {
        return res.status(400).send("Level data must be a non-empty array.");
    }

    // Ensure there is exactly one bird spawn in the level
    // const birdSpawns = levelData.filter(item => item.type === "bird-spawn");
    // if (birdSpawns.length !== 1) {
    //     return res.status(400).send("Level must contain exactly one bird spawn.");
    // }

    fs.writeFile(filePath, JSON.stringify(levelData, null, 2), (err) => {
        if (err) {
            console.error("Error saving level data: ", err);
            return res.status(500).send("Server error.");
        }
        res.send("Level saved successfully.");
    });
});

// Get a list of all levels
app.get("/levels", (req, res) => {
    fs.readdir("levels", (err, files) => {
        if (err) {
            console.error("Error reading levels directory:", err);
            return res.status(500).send("Server error.");
        }

        const levelIds = files
            .filter(file => file.endsWith(".json"))
            .map(file => path.basename(file, ".json"));

        res.json(levelIds);
    });
});

// Delete a level by ID
app.delete("/level/:id", (req, res) => {
    const levelId = req.params.id;
    const filePath = path.join(__dirname, "levels", `${levelId}.json`);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error("Error deleting level:", err);
            return res.status(404).send("Level not found.");
        }
        res.send("Level deleted successfully.");
    });
});

// Ensure the levels directory exists
if (!fs.existsSync("levels")) {
    fs.mkdirSync("levels");
}

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
