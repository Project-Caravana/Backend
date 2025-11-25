import express from 'express';
import CarroController from '../controllers/CarroController.js';
import { verificarAutenticacao } from '../middlewares/auth.js';

const router = express.Router();

// Rotas protegidas - apenas empresas
router.post('/create', verificarAutenticacao, CarroController.create);
router.put('/:id', verificarAutenticacao, CarroController.update);
router.delete('/:id', verificarAutenticacao, CarroController.delete);
router.post('/:carroId/vincular-funcionario', verificarAutenticacao, CarroController.vincularFuncionario);
router.post('/:carroId/desvincular-funcionario', verificarAutenticacao, CarroController.desvincularFuncionario);

// Rotas protegidas - empresa e funcionário
router.get('/', verificarAutenticacao, CarroController.getAll);
router.get('/:id', verificarAutenticacao, CarroController.getById);
router.get('/estatisticas-empresa', verificarAutenticacao, CarroController.getEstatisticasEmpresa);

// Rota para atualizar dados OBD (pública para o dispositivo OBD)
router.put('/:carroId/dados-obd', CarroController.atualizarDadosOBD);

// Rotas de histórico e alertas OBD (protegidas)s
router.get('/:carroId/historico-obd', verificarAutenticacao, CarroController.buscarHistoricoOBD);
router.get('/:carroId/alertas', verificarAutenticacao, CarroController.buscarAlertas);

export default router;