const express= require('express');
const bcrypt = require("bcrypt");
const db = require('../config/db');
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

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

module.exports = router;