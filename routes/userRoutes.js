const express= require('express');
const bcrypt = require("bcrypt");
const db = require('../config/db');
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const {
    generateLearningPlan,
    generateRecoveryPlan
} = require("../services/aiService");

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
            (user_id, career_goal, motivation, current_level,
             days_to_goal, daily_study_minutes)
            VALUES ($1, $2, $3, $4, $5, $6)
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

module.exports = router;