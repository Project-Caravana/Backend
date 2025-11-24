import express from "express";
import { Server } from "socket.io";
import cors from 'cors';
import http from "http";
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import router from './routes/authRoutes.js';
import veiculoRoutes from './routes/veiculoRoutes.js';
import funcionarioRoutes from './routes/funcionarioRoutes.js';
import empresaRoutes from './routes/empresaRoutes.js';

dotenv.config();

const app = express();

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

app.use(cookieParser());

app.use(express.json());

// Middleware para adicionar io ao request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rotas
app.use("/api/auth", router)
app.use("/api/vehicle", veiculoRoutes)
app.use("/api/user", funcionarioRoutes)
app.use("/api/empresa", empresaRoutes)

// Socket.IO - Conexão
io.on('connection', (socket) => {
  
  socket.on('subscribe', (carroId) => {
    socket.join(`carro:${carroId}`);
    console.log(`📡 Cliente ${socket.id} inscrito no carro ${carroId}`);
  });
  
  socket.on('disconnect', () => {
  });
});

server.listen(3000, () => console.log("🚀 API rodando na porta 3000"));