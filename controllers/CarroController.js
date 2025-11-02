import Carro from "../models/Carro.js";
import Empresa from "../models/Empresa.js";
import Funcionario from "../models/Funcionario.js";
import Joi from 'joi';

// Schema para criar carro
const carroCreateSchema = Joi.object({
    placa: Joi.string()
        .required()
        .pattern(/^[A-Z]{3}-?\d{1}[A-Z0-9]{1}\d{2}$/)
        .messages({
            'string.pattern.base': 'Placa inválida. Use o formato ABC-1234 ou ABC1D23',
            'any.required': 'Placa é obrigatória'
        }),
    modelo: Joi.string().required().min(2).messages({
        'string.min': 'Modelo deve ter no mínimo 2 caracteres',
        'any.required': 'Modelo é obrigatório'
    }),
    marca: Joi.string().required().min(2).messages({
        'string.min': 'Marca deve ter no mínimo 2 caracteres',
        'any.required': 'Marca é obrigatória'
    }),
    ano: Joi.number()
        .required()
        .min(1900)
        .max(new Date().getFullYear() + 1)
        .messages({
            'number.min': 'Ano deve ser maior que 1900',
            'number.max': `Ano não pode ser maior que ${new Date().getFullYear() + 1}`,
            'any.required': 'Ano é obrigatório'
        }),
    cor: Joi.string().optional(),
    chassi: Joi.string().optional(),
    empresa: Joi.string().required().messages({
        'any.required': 'Empresa é obrigatória'
    }),
    kmTotal: Joi.number().optional().min(0).default(0),
    proxManutencao: Joi.date().optional()
});

// Schema para atualizar carro (todos campos opcionais)
const carroUpdateSchema = Joi.object({
    placa: Joi.string()
        .pattern(/^[A-Z]{3}-?\d{1}[A-Z0-9]{1}\d{2}$/)
        .messages({
            'string.pattern.base': 'Placa inválida'
        }),
    modelo: Joi.string().min(2),
    marca: Joi.string().min(2),
    tipoVeiculo: Joi.string(),
    tipoCombustivel: Joi.string(),
    ano: Joi.number().min(1900).max(new Date().getFullYear() + 1),
    cor: Joi.string(),
    chassi: Joi.string(),
    kmTotal: Joi.number().min(0),
    proxManutencao: Joi.date(),
    status: Joi.string().valid('disponivel', 'em_uso', 'manutencao', 'inativo')
});

export default class CarroController {
    
    // CREATE - Criar novo carro
    static async create(req, res) {
        try {
            // Converte placa para maiúscula antes de validar
            if (req.body.placa) {
                req.body.placa = req.body.placa.toUpperCase().replace(/\s/g, '');
            }
            
            // Valida dados
            const { error, value } = carroCreateSchema.validate(req.body, {
                abortEarly: false
            });
            
            if (error) {
                return res.status(422).json({ 
                    message: 'Dados inválidos',
                    erros: error.details.map(err => err.message)
                });
            }
            
            // Verifica se empresa existe
            const empresaExiste = await Empresa.findById(value.empresa);
            if (!empresaExiste) {
                return res.status(404).json({ 
                    message: 'Empresa não encontrada' 
                });
            }
            
            // Verifica se placa já existe
            const placaExiste = await Carro.findOne({ placa: value.placa });
            if (placaExiste) {
                return res.status(422).json({ 
                    message: 'Placa já cadastrada no sistema' 
                });
            }
            
            // Cria o carro
            const carro = new Carro({
                ...value,
                status: 'disponivel'
            });
            
            await carro.save();
            
            return res.status(201).json({ 
                message: 'Carro cadastrado com sucesso!',
                carro 
            });
            
        } catch (error) {
            console.error('Erro ao cadastrar carro:', error);
            return res.status(500).json({ 
                message: 'Erro ao cadastrar carro',
                erro: error.message 
            });
        }
    }

