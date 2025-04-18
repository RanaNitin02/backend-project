import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { urlencoded } from 'express';

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express.static("public"))
app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }))

export { app }