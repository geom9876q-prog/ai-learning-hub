const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

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

router.post("/", authMiddleware,adminMiddleware, async (req, res) => {

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

router.put("/:id", authMiddleware,adminMiddleware,async (req, res) => {

    const  id  = req.params.id;
    const { title, description } = req.body;

    try {

        const result = await db.query(
            "UPDATE courses SET title = $1, description = $2 WHERE id = $3 RETURNING *",
            [title, description, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        res.status(200).json({
            message: "Course updated successfully",
            course: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to update course"
        });
    }
});

router.delete("/:id", authMiddleware,adminMiddleware, async (req, res) => {

    const { id } = req.params;

    try {

        const result = await db.query(
            "DELETE FROM courses WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        res.status(200).json({
            message: "Course deleted successfully",
            course: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to delete course"
        });
    }
});

module.exports = router;