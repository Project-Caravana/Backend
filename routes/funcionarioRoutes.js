import express from 'express';
import FuncionarioController from '../controllers/FuncionarioController.js';
import { verificarAutenticacao, apenasEmpresa, apenasFuncionario, apenasProprioFuncionario } from '../middlewares/auth.js';

const router = express.Router();

// Rotas protegidas - apenas empresa
router.delete('/:id', verificarAutenticacao, apenasEmpresa, FuncionarioController.delete);

// Rotas protegidas - empresa e funcionário
router.get('/', verificarAutenticacao, FuncionarioController.getAll);
router.get('/:id', verificarAutenticacao, apenasProprioFuncionario, FuncionarioController.getById);

// Rotas protegidas - apenas funcionário
router.get('/:id/meu-carro', verificarAutenticacao, apenasFuncionario, FuncionarioController.meuCarro);

export default router;