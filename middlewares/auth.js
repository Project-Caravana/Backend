import jwt from "jsonwebtoken";
import Empresa from "../models/Empresa.js";
import Funcionario from "../models/Funcionario.js";

export const verificarAutenticacao = async (req, res, next) => {
    try {
        // ✅ MUDANÇA: Pega token do header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'Token não fornecido. Acesso negado.' 
            });
        }

        // Remove "Bearer " do início
        const token = authHeader.substring(7);

        // Verifica e decodifica o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);        
        
        if (decoded) {
            const funcionario = await Funcionario.findById(decoded.id);
            const empresa = await Empresa.findById(funcionario.empresa);
            
            if (!funcionario) {
                return res.status(401).json({ 
                    message: 'Funcionário não encontrado' 
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
        if (req.funcionario.perfil === "admin") {
            return next();
        }

        if (req.funcionario.perfil === "funcionario") {
            const perfilCriando = req.body.perfil;
            
            if (perfilCriando === 'funcionario') {
                if (perfilCriando !== 'motorista') {
                    return res.status(403).json({ 
                        message: 'Funcionários só podem criar motoristas. Para criar admins ou funcionários, entre em contato com um administrador.' 
                    });
                }
                
                return next();
            }
            
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

export const apenasAdmin = (req, res, next) => {
    if (req.funcionario.perfil !== 'admin') {
        return res.status(403).json({ 
            message: 'Acesso negado. Apenas admin podem acessar este recurso.' 
        });
    }
    next();
};

export const apenasFuncionario = (req, res, next) => {
    if (req.funcionario.perfil !== 'funcionario' || req.funcionario.perfil !== 'admin') {
        return res.status(403).json({ 
            message: 'Acesso negado. Apenas funcionários podem acessar este recurso.' 
        });
    }
    next();
};

export const verificarEmpresa = (req, res, next) => {
    const empresaId = req.params.empresaId || req.body.empresa || req.query.empresaId;
    
    if (!empresaId) {
        return res.status(400).json({ 
            message: 'ID da empresa não fornecido' 
        });
    }
    
    if (req.funcionario.perfil === 'admin') {
        if (req.empresa._id.toString() !== empresaId) {
            return res.status(403).json({ 
                message: 'Você não tem permissão para acessar recursos de outra empresa' 
            });
        }
    }
    
    if (req.funcionario.perfil === 'funcionario') {
        if (req.empresa._id.toString() !== empresaId) {
            return res.status(403).json({ 
                message: 'Você não tem permissão para acessar recursos de outra empresa' 
            });
        }
    }
    
    next();
};