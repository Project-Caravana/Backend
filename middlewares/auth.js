import jwt from "jsonwebtoken";
import Empresa from "../models/Empresa.js";
import Funcionario from "../models/Funcionario.js";

// Middleware principal - verifica se está autenticado
export const verificarAutenticacao = async (req, res, next) => {
    try {
        // Pega o token do header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                message: 'Token não fornecido. Acesso negado.' 
            });
        }
        
        // Remove 'Bearer ' do token
        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                message: 'Token inválido. Acesso negado.' 
            });
        }

        // Verifica e decodifica o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Normaliza tipo (pode vir como string ou array)
        const tipo = Array.isArray(decoded.tipo) ? decoded.tipo[0] : decoded.tipo;
        
        // Busca o usuário baseado no tipo
        if (tipo === 'funcionario') {
            const funcionario = await Funcionario.findById(decoded.id).populate('empresa');
            
            if (!funcionario) {
                return res.status(401).json({ 
                    message: 'Funcionário não encontrado' 
                });
            }
            
            if (!funcionario.ativo) {
                return res.status(401).json({ 
                    message: 'Funcionário inativo. Entre em contato com sua empresa.' 
                });
            }
            
            if (!funcionario.empresa.ativa) {
                return res.status(401).json({ 
                    message: 'Empresa inativa. Entre em contato com o suporte.' 
                });
            }
            
            // Adiciona funcionário ao request
            req.funcionario = funcionario;
            req.empresa = funcionario.empresa;
            req.userId = funcionario._id;
            
            // Define tipoUsuario baseado no perfil
            // Se perfil é 'admin', trata como empresa para permissões
            const perfil = Array.isArray(funcionario.perfil) ? funcionario.perfil[0] : funcionario.perfil;
            req.tipoUsuario = perfil === 'admin' ? 'empresa' : 'funcionario';
            req.perfil = perfil;
            
        } else if (tipo === 'admin') {
            const empresa = await Empresa.findById(decoded.id);
            
            if (!empresa) {
                return res.status(401).json({ 
                    message: 'Empresa não encontrada' 
                });
            }
            
            if (!empresa.ativa) {
                return res.status(401).json({ 
                    message: 'Empresa inativa. Entre em contato com o suporte.' 
                });
            }
            
            // Adiciona empresa ao request
            req.empresa = empresa;
            req.tipoUsuario = 'empresa';
            req.userId = empresa._id;
            
        } else if (tipo === 'funcionario') {
            const funcionario = await Funcionario.findById(decoded.id).populate('empresa');
            
            if (!funcionario) {
                return res.status(401).json({ 
                    message: 'Funcionário não encontrado' 
                });
            }
            
            if (!funcionario.ativo) {
                return res.status(401).json({ 
                    message: 'Funcionário inativo. Entre em contato com sua empresa.' 
                });
            }
            
            if (!funcionario.empresa.ativa) {
                return res.status(401).json({ 
                    message: 'Empresa inativa. Entre em contato com o suporte.' 
                });
            }
            
            // Adiciona funcionário ao request
            req.funcionario = funcionario;
            req.empresa = funcionario.empresa;
            req.tipoUsuario = 'funcionario';
            req.userId = funcionario._id;
            
        } else {
            return res.status(401).json({ 
                message: 'Tipo de usuário inválido' 
            });
        }
        
        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: 'Token inválido',
                erro: error.message 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expirado. Faça login novamente.',
                erro: error.message 
            });
        }
        
        console.error('Erro na autenticação:', error);
        return res.status(500).json({ 
            message: 'Erro ao verificar autenticação',
            erro: error.message 
        });
    }
};

// Middleware - apenas empresas podem acessar
export const apenasEmpresa = (req, res, next) => {
    if (req.tipoUsuario !== 'empresa') {  // ← CORRIGIDO: era 'req.perfil !== admin'
        return res.status(403).json({ 
            message: 'Acesso negado. Apenas empresas podem acessar este recurso.' 
        });
    }
    next();
};

// Middleware - apenas funcionários podem acessar
export const apenasFuncionario = (req, res, next) => {
    if (req.tipoUsuario !== 'funcionario') {
        return res.status(403).json({ 
            message: 'Acesso negado. Apenas funcionários podem acessar este recurso.' 
        });
    }
    next();
};

// Middleware - verifica se o usuário tem permissão para acessar recurso da empresa
export const verificarEmpresa = (req, res, next) => {
    const empresaId = req.params.empresaId || req.body.empresa || req.query.empresaId;
    
    if (!empresaId) {
        return res.status(400).json({ 
            message: 'ID da empresa não fornecido' 
        });
    }
    
    // Se for empresa, verifica se é a mesma
    if (req.tipoUsuario === 'empresa') {
        if (req.empresa._id.toString() !== empresaId) {
            return res.status(403).json({ 
                message: 'Você não tem permissão para acessar recursos de outra empresa' 
            });
        }
    }
    
    // Se for funcionário, verifica se pertence à empresa
    if (req.tipoUsuario === 'funcionario') {
        if (req.empresa._id.toString() !== empresaId) {
            return res.status(403).json({ 
                message: 'Você não tem permissão para acessar recursos de outra empresa' 
            });
        }
    }
    
    next();
};

// Middleware - verifica se funcionário pode acessar apenas seus próprios dados
export const apenasProprioFuncionario = (req, res, next) => {
    const funcionarioId = req.params.id || req.params.funcionarioId;
    
    if (req.tipoUsuario === 'funcionario') {
        if (req.funcionario._id.toString() !== funcionarioId) {
            return res.status(403).json({ 
                message: 'Você só pode acessar seus próprios dados' 
            });
        }
    }
    // Empresas podem acessar dados de seus funcionários
    next();
};