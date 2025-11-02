import express from 'express';
import EmpresaController from '../controllers/EmpresaController.js';
import { verificarAutenticacao, apenasEmpresa } from '../middlewares/auth.js';

const router = express.Router();

// Rotas públicas
router.post('/registrar', EmpresaController.registrar);
router.post('/login', EmpresaController.login);

// Rotas protegidas
router.get('/:id', verificarAutenticacao, EmpresaController.getById);
router.put('/:id', verificarAutenticacao, apenasEmpresa, EmpresaController.update);
router.get('/:id/dashboard', verificarAutenticacao, apenasEmpresa, EmpresaController.dashboard);

export default router;