import express from 'express';
import EmpresaController from '../controllers/EmpresaController.js';
import { verificarAutenticacao, apenasAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Rotas protegidas
router.get('/:id', verificarAutenticacao, EmpresaController.getById);
router.put('/:id', verificarAutenticacao, apenasAdmin, EmpresaController.update);
router.get('/:id/dashboard', verificarAutenticacao, EmpresaController.dashboard);

export default router;