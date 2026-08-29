const express = require("express");
const db = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {

    try {

        const result = await db.query(
            "SELECT * FROM courses ORDER BY id"
        );

        res.status(200).json({
            courses: result.rows
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch courses"
        });
    }
});

router.post("/", async (req, res) => {

    const { title, description } = req.body;

    try {

        const result = await db.query(
            "INSERT INTO courses (title, description) VALUES ($1, $2) RETURNING *",
            [title, description]
        );

        res.status(201).json({
            message: "Course created successfully",
            course: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to create course"
        });
    }
});

module.exports = router;