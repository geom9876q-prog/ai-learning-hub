const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { generateDSATopicQuiz } = require("../services/aiService");

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

router.get("/:id", async (req, res) => {

    const { id } = req.params;

    try {

        const result = await db.query(
            `SELECT id, title, description
             FROM courses
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Course not found"
            });

        }

        res.status(200).json({
            course: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch course"
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

router.get("/:courseId/content", authMiddleware, async (req, res) => {
    const { courseId } = req.params;
    const { parent_id } = req.query;

    try {
        let result;

        if (parent_id) {
            result = await db.query(
                `SELECT id, parent_id, name, type, file_path
                 FROM learning_items
                 WHERE course_id = $1
                 AND parent_id = $2
                 ORDER BY type DESC, name ASC`,
                [courseId, parent_id]
            );
        } else {
            result = await db.query(
                `SELECT id, parent_id, name, type, file_path
                 FROM learning_items
                 WHERE course_id = $1
                 AND parent_id IS NULL
                 ORDER BY type DESC, name ASC`,
                [courseId]
            );
        }

        res.status(200).json({
            items: result.rows
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch course content"
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

router.post( "/:courseId/lessons", authMiddleware, adminMiddleware,async (req, res) => {

        const { courseId } = req.params;

        const {
            title,
            description,
            content,
            video_url,
            lesson_order
        } = req.body;

        try {

            const result = await db.query(
                `INSERT INTO lessons
                (course_id, title, description, content, video_url, lesson_order)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [
                    courseId,
                    title,
                    description,
                    content,
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
            `SELECT id, title, description, content, video_url, lesson_order
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


router.post("/learning-items/:itemId/quiz", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const itemId = req.params.itemId;

    try {
        const itemResult = await db.query(
            `SELECT id, name, type, course_id
             FROM learning_items
             WHERE id = $1`,
            [itemId]
        );

        if (!itemResult.rows.length) {
            return res.status(404).json({ message: "Topic not found" });
        }

        const item = itemResult.rows[0];

        if (item.type !== "folder") {
            return res.status(400).json({ message: "Select a topic folder" });
        }

        const enrollment = await db.query(
            `SELECT id FROM enrollments
             WHERE user_id = $1 AND course_id = $2`,
            [userId, item.course_id]
        );

        if (!enrollment.rows.length) {
            return res.status(403).json({ message: "Enroll in this course first" });
        }

        // A fresh AI generation request is made on every click.
        const generated = await generateDSATopicQuiz(item.name);

        const quizResult = await db.query(
            `INSERT INTO dsa_quizzes (user_id, learning_item_id, title)
             VALUES ($1, $2, $3)
             RETURNING id, title`,
            [userId, itemId, generated.title]
        );

        const quiz = quizResult.rows[0];

        for (const q of generated.questions) {
            await db.query(
                `INSERT INTO dsa_quiz_questions
                 (quiz_id, question, option_a, option_b, option_c, option_d, correct_option)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    quiz.id, q.question, q.option_a, q.option_b,
                    q.option_c, q.option_d, q.correct_option
                ]
            );
        }

        const questions = await db.query(
            `SELECT id, question, option_a, option_b, option_c, option_d
             FROM dsa_quiz_questions
             WHERE quiz_id = $1
             ORDER BY id`,
            [quiz.id]
        );

        res.status(201).json({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                item_id: Number(itemId),
                questions: questions.rows
            }
        });
    } catch (error) {
        console.error("DSA quiz generation failed:", error.message);
        res.status(502).json({
            message: "Could not generate a new AI quiz. Please try again."
        });
    }
});


router.post("/learning-items/:itemId/quiz/:quizId/submit", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { itemId, quizId } = req.params;
    const answers = req.body.answers;

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
        return res.status(400).json({ message: "Invalid answers" });
    }

    try {
        const quizResult = await db.query(
            `SELECT q.id, q.user_id, q.learning_item_id
             FROM dsa_quizzes q
             JOIN enrollments e
               ON e.course_id = (
                   SELECT course_id FROM learning_items WHERE id = q.learning_item_id
               )
             WHERE q.id = $1
               AND q.learning_item_id = $2
               AND q.user_id = $3
               AND e.user_id = $3`,
            [quizId, itemId, userId]
        );

        if (!quizResult.rows.length) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        const questions = await db.query(
            `SELECT id, correct_option
             FROM dsa_quiz_questions
             WHERE quiz_id = $1`,
            [quizId]
        );

        if (!questions.rows.length) {
            return res.status(400).json({ message: "Quiz has no questions" });
        }

        let score = 0;

        for (const question of questions.rows) {
            if (answers[question.id] === question.correct_option) {
                score++;
            }
        }

        const total = questions.rows.length;

        const attempt = await db.query(
            `INSERT INTO dsa_quiz_attempts
             (user_id, quiz_id, score, total_questions)
             VALUES ($1, $2, $3, $4)
             RETURNING id, score, total_questions, attempted_at`,
            [userId, quizId, score, total]
        );

        res.status(201).json({
            message: "Quiz submitted successfully",
            result: {
                score,
                total_questions: total,
                percentage: Math.round((score / total) * 100)
            },
            attempt: attempt.rows[0]
        });
    } catch (error) {
        console.error("DSA quiz submission failed:", error.message);
        res.status(500).json({ message: "Failed to submit quiz" });
    }
});


module.exports = router;
