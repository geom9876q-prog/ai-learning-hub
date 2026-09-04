const express = require('express');
const db = require('./config/db');
const app =express();


const healthroutes= require('./routes/Healthroutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require("./routes/courseRoutes");
const lessonRoutes = require("./routes/lessonRoutes");

app.use(express.json());

app.use(healthroutes);
app.use("/api/users",userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/lessons", lessonRoutes);

app.get('/',(req,res) =>{
      res.send("welcome to ai learning hub");
});

app.listen(3000, ()=>{
      console.log("server is running on port 3000");
});

db.query('SELECT NOW()', (err, res) => {
      if (err) {
          console.error('Error executing query', err.message);
      } else {
          console.log('Database connected:', res.rows[0]);
      }
});