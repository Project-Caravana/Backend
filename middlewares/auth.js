import jwt from "jsonwebtoken";
import Empresa from "../models/Empresa.js";
import Funcionario from "../models/Funcionario.js";

// Middleware principal - verifica se está autenticado
export const verificarAutenticacao = async (req, res, next) => {
    
    try {
        // Pega o token do header
        const token = req.cookies.auth_token;
        
        if (!token) {
            return res.status(401).json({ 
                message: 'Token não fornecido. Acesso negado.' 
            });
        }

        // Verifica e decodifica o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);        
        
        // Busca o usuário baseado no tipo
        if (decoded) {
            const funcionario = await Funcionario.findById(decoded.id);
            const empresa = await Empresa.findById(funcionario.empresa);
            
            if (!funcionario) {
                return res.status(401).json({ 
                    message: 'Empresa não encontrada' 
                });
            }
            
            if (!funcionario.ativo) {
                return res.status(401).json({ 
                    message: 'Funcionário inativo. Entre em contato com o suporte.' 
                });
            }

            if (!empresa.ativa) {
                return res.status(401).json({ 
                    message: 'Empresa inativa. Entre em contato com o suporte.' 
                });
            }
            
            req.funcionario = funcionario;
            req.empresa = empresa;
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

export const podeGerenciarFuncionarios = async (req, res, next) => {
    try {
        // Empresa (admin) pode criar qualquer tipo de funcionário
        if (req.funcionario.perfil === "admin") {
            return next();
        }

        // Funcionário só pode criar se for admin
        if (req.funcionario.perfil === "funcionario") {
            const perfilCriando = req.body.perfil;
            
            // Se for funcionário comum, só pode criar motorista
            if (perfilCriando === 'funcionario') {
                // VERIFICAÇÃO CRÍTICA: Impedir criação de 'funcionario' ou 'admin'
                if (perfilCriando !== 'motorista') {
                    return res.status(403).json({ 
                        message: 'Funcionários só podem criar motoristas. Para criar admins ou funcionários, entre em contato com um administrador.' 
                    });
                }
                
                return next();
            }
            
            // Motoristas não podem criar outros funcionários
            return res.status(403).json({ 
                message: 'Você não tem permissão para criar funcionários' 
            });
        }

        return res.status(403).json({ 
            message: 'Você não tem permissão para esta operação' 
        });

    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        return res.status(500).json({ 
            message: 'Erro ao verificar permissões' 
        });
    }
};

// Middleware - apenas empresas podem acessar
export const apenasAdmin = (req, res, next) => {
    if (req.funcionario.perfil !== 'admin') {
        return res.status(403).json({ 
            message: 'Acesso negado. Apenas admin podem acessar este recurso.' 
        });
    }
    next();
};

// Middleware - apenas funcionários podem acessar
export const apenasFuncionario = (req, res, next) => {
    if (req.funcionario.perfil !== 'funcionario' || req.funcionario.perfil !== 'admin') {
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
    
    // Se for admin, verifica se é a mesma
    if (req.funcionario.perfil === 'admin') {
        if (req.empresa._id.toString() !== empresaId) {
            return res.status(403).json({ 
                message: 'Você não tem permissão para acessar recursos de outra empresa' 
            });
        }
    }
    
    // Se for funcionário, verifica se pertence à empresa
    if (req.funcionario.perfil === 'funcionario') {
        if (req.empresa._id.toString() !== empresaId) {
            return res.status(403).json({ 
                message: 'Você não tem permissão para acessar recursos de outra empresa' 
            });
        }
    }
    
    next();
};