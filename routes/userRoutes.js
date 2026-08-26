const express= require('express');
const bcrypt = require("bcrypt");
const db = require('../config/db');

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

        res.status(200).json({
            message: "Login successful",
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

module.exports = router;