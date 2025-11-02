import express from 'express';
import CarroController from '../controllers/CarroController.js';
import { verificarAutenticacao, apenasEmpresa } from '../middlewares/auth.js';

const router = express.Router();

// Rotas protegidas - apenas empresas
router.post('/', verificarAutenticacao, apenasEmpresa, CarroController.create);
router.put('/:id', verificarAutenticacao, apenasEmpresa, CarroController.update);
router.delete('/:id', verificarAutenticacao, apenasEmpresa, CarroController.delete);
router.post('/:carroId/vincular-funcionario', verificarAutenticacao, apenasEmpresa, CarroController.vincularFuncionario);
router.post('/:carroId/desvincular-funcionario', verificarAutenticacao, apenasEmpresa, CarroController.desvincularFuncionario);

// Rotas protegidas - empresa e funcionário
router.get('/', verificarAutenticacao, CarroController.getAll);
router.get('/:id', verificarAutenticacao, CarroController.getById);

// Rota para atualizar dados OBD (pode ser pública ou protegida dependendo do seu caso)
router.put('/:carroId/dados-obd', CarroController.atualizarDadosOBD);

export default router;