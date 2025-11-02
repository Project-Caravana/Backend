import express from 'express';
import FuncionarioController from '../controllers/FuncionarioController.js';
import { verificarAutenticacao, apenasEmpresa, apenasFuncionario, apenasProprioFuncionario } from '../middlewares/auth.js';

const router = express.Router();

// Rotas públicas
router.post('/login', FuncionarioController.login);

// Rotas protegidas - apenas empresa
router.post('/', verificarAutenticacao, apenasEmpresa, FuncionarioController.create);
router.delete('/:id', verificarAutenticacao, apenasEmpresa, FuncionarioController.delete);

// Rotas protegidas - empresa e funcionário
router.get('/', verificarAutenticacao, FuncionarioController.getAll);
router.get('/:id', verificarAutenticacao, apenasProprioFuncionario, FuncionarioController.getById);
router.put('/:id', verificarAutenticacao, apenasProprioFuncionario, FuncionarioController.update);

// Rotas protegidas - apenas funcionário
router.get('/:id/meu-carro', verificarAutenticacao, apenasFuncionario, FuncionarioController.meuCarro);

export default router;