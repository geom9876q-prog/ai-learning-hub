const express= require('express');
const bcrypt = require("bcrypt");
const db = require('../config/db');
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const {
    generateLearningPlan,
    generateRecoveryPlan,
    generateRetentionQuiz
} = require("../services/aiService");

const {
    getNextRecommendation
} = require("../services/recommendationService");

const router= express.Router();

router.post('/register', async(req,res) => {

    const name=req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    if(!name || !email || !password)
    {
        return res.status(400).json({
            message: "Please provide name, email and password"
        });
    }

    try{
        const hashedPassword = await bcrypt.hash(password, 10);

         const result = await db.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {

         if (error.code === "23505") {
        return res.status(409).json({
            message: "Email already registered"
        });
        }

        console.error(error.message);

        res.status(500).json({
            message: "Registration failed"
        });
    
    }

});

router.post('/login', async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    try {

        const result = await db.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
                    { id: user.id,
                      role: user.role 
                     },
                    process.env.JWT_SECRET,
                    { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Login failed"
        });
    }
});

router.get("/profile", authMiddleware, async (req, res) => {

    try {

        const result = await db.query(
            "SELECT id, name, email FROM users WHERE id = $1",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            user: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to get profile"
        });
    }
});

router.get("/my-courses", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        const result = await db.query(
            `SELECT courses.id, courses.title, courses.description, enrollments.enrolled_at
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

router.get("/learning-memory", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        const result = await db.query(
            `SELECT
                courses.title AS course_title,
                lessons.title AS lesson_title,
                learning_memory.summary,
                learning_memory.created_at
             FROM learning_memory
             JOIN lessons
             ON learning_memory.lesson_id = lessons.id
             JOIN courses
             ON lessons.course_id = courses.id
             WHERE learning_memory.user_id = $1
             ORDER BY learning_memory.created_at DESC`,
            [userId]
        );

        res.status(200).json({
            learning_memory: result.rows
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch learning memory"
        });
    }
});

router.get("/where-i-left-off", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        const result = await db.query(
            `SELECT
                courses.id AS course_id,
                courses.title AS course_title,
                lessons.id AS lesson_id,
                lessons.title AS lesson_title,
                learning_memory.summary,
                lesson_completions.completed_at
             FROM lesson_completions
             JOIN lessons
             ON lesson_completions.lesson_id = lessons.id
             JOIN courses
             ON lessons.course_id = courses.id
             LEFT JOIN learning_memory
             ON learning_memory.user_id = $1
             AND learning_memory.lesson_id = lessons.id
             WHERE lesson_completions.user_id = $1
             ORDER BY lesson_completions.completed_at DESC
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "No completed lessons found"
            });
        }

        res.status(200).json({
            message: "Where I left off fetched successfully",
            where_i_left_off: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch where I left off"
        });
    }
});

router.post("/learner-profile", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    const {
        career_goal,
        motivation,
        current_level,
        days_to_goal,
        daily_study_minutes
    } = req.body;

    if (!career_goal || !days_to_goal || !daily_study_minutes) {
        return res.status(400).json({
            message: "Career goal, days to goal and daily study time are required"
        });
    }

    try {

            const result = await db.query(
            `INSERT INTO learner_profiles
            (
                user_id,
                career_goal,
                motivation,
                current_level,
                days_to_goal,
                daily_study_minutes
            )
            VALUES ($1, $2, $3, $4, $5, $6)

            ON CONFLICT (user_id)
            DO UPDATE SET
                career_goal = EXCLUDED.career_goal,
                motivation = EXCLUDED.motivation,
                current_level = EXCLUDED.current_level,
                days_to_goal = EXCLUDED.days_to_goal,
                daily_study_minutes = EXCLUDED.daily_study_minutes,
                updated_at = CURRENT_TIMESTAMP

            RETURNING *`,
            [
                userId,
                career_goal,
                motivation,
                current_level,
                days_to_goal,
                daily_study_minutes
            ]
        );

        res.status(201).json({
            message: "Learner profile created successfully",
            profile: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Learner profile already exists"
            });
        }

        res.status(500).json({
            message: "Failed to create learner profile"
        });
    }
});

