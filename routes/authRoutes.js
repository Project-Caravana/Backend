import { Router } from 'express';
// import AuthController from '../controllers/AuthController.js';
// import { verificarAutenticacao } from '../middlewares/auth.js';
import AuthController from '../controllers/AuthController.js';

const router = Router();

// router.post('/logout', verificarAutenticacao, AuthController.logout);
router.post('/login', AuthController.login);
router.post('/register', AuthController.create);

export default router;