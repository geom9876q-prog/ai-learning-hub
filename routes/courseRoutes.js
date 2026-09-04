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

router.post("/:id/enroll", authMiddleware, async (req, res) => {

    const { id } = req.params;
    const userId = req.user.id;

    try {

        const result = await db.query(
            `INSERT INTO enrollments (user_id, course_id)
             VALUES ($1, $2)
             RETURNING *`,
            [userId, id]
        );

        res.status(201).json({
            message: "Enrolled successfully",
            enrollment: result.rows[0]
        });

    } 
    catch (error) {

    console.error(error.message);

    if (error.code === "23505") {
        return res.status(409).json({
            message: "You are already enrolled in this course"
        });
    }

    res.status(500).json({
        message: "Enrollment failed"
    });
}
});

router.put("/:id/progress", authMiddleware, async (req, res) => {

    const { id } = req.params;
    const userId = req.user.id;
    const { completed_percentage } = req.body;

    if (completed_percentage < 0 || completed_percentage > 100) {
        return res.status(400).json({
            message: "Progress must be between 0 and 100"
        });
    }

    try {

        const result = await db.query(
            `UPDATE enrollments
             SET completed_percentage = $1
             WHERE user_id = $2 AND course_id = $3
             RETURNING *`,
            [completed_percentage, userId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "You are not enrolled in this course"
            });
        }

        res.status(200).json({
            message: "Progress updated successfully",
            enrollment: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to update progress"
        });
    }
});

router.post(  "/:courseId/lessons", authMiddleware, adminMiddleware,async (req, res) => {

        const { courseId } = req.params;

        const {
            title,
            description,
            video_url,
            lesson_order
        } = req.body;

        try {

            const result = await db.query(
                `INSERT INTO lessons
                (course_id, title, description, video_url, lesson_order)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *`,
                [
                    courseId,
                    title,
                    description,
                    video_url,
                    lesson_order
                ]
            );

            res.status(201).json({
                message: "Lesson created successfully",
                lesson: result.rows[0]
            });

        } catch (error) {

            console.error(error.message);

            res.status(500).json({
                message: "Failed to create lesson"
            });
        }
    }
);

router.get("/:courseId/lessons", async (req, res) => {

    const { courseId } = req.params;

    try {

        const result = await db.query(
            `SELECT id, title, description, video_url, lesson_order
             FROM lessons
             WHERE course_id = $1
             ORDER BY lesson_order ASC`,
            [courseId]
        );

        res.status(200).json({
            lessons: result.rows
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch lessons"
        });
    }
});

router.get("/my-courses", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        const result = await db.query(
            `SELECT courses.id,
                    courses.title,
                    courses.description,
                    enrollments.enrolled_at,
                    enrollments.completed_percentage
             FROM enrollments
             JOIN courses
             ON enrollments.course_id = courses.id
             WHERE enrollments.user_id = $1
             ORDER BY enrollments.enrolled_at DESC`,
            [userId]
        );

        res.status(200).json({
            courses: result.rows
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch enrolled courses"
        });
    }
});

router.get("/:id/progress", authMiddleware, async (req, res) => {

    const courseId = req.params.id;
    const userId = req.user.id;

    try {

        // 1. Check enrollment
        const enrollmentResult = await db.query(
            `SELECT completed_percentage
             FROM enrollments
             WHERE user_id = $1
             AND course_id = $2`,
            [userId, courseId]
        );

        if (enrollmentResult.rows.length === 0) {
            return res.status(403).json({
                message: "You are not enrolled in this course"
            });
        }

        // 2. Count total lessons
        const totalLessonsResult = await db.query(
            `SELECT COUNT(*) AS total
             FROM lessons
             WHERE course_id = $1`,
            [courseId]
        );

        const totalLessons = Number(
            totalLessonsResult.rows[0].total
        );

        // 3. Count completed lessons
        const completedLessonsResult = await db.query(
            `SELECT COUNT(*) AS completed
             FROM lesson_completions lc
             JOIN lessons l
             ON lc.lesson_id = l.id
             WHERE lc.user_id = $1
             AND l.course_id = $2`,
            [userId, courseId]
        );

        const completedLessons = Number(
            completedLessonsResult.rows[0].completed
        );

        // 4. Calculate percentage
        const completedPercentage =
            totalLessons === 0
                ? 0
                : Math.round(
                    (completedLessons / totalLessons) * 100
                );

        res.status(200).json({
            course_id: Number(courseId),
            completed_lessons: completedLessons,
            total_lessons: totalLessons,
            completed_percentage: completedPercentage
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch course progress"
        });
    }
});

module.exports = router;