router.get("/learner-profile", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        const result = await db.query(
            `SELECT career_goal,
                    motivation,
                    current_level,
                    days_to_goal,
                    daily_study_minutes,
                    created_at,
                    updated_at
             FROM learner_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Learner profile not found"
            });
        }

        res.status(200).json({
            profile: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch learner profile"
        });
    }
});

router.post("/learning-plan", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        // 1. Get learner profile
        const profileResult = await db.query(
            `SELECT career_goal,
                    motivation,
                    current_level,
                    days_to_goal,
                    daily_study_minutes
             FROM learner_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                message: "Learner profile not found"
            });
        }

        const profile = profileResult.rows[0];


        // 2. Get available lessons
        const lessonsResult = await db.query(
            `SELECT
                courses.id AS course_id,
                courses.title AS course_title,
                courses.description AS course_description,
                lessons.id AS lesson_id,
                lessons.title AS lesson_title,
                lessons.description AS lesson_description,
                lessons.lesson_order
             FROM courses
             JOIN lessons
             ON courses.id = lessons.course_id
             ORDER BY courses.id, lessons.lesson_order`
        );


        // 3. Get completed lessons
        const completedResult = await db.query(
            `SELECT lesson_id
             FROM lesson_completions
             WHERE user_id = $1`,
            [userId]
        );


        // 4. Generate personalized plan
        const plan = await generateLearningPlan(
            profile,
            lessonsResult.rows,
            completedResult.rows
        );

        const planResult = await db.query(
            `INSERT INTO learning_plans (user_id, plan)
             VALUES ($1, $2)
            RETURNING id, plan, created_at`,
            [userId, plan]
        );


        // 5. Return the plan
       res.status(201).json({
        message: "Personalized learning plan generated successfully",
         learning_plan: planResult.rows[0]
     });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to generate learning plan"
        });
    }
});

