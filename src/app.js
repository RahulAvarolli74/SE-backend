//this is for defining route 
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
}));

app.use(express.json({
    limit: '32kb'
})
);



app.use(express.urlencoded({
    extended: true
}));

app.use(express.static("public")) //too stora other assets comming from webbrowser
app.use(cookieParser());

//routes
import userRouter from './routes/user.routes.js'

// console.log("Loaded routers:", userRouter);
// routes declaration
app.use('/api/v1/students', userRouter)//goes to user routes where we declare other routes for user --login,register,...

import adminRouter from './routes/admin.routes.js';

app.use("/api/v1/admin", adminRouter);

export { app }