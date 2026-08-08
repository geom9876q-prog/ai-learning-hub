const express= require('express');

const router= express.Router();

router.post('/register',(req,res) => {

    const name=req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    res.json({
        "message": "user registered successfully",
        "name": name,
        "email":email,
        "password": password
    })
});

module.exports = router;