    // READ - Listar todos os carros
    static async getAll(req, res) {
        try {
            const { empresaId, status } = req.query;
            
            // Monta filtro dinâmico
            const filtro = {};
            if (empresaId) filtro.empresa = empresaId;
            if (status) filtro.status = status;
            
            const carros = await Carro.find(filtro)
                .populate('empresa', 'nome cnpj email')
                .populate('funcionarioAtual', 'nome cpf email telefone')
                .sort({ createdAt: -1 });
            
            return res.status(200).json({
                total: carros.length,
                carros
            });
            
        } catch (error) {
            console.error('Erro ao buscar carros:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar carros',
                erro: error.message 
            });
        }
    }

    // READ - Buscar carro por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            
            const carro = await Carro.findById(id)
                .populate('empresa', 'nome cnpj email telefone endereco')
                .populate('funcionarioAtual', 'nome cpf email telefone cnh');
            
            if (!carro) {
                return res.status(404).json({ 
                    message: 'Carro não encontrado' 
                });
            }
            
            return res.status(200).json(carro);
            
        } catch (error) {
            console.error('Erro ao buscar carro:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar carro',
                erro: error.message 
            });
        }
    }

    // UPDATE - Atualizar carro
    static async update(req, res) {
        try {
            const { id } = req.params;
            
            // Converte placa para maiúscula se fornecida
            if (req.body.placa) {
                req.body.placa = req.body.placa.toUpperCase().replace(/\s/g, '');
            }
            
            // Valida dados
            const { error, value } = carroUpdateSchema.validate(req.body, {
                abortEarly: false
            });
            
            if (error) {
                return res.status(422).json({ 
                    message: 'Dados inválidos',
                    erros: error.details.map(err => err.message)
                });
            }
            
            // Verifica se placa já existe em outro carro
            if (value.placa) {
                const placaExiste = await Carro.findOne({ 
                    placa: value.placa,
                    _id: { $ne: id }
                });
                if (placaExiste) {
                    return res.status(422).json({ 
                        message: 'Placa já cadastrada em outro veículo' 
                    });
                }
            }
            
            const carro = await Carro.findByIdAndUpdate(
                id,
                value,
                { new: true, runValidators: true }
            ).populate('empresa', 'nome cnpj')
             .populate('funcionarioAtual', 'nome cpf');
            
            if (!carro) {
                return res.status(404).json({ 
                    message: 'Carro não encontrado' 
                });
            }
            
            return res.status(200).json({ 
                message: 'Carro atualizado com sucesso!',
                carro 
            });
            
        } catch (error) {
            console.error('Erro ao atualizar carro:', error);
            return res.status(500).json({ 
                message: 'Erro ao atualizar carro',
                erro: error.message 
            });
        }
    }

    // DELETE - Excluir carro
    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            const carro = await Carro.findById(id);
            
            if (!carro) {
                return res.status(404).json({ 
                    message: 'Carro não encontrado' 
                });
            }
            
            // Verifica se tem funcionário vinculado
            if (carro.funcionarioAtual) {
                return res.status(422).json({ 
                    message: 'Não é possível excluir um carro com funcionário vinculado. Remova o vínculo primeiro.' 
                });
            }
            
            await Carro.findByIdAndDelete(id);
            
            return res.status(200).json({ 
                message: 'Carro excluído com sucesso!' 
            });
            
        } catch (error) {
            console.error('Erro ao excluir carro:', error);
            return res.status(500).json({ 
                message: 'Erro ao excluir carro',
                erro: error.message 
            });
        }
    }

    // VINCULAR funcionário ao carro
    static async vincularFuncionario(req, res) {
        try {
            const { carroId } = req.params;
            const { funcionarioId } = req.body;
            
            if (!funcionarioId) {
                return res.status(422).json({ 
                    message: 'ID do funcionário é obrigatório' 
                });
            }
            
            // Busca carro
            const carro = await Carro.findById(carroId);
            if (!carro) {
                return res.status(404).json({ 
                    message: 'Carro não encontrado' 
                });
            }
            
            // Verifica se carro já tem funcionário
            if (carro.funcionarioAtual) {
                return res.status(422).json({ 
                    message: 'Este carro já está vinculado a um funcionário. Remova o vínculo atual primeiro.' 
                });
            }
            
            // Busca funcionário
            const funcionario = await Funcionario.findById(funcionarioId);
            if (!funcionario) {
                return res.status(404).json({ 
                    message: 'Funcionário não encontrado' 
                });
            }
            
            // Verifica se funcionário já tem carro
            if (funcionario.carroAtual) {
                return res.status(422).json({ 
                    message: 'Este funcionário já está vinculado a outro carro' 
                });
            }
            
            // Verifica se pertencem à mesma empresa
            if (carro.empresa.toString() !== funcionario.empresa.toString()) {
                return res.status(422).json({ 
                    message: 'Funcionário e carro devem pertencer à mesma empresa' 
                });
            }
            
            // Vincula (atualiza ambos)
            carro.funcionarioAtual = funcionarioId;
            carro.status = 'em_uso';
            await carro.save();
            
            funcionario.carroAtual = carroId;
            await funcionario.save();
            
            return res.status(200).json({ 
                message: 'Funcionário vinculado ao carro com sucesso!',
                carro: await Carro.findById(carroId)
                    .populate('funcionarioAtual', 'nome cpf email')
            });
            
        } catch (error) {
            console.error('Erro ao vincular funcionário:', error);
            return res.status(500).json({ 
                message: 'Erro ao vincular funcionário',
                erro: error.message 
            });
        }
    }

    // DESVINCULAR funcionário do carro
    static async desvincularFuncionario(req, res) {
        try {
            const { carroId } = req.params;
            
            const carro = await Carro.findById(carroId);
            if (!carro) {
                return res.status(404).json({ 
                    message: 'Carro não encontrado' 
                });
            }
            
            if (!carro.funcionarioAtual) {
                return res.status(422).json({ 
                    message: 'Este carro não possui funcionário vinculado' 
                });
            }
            
            // Desvincula (atualiza ambos)
            const funcionarioId = carro.funcionarioAtual;
            
            carro.funcionarioAtual = null;
            carro.status = 'disponivel';
            await carro.save();
            
            await Funcionario.findByIdAndUpdate(funcionarioId, {
                carroAtual: null
            });
            
            return res.status(200).json({ 
                message: 'Funcionário desvinculado do carro com sucesso!',
                carro
            });
            
        } catch (error) {
            console.error('Erro ao desvincular funcionário:', error);
            return res.status(500).json({ 
                message: 'Erro ao desvincular funcionário',
                erro: error.message 
            });
        }
    }

    // ATUALIZAR dados OBD em tempo real
    static async atualizarDadosOBD(req, res) {
        try {
            const { carroId } = req.params;
            const dadosOBD = req.body;
            
            const carro = await Carro.findByIdAndUpdate(
                carroId,
                {
                    dadosOBD: {
                        ...dadosOBD,
                        ultimaAtualizacao: new Date()
                    }
                },
                { new: true }
            );
            
            if (!carro) {
                return res.status(404).json({ 
                    message: 'Carro não encontrado' 
                });
            }
            
            return res.status(200).json({ 
                message: 'Dados OBD atualizados',
                dadosOBD: carro.dadosOBD
            });
            
        } catch (error) {
            console.error('Erro ao atualizar dados OBD:', error);
            return res.status(500).json({ 
                message: 'Erro ao atualizar dados OBD',
                erro: error.message 
            });
        }
    }
}