router.get("/learning-plan", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        const result = await db.query(
            `SELECT id, plan, created_at
             FROM learning_plans
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "No learning plan found"
            });
        }

        res.status(200).json({
            learning_plan: result.rows[0]
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch learning plan"
        });
    }
});

router.get("/weak-areas", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        const result = await db.query(
            `SELECT
                lessons.id AS lesson_id,
                lessons.title AS lesson_title,
                quizzes.id AS quiz_id,
                quizzes.title AS quiz_title,
                quiz_attempts.score,
                quiz_attempts.total_questions,
                ROUND(
                    (quiz_attempts.score::DECIMAL /
                     quiz_attempts.total_questions) * 100
                ) AS percentage
             FROM quiz_attempts
             JOIN quizzes
             ON quiz_attempts.quiz_id = quizzes.id
             JOIN lessons
             ON quizzes.lesson_id = lessons.id
             WHERE quiz_attempts.user_id = $1
             ORDER BY percentage ASC`,
            [userId]
        );

        const weakAreas = result.rows.filter(
            attempt => Number(attempt.percentage) < 60
        );

        res.status(200).json({
            weak_areas: weakAreas
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to detect weak areas"
        });
    }
});

router.get("/learning-recovery", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        // 1. Get learner profile
        const profileResult = await db.query(
            `SELECT career_goal,
                    motivation,
                    current_level,
                    days_to_goal,
                    daily_study_minutes
             FROM learner_profiles
             WHERE user_id = $1`,
            [userId]
        );

        if (profileResult.rows.length === 0) {
            return res.status(404).json({
                message: "Learner profile not found"
            });
        }

        const profile = profileResult.rows[0];


        // 2. Get quiz performance
                        const result = await db.query(
                    `SELECT
                        lessons.id AS lesson_id,
                        lessons.title AS lesson_title,
                        quizzes.id AS quiz_id,
                        quizzes.title AS quiz_title,
                        quiz_attempts.score,
                        quiz_attempts.total_questions,
                        ROUND(
                            (quiz_attempts.score::DECIMAL /
                            quiz_attempts.total_questions) * 100
                        ) AS percentage
                    FROM quiz_attempts
                    JOIN quizzes
                    ON quiz_attempts.quiz_id = quizzes.id
                    JOIN lessons
                    ON quizzes.lesson_id = lessons.id
                    WHERE quiz_attempts.user_id = $1
                    AND quiz_attempts.id = (
                        SELECT qa.id
                        FROM quiz_attempts qa
                        WHERE qa.user_id = $1
                        AND qa.quiz_id = quiz_attempts.quiz_id
                        ORDER BY qa.attempted_at DESC
                        LIMIT 1
                    )
                    ORDER BY percentage ASC`,
                    [userId]
                );


        // 3. Identify weak areas
        const weakAreas = result.rows.filter(
            attempt => Number(attempt.percentage) < 60
        );


        if (weakAreas.length === 0) {
            return res.status(200).json({
                message: "No weak areas detected",
                learning_recovery: null
            });
        }


        // 4. Get learning memory
        const memoryResult = await db.query(
            `SELECT
                lessons.title AS lesson_title,
                learning_memory.summary,
                learning_memory.created_at
             FROM learning_memory
             JOIN lessons
             ON learning_memory.lesson_id = lessons.id
             WHERE learning_memory.user_id = $1
             ORDER BY learning_memory.created_at DESC`,
            [userId]
        );


        // 5. Generate recovery plan
        const recoveryPlan = await generateRecoveryPlan(
            profile,
            weakAreas,
            memoryResult.rows
        );


        res.status(200).json({
            message: "Learning recovery plan generated successfully",

            weak_areas: weakAreas,

            learning_recovery: recoveryPlan
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to generate learning recovery plan"
        });
    }
});

router.get("/recommendation-reason/:lessonId",authMiddleware,async (req, res) => {

        const userId = req.user.id;
        const lessonId = req.params.lessonId;

        try {

            // 1. Get lesson information
            const lessonResult = await db.query(
                `SELECT
                    lessons.id,
                    lessons.title,
                    courses.title AS course_title
                 FROM lessons
                 JOIN courses
                 ON lessons.course_id = courses.id
                 WHERE lessons.id = $1`,
                [lessonId]
            );

            if (lessonResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Lesson not found"
                });
            }

            const lesson = lessonResult.rows[0];


            // 2. Check whether learner completed it
            const completionResult = await db.query(
                `SELECT id
                 FROM lesson_completions
                 WHERE user_id = $1
                 AND lesson_id = $2`,
                [userId, lessonId]
            );

            const completed = completionResult.rows.length > 0;


            // 3. Get quiz performance
            const quizResult = await db.query(
                `SELECT
                    quiz_attempts.score,
                    quiz_attempts.total_questions,
                    ROUND(
                        (quiz_attempts.score::DECIMAL /
                         quiz_attempts.total_questions) * 100
                    ) AS percentage
                 FROM quiz_attempts
                 JOIN quizzes
                 ON quiz_attempts.quiz_id = quizzes.id
                 WHERE quiz_attempts.user_id = $1
                 AND quizzes.lesson_id = $2
                 ORDER BY quiz_attempts.attempted_at DESC
                 LIMIT 1`,
                [userId, lessonId]
            );


            let quizPerformance = null;

            if (quizResult.rows.length > 0) {
                quizPerformance = quizResult.rows[0];
            }


            // 4. Build recommendation reasons
            const reasons = [];

            if (!completed) {
                reasons.push(
                    "You have not completed this lesson yet."
                );
            }

            if (
                quizPerformance &&
                Number(quizPerformance.percentage) < 60
            ) {
                reasons.push(
                    `Your latest quiz score was ${quizPerformance.percentage}%, indicating that you may need more practice with this topic.`
                );
            }

            if (quizPerformance &&
                Number(quizPerformance.percentage) >= 60
            ) {
                reasons.push(
                    `You have already attempted the quiz and scored ${quizPerformance.percentage}%.`
                );
            }


            if (reasons.length === 0) {
                reasons.push(
                    "This lesson is part of your available learning path."
                );
            }


            res.status(200).json({
                lesson: {
                    id: lesson.id,
                    title: lesson.title,
                    course: lesson.course_title
                },

                recommendation_reasons: reasons
            });

        } catch (error) {

            console.error(error.message);

            res.status(500).json({
                message: "Failed to generate recommendation reason"
            });
        }
    }
);

router.get("/next-recommendation", authMiddleware, async (req, res) => {

    const userId = req.user.id;

    try {

        const recommendation = await getNextRecommendation(userId);

        if (!recommendation) {

            return res.status(200).json({
                message: "You have completed all available lessons",
                recommendation: null
            });
        }

        res.status(200).json({
            message: "Recommendation generated successfully",
            recommendation: recommendation
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to generate recommendation"
        });
    }
});


router.get("/retention-check", authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {

        const result = await db.query(
            `SELECT
                lessons.id AS lesson_id,
                lessons.title AS lesson_title,
                lessons.description AS lesson_description,
                lesson_completions.completed_at,
                retention_checks.checked_at
             FROM lesson_completions
             JOIN lessons
             ON lesson_completions.lesson_id = lessons.id
             LEFT JOIN retention_checks
             ON lesson_completions.lesson_id = retention_checks.lesson_id
             AND retention_checks.user_id = $1
             WHERE lesson_completions.user_id = $1
             AND lesson_completions.completed_at <= CURRENT_TIMESTAMP - INTERVAL '30 days'
             AND (
                 retention_checks.checked_at IS NULL
                 OR retention_checks.checked_at <= CURRENT_TIMESTAMP - INTERVAL '30 days'
             )
             ORDER BY lesson_completions.completed_at ASC`,
            [userId]
        );

        res.status(200).json({
            message: "Retention check data fetched successfully",
            lessons_due_for_review: result.rows
        });

    } catch (error) {

        console.error(error.message);

        res.status(500).json({
            message: "Failed to fetch retention check data"
        });
    }
});

router.post( "/retention-session/:lessonId", authMiddleware,async (req, res) => {

        const userId = req.user.id;
        const lessonId = req.params.lessonId;

        try {

            // 1. Get the lesson
            const lessonResult = await db.query(
                `SELECT
                    id,
                    title,
                    description,
                    content
                 FROM lessons
                 WHERE id = $1`,
                [lessonId]
            );

            if (lessonResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Lesson not found"
                });
            }

            const lesson = lessonResult.rows[0];

            // 2. Check whether the user completed the lesson
            const completionResult = await db.query(
                `SELECT completed_at
                 FROM lesson_completions
                 WHERE user_id = $1
                 AND lesson_id = $2`,
                [userId, lessonId]
            );

            if (completionResult.rows.length === 0) {
                return res.status(403).json({
                    message: "You have not completed this lesson"
                });
            }

            // 3. Check whether 30 days have passed
            const completedAt = completionResult.rows[0].completed_at;

            const completedDate = new Date(completedAt);
            const currentDate = new Date();

            const differenceInDays =
                (currentDate - completedDate) /
                (1000 * 60 * 60 * 24);

            if (differenceInDays < 30) {
                return res.status(400).json({
                    message: "This lesson is not due for retention review yet"
                });
            }

                    await db.query(
            `DELETE FROM retention_questions
            WHERE user_id = $1
            AND lesson_id = $2`,
            [userId, lessonId]
        );

            // 4. Generate revision session using Gemini
            const retentionSession =
                await generateRetentionQuiz(lesson);

            // 5. Store generated questions
            const savedQuestions = [];

            for (const question of retentionSession.questions) {

                const questionResult = await db.query(
                    `INSERT INTO retention_questions
                    (
                        user_id,
                        lesson_id,
                        question,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        correct_option
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id, question, option_a, option_b, option_c, option_d`,
                    [
                        userId,
                        lessonId,
                        question.question,
                        question.option_a,
                        question.option_b,
                        question.option_c,
                        question.option_d,
                        question.correct_option
                    ]
                );

                savedQuestions.push(questionResult.rows[0]);
            }

            // 6. Return the generated session
            res.status(200).json({
                message: "Retention session generated successfully",

                lesson: {
                    id: lesson.id,
                    title: lesson.title
                },

                notes: retentionSession.notes,

                questions: savedQuestions
            });

        } catch (error) {

            console.error(error.message);

            res.status(500).json({
                message: "Failed to generate retention session"
            });
        }
    }
);

router.post(
    "/retention-session/:lessonId/submit",
    authMiddleware,
    async (req, res) => {

        const userId = req.user.id;
        const lessonId = req.params.lessonId;
        const { answers } = req.body;

        try {

            // 1. Validate answers
            if (!Array.isArray(answers) || answers.length !== 3) {
                return res.status(400).json({
                    message: "Exactly 3 answers are required"
                });
            }

            // 2. Get the retention questions from DB
            const questionsResult = await db.query(
                `SELECT
                    id,
                    correct_option
                 FROM retention_questions
                 WHERE user_id = $1
                 AND lesson_id = $2
                 ORDER BY id DESC
                 LIMIT 3`,
                [userId, lessonId]
            );

            if (questionsResult.rows.length !== 3) {
                return res.status(404).json({
                    message: "Retention questions not found"
                });
            }

            // 3. Calculate score
            let score = 0;

            for (const question of questionsResult.rows) {

                const userAnswer = answers.find(
                    answer => Number(answer.question_id) === question.id
                );

                if (
                    userAnswer &&
                    userAnswer.answer === question.correct_option
                ) {
                    score++;
                }
            }

            const totalQuestions = questionsResult.rows.length;

            // 4. Determine retention status
            let status;

            if (score === 3) {
                status = "retained";
            } else if (score === 2) {
                status = "needs_light_revision";
            } else {
                status = "needs_recovery";
            }

            // 5. Save result
            const result = await db.query(
                `INSERT INTO retention_checks
                (
                    user_id,
                    lesson_id,
                    score,
                    total_questions
                )
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, lesson_id)
                DO UPDATE SET
                    score = EXCLUDED.score,
                    total_questions = EXCLUDED.total_questions,
                    checked_at = CURRENT_TIMESTAMP
                RETURNING *`,
                [
                    userId,
                    lessonId,
                    score,
                    totalQuestions
                ]
            );

            await db.query(
                `DELETE FROM retention_questions
                WHERE user_id = $1
                AND lesson_id = $2`,
                [userId, lessonId]
            );

            // 6. Send result
            res.status(200).json({
                message: "Retention check completed successfully",

                result: {
                    score: score,
                    total_questions: totalQuestions,
                    percentage: Math.round(
                        (score / totalQuestions) * 100
                    ),
                    status: status,
                    checked_at: result.rows[0].checked_at
                }
            });

        } catch (error) {

            console.error(error.message);

            res.status(500).json({
                message: "Failed to submit retention check"
            });
        }
    }
);

module.exports = router;