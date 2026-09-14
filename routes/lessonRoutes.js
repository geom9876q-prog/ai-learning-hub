const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { generateLessonSummary } = require("../services/aiService");

const router = express.Router();

router.post("/:id/complete", authMiddleware, async (req, res) => {

    const lessonId = req.params.id;
    const userId = req.user.id;

    try {

        // 1. Check whether lesson exists
            const lessonResult = await db.query(
            `SELECT course_id, title, description, content
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
        const lesson = lessonResult.rows[0];


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

         const summary = await generateLessonSummary(lesson);

        // 3. Mark lesson as completed
        const completionResult = await db.query(
            `INSERT INTO lesson_completions (user_id, lesson_id)
             VALUES ($1, $2)
             RETURNING *`,
            [userId, lessonId]
        );

        await db.query(
         `INSERT INTO learning_memory (user_id, lesson_id, summary)
         VALUES ($1, $2, $3)`,
        [userId, lessonId, summary]
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

router.post( "/:lessonId/quiz",  authMiddleware, adminMiddleware,async (req, res) => {

        const lessonId = req.params.lessonId;

        const {
            title,
            questions
        } = req.body;

        try {

            // 1. Check lesson exists
            const lessonResult = await db.query(
                `SELECT id
                 FROM lessons
                 WHERE id = $1`,
                [lessonId]
            );

            if (lessonResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Lesson not found"
                });
            }


            // 2. Create quiz
            const quizResult = await db.query(
                `INSERT INTO quizzes (lesson_id, title)
                 VALUES ($1, $2)
                 RETURNING *`,
                [lessonId, title]
            );

            const quiz = quizResult.rows[0];


            // 3. Add questions
            for (const question of questions) {

                await db.query(
                    `INSERT INTO quiz_questions
                    (
                        quiz_id,
                        question,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        correct_option
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        quiz.id,
                        question.question,
                        question.option_a,
                        question.option_b,
                        question.option_c,
                        question.option_d,
                        question.correct_option
                    ]
                );
            }


            res.status(201).json({
                message: "Quiz created successfully",
                quiz: quiz
            });

        } catch (error) {

            console.error(error.message);

            res.status(500).json({
                message: "Failed to create quiz"
            });
        }
    }
);

router.get("/:lessonId/quiz", authMiddleware, async (req, res) => {

    const lessonId = req.params.lessonId;
    const userId = req.user.id;

    try {

        // 1. Check whether the learner is enrolled in the course
        const enrollmentResult = await db.query(
            `SELECT e.id
             FROM enrollments e
             JOIN lessons l
             ON e.course_id = l.course_id
             WHERE e.user_id = $1
             AND l.id = $2`,
            [userId, lessonId]
        );

        if (enrollmentResult.rows.length === 0) {
            return res.status(403).json({
                message: "You are not enrolled in this course"
            });
        }


        // 2. Get quiz
        const quizResult = await db.query(
            `SELECT id, title
             FROM quizzes
             WHERE lesson_id = $1`,
            [lessonId]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        const quiz = quizResult.rows[0];


        // 3. Get questions WITHOUT correct_option
        const questionsResult = await db.query(
            `SELECT id,
                    question,
                    option_a,
                    option_b,
                    option_c,
                    option_d
             FROM quiz_questions
             WHERE quiz_id = $1
             ORDER BY id`,
            [quiz.id]
        );


        res.status(200).json({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                questions: questionsResult.rows
            }
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch quiz"
        });
    }
});

router.post("/:lessonId/quiz/submit", authMiddleware, async (req, res) => {

    const lessonId = req.params.lessonId;
    const userId = req.user.id;

    const { answers } = req.body;

    try {

        // 1. Check enrollment
        const enrollmentResult = await db.query(
            `SELECT e.id
             FROM enrollments e
             JOIN lessons l
             ON e.course_id = l.course_id
             WHERE e.user_id = $1
             AND l.id = $2`,
            [userId, lessonId]
        );

        if (enrollmentResult.rows.length === 0) {
            return res.status(403).json({
                message: "You are not enrolled in this course"
            });
        }


        // 2. Find quiz
        const quizResult = await db.query(
            `SELECT id
             FROM quizzes
             WHERE lesson_id = $1`,
            [lessonId]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        const quizId = quizResult.rows[0].id;


        // 3. Get correct answers
        const questionsResult = await db.query(
            `SELECT id, correct_option
             FROM quiz_questions
             WHERE quiz_id = $1
             ORDER BY id`,
            [quizId]
        );


        // 4. Calculate score
        let score = 0;

        for (const question of questionsResult.rows) {

            const userAnswer = answers[question.id];

            if (userAnswer === question.correct_option) {
                score++;
            }
        }


        const totalQuestions = questionsResult.rows.length;


        // 5. Save attempt
        const attemptResult = await db.query(
            `INSERT INTO quiz_attempts
            (user_id, quiz_id, score, total_questions)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                userId,
                quizId,
                score,
                totalQuestions
            ]
        );


        // 6. Return result
        res.status(201).json({
            message: "Quiz submitted successfully",

            result: {
                score: score,
                total_questions: totalQuestions,
                percentage: Math.round(
                    (score / totalQuestions) * 100
                )
            },

            attempt: attemptResult.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to submit quiz"
        });
    }
});

module.exports = router;