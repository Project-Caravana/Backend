import Empresa from "../models/Empresa.js";
import Carro from "../models/Carro.js";
import Funcionario from "../models/Funcionario.js";
import Joi from 'joi';
import { gerarToken } from '../helpers/auth.js';

// Schema para criar empresa
const empresaCreateSchema = Joi.object({
    nome: Joi.string().required().min(3).messages({
        'string.min': 'Nome deve ter no mínimo 3 caracteres',
        'any.required': 'Nome é obrigatório'
    }),
    cnpj: Joi.string().required().length(14).messages({
        'string.length': 'CNPJ deve ter 14 dígitos',
        'any.required': 'CNPJ é obrigatório'
    }),
    email: Joi.string().required().email().messages({
        'string.email': 'Email inválido',
        'any.required': 'Email é obrigatório'
    }),
    senha: Joi.string().required().min(6).messages({
        'string.min': 'Senha deve ter no mínimo 6 caracteres',
        'any.required': 'Senha é obrigatória'
    }),
    telefone: Joi.string().required(),
    endereco: Joi.object({
        rua: Joi.string(),
        numero: Joi.string(),
        bairro: Joi.string(),
        cidade: Joi.string(),
        estado: Joi.string(),
        cep: Joi.string()
    }).optional()
});

// Schema para atualizar empresa
const empresaUpdateSchema = Joi.object({
    nome: Joi.string().min(3),
    telefone: Joi.string(),
    endereco: Joi.object({
        rua: Joi.string(),
        numero: Joi.string(),
        bairro: Joi.string(),
        cidade: Joi.string(),
        estado: Joi.string(),
        cep: Joi.string()
    })
});

// Schema para login
const loginSchema = Joi.object({
    email: Joi.string().required().email(),
    senha: Joi.string().required()
});

export default class EmpresaController {
    
    // BUSCAR empresa por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            
            const empresa = await Empresa.findById(id);
            
            if (!empresa) {
                return res.status(404).json({ 
                    message: 'Empresa não encontrada' 
                });
            }
            
            return res.status(200).json(empresa);
            
        } catch (error) {
            console.error('Erro ao buscar empresa:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar empresa',
                erro: error.message 
            });
        }
    }

    // ATUALIZAR empresa
    static async update(req, res) {
        try {
            const { id } = req.params;
            
            const { error, value } = empresaUpdateSchema.validate(req.body, {
                abortEarly: false
            });
            
            if (error) {
                return res.status(422).json({ 
                    message: 'Dados inválidos',
                    erros: error.details.map(err => err.message)
                });
            }
            
            const empresa = await Empresa.findByIdAndUpdate(
                id,
                value,
                { new: true, runValidators: true }
            );
            
            if (!empresa) {
                return res.status(404).json({ 
                    message: 'Empresa não encontrada' 
                });
            }
            
            return res.status(200).json({ 
                message: 'Empresa atualizada com sucesso!',
                empresa 
            });
            
        } catch (error) {
            console.error('Erro ao atualizar empresa:', error);
            return res.status(500).json({ 
                message: 'Erro ao atualizar empresa',
                erro: error.message 
            });
        }
    }

    // DASHBOARD da empresa
    static async dashboard(req, res) {
        try {
            const { id } = req.params;
            
            const empresa = await Empresa.findById(id);
            if (!empresa) {
                return res.status(404).json({ 
                    message: 'Empresa não encontrada' 
                });
            }
            
            // Estatísticas
            const totalCarros = await Carro.countDocuments({ empresa: id });
            const carrosDisponiveis = await Carro.countDocuments({ empresa: id, status: 'disponivel' });
            const carrosEmUso = await Carro.countDocuments({ empresa: id, status: 'em_uso' });
            const carrosManutencao = await Carro.countDocuments({ empresa: id, status: 'manutencao' });
            const totalFuncionarios = await Funcionario.countDocuments({ empresa: id });
            const funcionariosAtivos = await Funcionario.countDocuments({ empresa: id, ativo: true });
            
            return res.status(200).json({
                empresa: {
                    nome: empresa.nome,
                    cnpj: empresa.cnpj,
                    tipoPlano: empresa.tipoPlano
                },
                estatisticas: {
                    carros: {
                        total: totalCarros,
                        disponiveis: carrosDisponiveis,
                        emUso: carrosEmUso,
                        manutencao: carrosManutencao
                    },
                    funcionarios: {
                        ativos: funcionariosAtivos
                    }
                }
            });
            
        } catch (error) {
            console.error('Erro ao buscar dashboard:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar dashboard',
                erro: error.message 
            });
        }
    }
}
