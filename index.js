import express from "express";
import { Server } from "socket.io";
import cors from 'cors';
import http from "http";
import dotenv from 'dotenv';
import router from './routes/authRoutes.js'

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
    credentials: true,
    origin: "http://localhost:5173"
}))

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/auth", router)

server.listen(3000, () => console.log("API rodando na porta 3000"));
