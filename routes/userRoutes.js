const express= require('express');
const bcrypt = require("bcrypt");
const db = require('../config/db');

const router= express.Router();

router.post('/register', async(req,res) => {

    const name=req.body.name;
    const email = req.body.email;
    const password = req.body.password;

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

        console.error(error.message);

        res.status(500).json({
            message: "Registration failed"
        });
    
    }

});

module.exports = router;