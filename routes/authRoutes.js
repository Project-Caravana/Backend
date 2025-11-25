import { Router } from 'express';
// import AuthController from '../controllers/AuthController.js';
import { verificarAutenticacao } from '../middlewares/auth.js';
import AuthController from '../controllers/AuthController.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/register', AuthController.create);

router.get("/me", verificarAutenticacao, AuthController.me);

export default router;