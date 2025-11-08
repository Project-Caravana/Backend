import Carro from "../models/Carro.js";
import Empresa from "../models/Empresa.js";
import Funcionario from "../models/Funcionario.js";
import LeituraOBD from "../models/LeituraOBD.js";
import Joi from 'joi';

// Schema para criar carro (empresa agora é opcional)
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
    empresa: Joi.string().optional(), // Agora é opcional
    kmTotal: Joi.number().optional().min(0).default(0),
    proxManutencao: Joi.date().optional(),
    tipoVeiculo: Joi.string().optional(),
    tipoCombustivel: Joi.string().optional()
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

// Schemas para query de histórico e alertas
const obdQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    dataInicio: Joi.date().iso().optional().messages({
        'date.format': 'dataInicio deve ser uma data ISO 8601 válida'
    }),
    dataFim: Joi.date().iso().optional().messages({
        'date.format': 'dataFim deve ser uma data ISO 8601 válida'
    }),
});

const alertasQuerySchema = obdQuerySchema.keys({
    severidade: Joi.string().valid('critica', 'alta', 'media', 'baixa').optional(),
    tipo: Joi.string().optional()
});

export default class CarroController {
    
    // CREATE - Criar novo carro
    static async create(req, res) {
        try {
            // Converte placa para maiúscula antes de validar
            if (req.body.placa) {
                req.body.placa = req.body.placa.toUpperCase().replace(/\s/g, '');
            }
            
            // Se empresa não foi fornecida, usa a empresa do usuário logado
            if (!req.body.empresa && req.empresa) {
                req.body.empresa = req.empresa._id.toString();
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
            
            // Verifica se empresa foi definida
            if (!value.empresa) {
                return res.status(422).json({ 
                    message: 'Empresa não identificada. Faça login novamente.' 
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
            
            // Popula empresa para retornar dados completos
            await carro.populate('empresa', 'nome cnpj');
            
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
            
            // Se empresaId for passado, usa ele. Senão, filtra pela empresa do usuário logado
            if (empresaId) {
                filtro.empresa = empresaId;
            } else if (req.empresa) {
                filtro.empresa = req.empresa._id;
            }
            
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
            
            // Verifica se o carro pertence à empresa do usuário
            if (req.empresa && carro.empresa._id.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para acessar este carro' 
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
            
            // Busca o carro primeiro para verificar permissões
            const carroExistente = await Carro.findById(id);
            if (!carroExistente) {
                return res.status(404).json({ 
                    message: 'Carro não encontrado' 
                });
            }
            
            // Verifica se o carro pertence à empresa do usuário
            if (req.empresa && carroExistente.empresa.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para editar este carro' 
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
            
            // Verifica se o carro pertence à empresa do usuário
            if (req.empresa && carro.empresa.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para excluir este carro' 
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
            
            // Verifica permissão
            if (req.empresa && carro.empresa.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para vincular funcionários a este carro' 
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
            
            // Verifica permissão
            if (req.empresa && carro.empresa.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ 
                    message: 'Você não tem permissão para desvincular funcionários deste carro' 
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
            
            // 1. Validar e buscar o carro
            const carro = await Carro.findById(carroId);
            if (!carro) {
                return res.status(404).json({ 
                    message: 'Carro não encontrado' 
                });
            }
            
            // 2. CRIAÇÃO DO HISTÓRICO (LeituraOBD)
            // Os dadosOBD do body do request correspondem ao campo 'dados' no modelo LeituraOBD.
            // O modelo LeituraOBD.js tem um pré-save hook para gerar alertas se necessário.
            const novaLeitura = new LeituraOBD({
                carro: carroId,
                empresa: carro.empresa,
                // Assume que se o carro está em uso, o funcionárioAtual é quem está dirigindo
                funcionario: carro.funcionarioAtual, 
                dados: dadosOBD,
            });

            await novaLeitura.save(); // Salva o registro histórico
            
            // 3. ATUALIZAÇÃO DOS DADOS EM TEMPO REAL (Carro)
            // Atualiza o documento Carro com os dados mais recentes para tempo real
            const carroAtualizado = await Carro.findByIdAndUpdate(
                carroId,
                {
                    dadosOBD: {
                        ...dadosOBD,
                        ultimaAtualizacao: novaLeitura.createdAt // Usa o timestamp da novaLeitura
                    }
                },
                { new: true }
            );
            
            // 4. Emite evento via Socket.IO (para front-end)
            if (req.io) {
                req.io.emit(`carro:${carroId}:obd`, carroAtualizado.dadosOBD);
            }
            
            return res.status(200).json({ 
                message: 'Dados OBD atualizados e histórico salvo com sucesso',
                dadosOBD: carroAtualizado.dadosOBD,
                historicoId: novaLeitura._id
            });
            
        } catch (error) {
            console.error('Erro ao atualizar dados OBD e salvar histórico:', error);
            return res.status(500).json({ 
                message: 'Erro ao atualizar dados OBD e salvar histórico',
                erro: error.message 
            });
        }
    }

    static async buscarHistoricoOBD(req, res) {
        try {
            const { carroId } = req.params;
            const { error: queryError, value: query } = obdQuerySchema.validate(req.query);
            
            if (queryError) {
                return res.status(422).json({ 
                    message: 'Parâmetros de busca inválidos',
                    erros: queryError.details.map(err => err.message)
                });
            }

            // 1. Verificar Carro e Autorização
            const carro = await Carro.findById(carroId);
            if (!carro) {
                return res.status(404).json({ message: 'Carro não encontrado' });
            }

            // Autorização: O carro deve pertencer à empresa do usuário logado OU ser o carro do funcionário logado
            if (req.empresa && carro.empresa.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ message: 'Você não tem permissão para acessar o histórico deste carro' });
            }
            
            if (req.funcionario && (!req.funcionario.carroAtual || req.funcionario.carroAtual.toString() !== carroId)) {
                return res.status(403).json({ message: 'Você não tem permissão para acessar o histórico deste carro' });
            }


            // 2. Montar Filtro de Busca
            const filtro = { carro: carroId };
            
            // Filtragem por data (createdAt)
            const dataFiltro = {};
            if (query.dataInicio) {
                dataFiltro.$gte = new Date(query.dataInicio);
            }
            if (query.dataFim) {
                // Adiciona 1 dia para incluir o dia final completo na busca
                const endOfDay = new Date(query.dataFim);
                endOfDay.setDate(endOfDay.getDate() + 1);
                dataFiltro.$lt = endOfDay;
            }

            if (Object.keys(dataFiltro).length > 0) {
                filtro.createdAt = dataFiltro;
            }

            // 3. Executar Busca com Paginação
            const { page, limit } = query;
            const skip = (page - 1) * limit;

            const [leituras, total] = await Promise.all([
                LeituraOBD.find(filtro)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('funcionario', 'nome cpf') // Popula o funcionário que estava dirigindo (se houver)
                    .select('-empresa'), // Remove o campo empresa
                LeituraOBD.countDocuments(filtro)
            ]);
            
            const totalPaginas = Math.ceil(total / limit);

            return res.status(200).json({
                message: 'Histórico OBD retornado com sucesso',
                carro: carro.placa,
                total,
                page,
                limit,
                totalPaginas,
                leituras
            });

        } catch (error) {
            console.error('Erro ao buscar histórico OBD:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar histórico OBD',
                erro: error.message 
            });
        }
    }
    
    // NOVO: READ - Buscar alertas OBD (códigos de falha e alertas do sistema)
    static async buscarAlertas(req, res) {
        try {
            const { carroId } = req.params;
            const { error: queryError, value: query } = alertasQuerySchema.validate(req.query);
            
            if (queryError) {
                return res.status(422).json({ 
                    message: 'Parâmetros de busca inválidos',
                    erros: queryError.details.map(err => err.message)
                });
            }

            // 1. Verificar Carro e Autorização (mesma lógica do histórico)
            const carro = await Carro.findById(carroId);
            if (!carro) {
                return res.status(404).json({ message: 'Carro não encontrado' });
            }

            // Autorização
            if (req.empresa && carro.empresa.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ message: 'Você não tem permissão para acessar os alertas deste carro' });
            }
            
            if (req.funcionario && (!req.funcionario.carroAtual || req.funcionario.carroAtual.toString() !== carroId)) {
                return res.status(403).json({ message: 'Você não tem permissão para acessar os alertas deste carro' });
            }
            
            const { page, limit } = query;
            const skip = (page - 1) * limit;
            
            // 2. Montar Filtro de Busca para a LeituraOBD
            const filtro = { 
                carro: carroId,
                // Filtra documentos que tenham códigos de falha (DTC) OU alertas do sistema
                $or: [
                    { 'dados.dtcCount': { $gt: 0 } }, // Códigos de falha
                    { 'alertas.0': { $exists: true } } // Alertas do sistema (velocidade alta, temp. alta, etc.)
                ]
            };
            
            // Filtragem por data (createdAt)
            const dataFiltro = {};
            if (query.dataInicio) {
                dataFiltro.$gte = new Date(query.dataInicio);
            }
            if (query.dataFim) {
                const endOfDay = new Date(query.dataFim);
                endOfDay.setDate(endOfDay.getDate() + 1);
                dataFiltro.$lt = endOfDay;
            }

            if (Object.keys(dataFiltro).length > 0) {
                filtro.createdAt = dataFiltro;
            }
            
            // 3. Montar Pipeline de Agregação
            const pipeline = [
                // 1. Filtro inicial de documentos (carro e data)
                { $match: filtro },
                
                // 2. Desestruturar a array 'alertas' (incluindo documentos vazios/nulos)
                { $unwind: { path: '$alertas', preserveNullAndEmptyArrays: true } },
                
                // 3. Criar documentos de alerta individuais (Alertas do Sistema OU Falhas DTC)
                { $project: {
                    _id: 0,
                    timestamp: '$createdAt',
                    funcionario: '$funcionario',
                    carro: '$carro',
                    // Cria um objeto de alerta unificado
                    alerta: {
                        $cond: {
                            if: '$alertas', // É um Alerta do Sistema
                            then: {
                                tipo: '$alertas.tipo',
                                mensagem: '$alertas.mensagem',
                                severidade: '$alertas.severidade',
                                isDTC: false
                            },
                            else: { // Verifica se é uma Falha DTC (dados.dtcCount > 0)
                                $cond: {
                                    if: { $gt: ['$dados.dtcCount', 0] },
                                    then: {
                                        tipo: 'falha_motor_dtc',
                                        mensagem: {$concat: ["Falha DTC(s) detectada(s): ", {$toString: "$dados.dtcCount"}, " falha(s)."]},
                                        severidade: 'alta',
                                        falhasDTC: '$dados.falhas', // Códigos de falha
                                        isDTC: true
                                    },
                                    else: '$$REMOVE' // Remove leituras sem alertas ou DTCs
                                }
                            }
                        }
                    }
                }},

                // 4. Filtrar por Severidade e Tipo, se fornecidos na query
                ...(query.severidade ? [{ $match: { 'alerta.severidade': query.severidade } }] : []),
                ...(query.tipo ? [{ $match: { 'alerta.tipo': query.tipo } }] : []),
                
                // 5. Ordenar, Pular e Limitar (Paginação)
                { $sort: { timestamp: -1 } },
                // Contagem total para paginação seria feita com $facet, mas para simplicidade, retorna-se apenas os resultados paginados
                { $skip: skip },
                { $limit: limit },
            ];

            const alertasPaginados = await LeituraOBD.aggregate(pipeline);
            
            // Popula o campo 'funcionario' para retornar o nome/cpf de quem estava dirigindo na leitura
            await Funcionario.populate(alertasPaginados, { 
                path: 'funcionario', 
                select: 'nome cpf' 
            });

            return res.status(200).json({
                message: 'Alertas OBD retornados com sucesso',
                carro: carro.placa,
                page,
                limit,
                alertas: alertasPaginados
            });

        } catch (error) {
            console.error('Erro ao buscar alertas OBD:', error);
            return res.status(500).json({ 
                message: 'Erro ao buscar alertas OBD',
                erro: error.message 
            });
        }
    }
}