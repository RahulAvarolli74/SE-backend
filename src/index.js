import connectDB from "./db/index.js";
import express from 'express'
import dotenv from 'dotenv'
import {app} from './app.js'


dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.on('error',(error)=>{
        console.log(`Error while listening`,error);
        throw error;
    })
    app.listen(process.env.PORT||3000,()=>{
        console.log(`Server is  runnign on port${process.env.PORT}`);
    });
})
.catch((err)=>{
    console.log("MongoDB connection Failure ..!",err);
});

