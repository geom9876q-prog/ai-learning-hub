const express = require('express');
const app =express();

const healthroutes= require('./routes/Healthroutes');
const userRoutes = require('./routes/userRoutes');

app.use(express.json());

app.use(healthroutes);
app.use("/api/users",userRoutes);

app.get('/',(req,res) =>{
      res.send("welcome to ai learning hub");
});

app.listen(3000, ()=>{
      console.log("server is running on port 3000");
});