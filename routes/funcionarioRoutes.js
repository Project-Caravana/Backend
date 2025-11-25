import express from 'express';
import FuncionarioController from '../controllers/FuncionarioController.js';
import { apenasAdmin, podeGerenciarFuncionarios, verificarAutenticacao } from '../middlewares/auth.js';

const router = express.Router();

// ✅ Rotas específicas PRIMEIRO
router.get('/disponiveis', verificarAutenticacao, FuncionarioController.getDisponiveis);

// Rotas de criação
router.post('/create', verificarAutenticacao, podeGerenciarFuncionarios, FuncionarioController.addFuncionarioToEmpresa);

// Rotas de listagem
router.get('/', verificarAutenticacao, FuncionarioController.getAll);

// Rotas dinâmicas POR ÚLTIMO
router.get('/:id', verificarAutenticacao, FuncionarioController.getById);
router.put('/:id', verificarAutenticacao, apenasAdmin, FuncionarioController.update);
router.delete('/:id', verificarAutenticacao, apenasAdmin, FuncionarioController.delete);

export default router;