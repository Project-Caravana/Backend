import Funcionario from "../models/Funcionario.js";
import Empresa from "../models/Empresa.js";
import Joi from 'joi';
import * as argon2 from "argon2";

// Schema para criar funcionário
const funcionarioCreateSchema = Joi.object({
    nome: Joi.string().required().min(3).messages({
        'string.min': 'Nome deve ter no mínimo 3 caracteres',
        'any.required': 'Nome é obrigatório'
    }),
    cpf: Joi.string().required().length(11).messages({
        'string.length': 'CPF deve ter 11 dígitos',
        'any.required': 'CPF é obrigatório'
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
    empresa: Joi.string().required().messages({
        'any.required': 'Empresa é obrigatória'
    }),
    cnh: Joi.object({
        numero: Joi.string(),
        categoria: Joi.string(),
        validade: Joi.date()
    }).optional(),
    cargo: Joi.string().optional()
});

export default class FuncionarioController {
    
    // CREATE - Criar funcionário
    static async addFuncionarioToEmpresa(req, res) {
        try {
            const { nome, cpf, email, senha, telefone, empresaId, perfil } = req.body;
            
            // Verifica se empresa existe
            const empresa = await Empresa.findById(empresaId);
            if (!empresa) {
                return res.status(404).json({ 
                    message: 'Empresa não encontrada' 
                });
            }
            
            // Verifica se CPF já existe
            const cpfExiste = await Funcionario.findOne({ cpf });
            if (cpfExiste) {
                return res.status(422).json({ 
                    message: 'CPF já cadastrado' 
                });
            }
            
            // Verifica se email já existe
            const emailExiste = await Funcionario.findOne({ email });
            if (emailExiste) {
                return res.status(422).json({ 
                    message: 'Email já cadastrado' 
                });
            }
            
            // Hash da senha
            const senhaHash = await argon2.hash(senha);
            
            // Cria o novo funcionário
            const funcionario = new Funcionario({
                nome, 
                cpf, 
                email, 
                senha: senhaHash,
                telefone, 
                empresa: empresaId,
                perfil,
                ativo: true
            });
            await funcionario.save();
            
            // Adiciona ao array de funcionários da empresa
            empresa.funcionarios.push(funcionario._id);
            await empresa.save();
            
            return res.status(201).json({ 
                message: 'Funcionário adicionado com sucesso!',
                funcionario: {
                    id: funcionario._id,
                    nome: funcionario.nome,
                    email: funcionario.email
                }
            });
            
        } catch (error) {
            console.error('Erro ao adicionar funcionário:', error);
            return res.status(500).json({ 
                message: 'Erro ao adicionar funcionário',
                erro: error.message 
            });
        }
    }

    // READ - Listar funcionários
    static async getAll(req, res) {
        try {
            const { empresaId } = req.query;
            
            const filtro = empresaId ? { empresa: empresaId } : {};
            
            const funcionarios = await Funcionario.find(filtro)
                .populate('empresa', 'nome cnpj')
                .populate('carroAtual', 'placa modelo marca')
                .sort({ createdAt: -1 });
            
            return res.status(200).json({
                total: funcionarios.length,
                funcionarios
            });
            
        } catch (error) {
            console.error('Erro ao buscar funcionários:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar funcionários',
                erro: error.message 
            });
        }
    }

    // READ - Buscar funcionário por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            
            const funcionario = await Funcionario.findById(id)
                .populate('empresa', 'nome cnpj email telefone')
                .populate('carroAtual', 'placa modelo marca ano cor');
            
            if (!funcionario) {
                return res.status(404).json({ 
                    message: 'Funcionário não encontrado' 
                });
            }
            
            return res.status(200).json(funcionario);
            
        } catch (error) {
            console.error('Erro ao buscar funcionário:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar funcionário',
                erro: error.message 
            });
        }
    }

    // DELETE - Excluir funcionário
    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            const funcionario = await Funcionario.findById(id);
            
            if (!funcionario) {
                return res.status(404).json({ 
                    message: 'Funcionário não encontrado' 
                });
            }
            
            // Verifica se tem carro vinculado
            if (funcionario.carroAtual) {
                return res.status(422).json({ 
                    message: 'Não é possível excluir um funcionário com carro vinculado. Remova o vínculo primeiro.' 
                });
            }
            
            await Funcionario.findByIdAndDelete(id);
            
            return res.status(200).json({ 
                message: 'Funcionário excluído com sucesso!' 
            });
            
        } catch (error) {
            console.error('Erro ao excluir funcionário:', error);
            return res.status(500).json({ 
                message: 'Erro ao excluir funcionário',
                erro: error.message 
            });
        }
    }

    // MEU CARRO - Funcionário visualiza seu carro
    static async meuCarro(req, res) {
        try {
            const { id } = req.params;
            
            const funcionario = await Funcionario.findById(id)
                .populate({
                    path: 'carroAtual',
                    populate: { path: 'empresa', select: 'nome' }
                });
            
            if (!funcionario) {
                return res.status(404).json({ 
                    message: 'Funcionário não encontrado' 
                });
            }
            
            if (!funcionario.carroAtual) {
                return res.status(404).json({ 
                    message: 'Você não possui carro vinculado no momento' 
                });
            }
            
            return res.status(200).json(funcionario.carroAtual);
            
        } catch (error) {
            console.error('Erro ao buscar carro:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar carro',
                erro: error.message 
            });
        }
    }
}