const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/:id/complete", authMiddleware, async (req, res) => {

    const lessonId = req.params.id;
    const userId = req.user.id;

    try {

        // 1. Check whether lesson exists
        const lessonResult = await db.query(
            `SELECT course_id
             FROM lessons
             WHERE id = $1`,
            [lessonId]
        );

        if (lessonResult.rows.length === 0) {
            return res.status(404).json({
                message: "Lesson not found"
            });
        }

        const courseId = lessonResult.rows[0].course_id;

        // 2. Check whether user is enrolled in the course
        const enrollmentResult = await db.query(
            `SELECT id
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

        // 3. Mark lesson as completed
        const completionResult = await db.query(
            `INSERT INTO lesson_completions (user_id, lesson_id)
             VALUES ($1, $2)
             RETURNING *`,
            [userId, lessonId]
        );

        // 4. Count total lessons in the course
    const totalLessonsResult = await db.query(
          `SELECT COUNT(*) AS total
          FROM lessons
           WHERE course_id = $1`,
         [courseId]
        );

    const totalLessons = Number(totalLessonsResult.rows[0].total);


// 5. Count completed lessons
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


// 6. Calculate percentage
    const completedPercentage = Math.round(
         (completedLessons / totalLessons) * 100
    );


// 7. Update enrollment progress
    await db.query(
        `UPDATE enrollments
        SET completed_percentage = $1
        WHERE user_id = $2
         AND course_id = $3`,
        [completedPercentage, userId, courseId]
    );

    res.status(201).json({
    message: "Lesson completed successfully",
    completion: completionResult.rows[0],
    progress: {
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        completed_percentage: completedPercentage
    }
});
    } catch (error) {

        console.error(error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Lesson already completed"
            });
        }

        res.status(500).json({
            message: "Failed to complete lesson"
        });
    }
});

module.exports = router;