import express from 'express';
import CarroController from '../controllers/CarroController.js';
import { verificarAutenticacao, apenasEmpresa } from '../middlewares/auth.js';

const router = express.Router();

// Rotas protegidas - apenas empresas
router.post('/create', verificarAutenticacao, apenasEmpresa, CarroController.create);
router.put('/:id', verificarAutenticacao, apenasEmpresa, CarroController.update);
router.delete('/:id', verificarAutenticacao, apenasEmpresa, CarroController.delete);
router.post('/:carroId/vincular-funcionario', verificarAutenticacao, apenasEmpresa, CarroController.vincularFuncionario);
router.post('/:carroId/desvincular-funcionario', verificarAutenticacao, apenasEmpresa, CarroController.desvincularFuncionario);

// Rotas protegidas - empresa e funcionário
router.get('/', verificarAutenticacao, CarroController.getAll);
router.get('/:id', verificarAutenticacao, CarroController.getById);

// Rota para atualizar dados OBD (pública para o dispositivo OBD)
router.put('/:carroId/dados-obd', CarroController.atualizarDadosOBD);

// Rotas de histórico e alertas OBD (protegidas)
router.get('/:carroId/historico-obd', verificarAutenticacao, CarroController.buscarHistoricoOBD);
router.get('/:carroId/alertas', verificarAutenticacao, CarroController.buscarAlertas);

export default router;