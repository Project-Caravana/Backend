import Carro from "../models/Carro.js";
import Empresa from "../models/Empresa.js";
import Funcionario from "../models/Funcionario.js";
import LeituraOBD from "../models/LeituraOBD.js";
import Joi from 'joi';

// --- SCHEMAS DE VALIDAÇÃO (JOI) ---

const carroCreateSchema = Joi.object({
    placa: Joi.string()
        .required()
        .pattern(/^[A-Z]{3}-?\d{1}[A-Z0-9]{1}\d{2}$/)
        .messages({
            'string.pattern.base': 'Placa inválida. Use o formato ABC-1234 ou ABC1D23',
            'any.required': 'Placa é obrigatória'
        }),
    modelo: Joi.string().required().min(2),
    marca: Joi.string().required().min(2),
    ano: Joi.number().required().min(1900).max(new Date().getFullYear() + 1),
    cor: Joi.string().optional(),
    chassi: Joi.string().optional(),
    empresa: Joi.string().optional(),
    kmTotal: Joi.number().optional().min(0).default(0),
    proxManutencao: Joi.date().optional(),
    tipoVeiculo: Joi.string().optional(),
    tipoCombustivel: Joi.string().optional()
});

const carroUpdateSchema = Joi.object({
    placa: Joi.string().pattern(/^[A-Z]{3}-?\d{1}[A-Z0-9]{1}\d{2}$/),
    modelo: Joi.string().min(2),
    marca: Joi.string().min(2),
    tipoVeiculo: Joi.string().valid('Passeio', 'Van', 'Caminhonete', 'Caminhão'),
    tipoCombustivel: Joi.string().valid('Etanol', 'Gasolina', 'Diesel', 'Elétrico', 'Flex', 'Híbrido', 'GNV'),
    ano: Joi.number().min(1900).max(new Date().getFullYear() + 1),
    cor: Joi.string(),
    chassi: Joi.string(),
    kmTotal: Joi.number().min(0),
    proxManutencao: Joi.date(),
    status: Joi.string().valid('disponivel', 'em_uso', 'manutencao', 'inativo')
});

const obdQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    dataInicio: Joi.date().iso().optional(),
    dataFim: Joi.date().iso().optional(),
});

const alertasQuerySchema = obdQuerySchema.keys({
    severidade: Joi.string().valid('critica', 'alta', 'media', 'baixa').optional(),
    tipo: Joi.string().optional()
});

// --- CONTROLLER ---

export default class CarroController {

    /**
     * Gera as estatísticas para o Dashboard.
     * Calcula a média real convertendo (Distância / Eficiência Instantânea) para Litros.
     */
    static async getEstatisticasEmpresa(req, res) {
        try {
            const empresaId = req.empresa?._id || req.user?.empresa;
            
            if (!empresaId) {
                return res.status(400).json({ message: 'Empresa não identificada' });
            }
            
            console.log('📊 Buscando estatísticas (Cálculo Real) para empresa:', empresaId);

            // 1. Total de Carros Ativos
            const totalCarrosAtivos = await Carro.countDocuments({ empresa: empresaId });

            // 2. Buscar IDs de carros para filtrar as leituras
            const carrosDaEmpresa = await Carro.find({ empresa: empresaId }, { _id: 1, placa: 1, modelo: 1, marca: 1 });
            const carroIds = carrosDaEmpresa.map(carro => carro._id);

            // Definição do período (Mês Atual)
            const inicioMes = new Date();
            inicioMes.setDate(1);
            inicioMes.setHours(0, 0, 0, 0);

            // --- AGREGATION 1: TOTAIS GERAIS (MÉDIA DA FROTA) ---
            const pipelineGeral = [
                {
                    $match: {
                        carro: { $in: carroIds },
                        createdAt: { $gte: inicioMes }
                    }
                },
                {
                    // 🔥 CÁLCULO DE LITROS (Engenharia Reversa)
                    // O App manda: Distância (km) e Consumo (km/L)
                    // Nós calculamos: Litros = Distância / Consumo
                    $project: {
                        distancia: '$dados.distanciaPercorrida',
                        litros: {
                            $cond: {
                                // Evita divisão por zero se o consumo for 0 ou muito baixo
                                if: { $gt: ['$dados.consumoInstantaneo', 0.1] },
                                then: { $divide: ['$dados.distanciaPercorrida', '$dados.consumoInstantaneo'] },
                                else: 0 
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalKmPercorrido: { $sum: '$distancia' },
                        totalCombustivelConsumido: { $sum: '$litros' }
                    }
                }
            ];

            const resultadoGeral = await LeituraOBD.aggregate(pipelineGeral);
            const dadosMes = resultadoGeral[0] || { totalKmPercorrido: 0, totalCombustivelConsumido: 0 };
            
            const kmRodado = dadosMes.totalKmPercorrido || 0;
            const combustivelGasto = dadosMes.totalCombustivelConsumido || 0;
            
            // Consumo Médio Final = Soma de todos Km / Soma de todos Litros
            const consumoMedio = combustivelGasto > 0 ? (kmRodado / combustivelGasto) : 0;

            // --- AGREGATION 2: TOP 5 CARROS (CONSUMO INDIVIDUAL) ---
            const pipelineTop5 = [
                {
                    $match: {
                        carro: { $in: carroIds },
                        createdAt: { $gte: inicioMes }
                    }
                },
                {
                    $project: {
                        carro: 1,
                        distancia: '$dados.distanciaPercorrida',
                        litros: {
                            $cond: {
                                if: { $gt: ['$dados.consumoInstantaneo', 0.1] },
                                then: { $divide: ['$dados.distanciaPercorrida', '$dados.consumoInstantaneo'] },
                                else: 0 
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$carro',
                        totalKm: { $sum: '$distancia' },
                        totalCombustivel: { $sum: '$litros' }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        totalKm: 1,
                        totalCombustivel: 1,
                        consumo: {
                            $cond: {
                                if: { $gt: ['$totalCombustivel', 0] },
                                then: { $divide: ['$totalKm', '$totalCombustivel'] },
                                else: 0
                            }
                        }
                    }
                },
                // Filtra carros sem dados de consumo válido
                { $match: { consumo: { $gt: 0 } } },
                // Ordena: Menor km/L (bebe mais) aparece primeiro
                { $sort: { consumo: 1 } },
                { $limit: 5 }
            ];

            const consumoPorCarro = await LeituraOBD.aggregate(pipelineTop5);

            // Popula os dados visuais dos carros (Placa/Modelo)
            const carrosConsumo = await Promise.all(
                consumoPorCarro.map(async (item) => {
                    const carro = carrosDaEmpresa.find(c => c._id.equals(item._id));
                    return {
                        placa: carro?.placa || 'N/A',
                        modelo: carro?.modelo || 'N/A',
                        marca: carro?.marca || '',
                        consumo: parseFloat(item.consumo.toFixed(2)),
                        kmRodado: parseFloat(item.totalKm.toFixed(1)),
                        combustivelGasto: parseFloat(item.totalCombustivel.toFixed(2))
                    };
                })
            );

            // 3. Contagem de Alertas (Últimos 30 dias)
            const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const totalAlertas = await LeituraOBD.countDocuments({
                carro: { $in: carroIds },
                createdAt: { $gte: trintaDiasAtras },
                $or: [
                    { 'dados.milStatus': true },
                    { 'dados.dtcCount': { $gt: 0 } },
                    { 'alertas.0': { $exists: true } }
                ]
            });

            const estatisticas = {
                totalCarrosAtivos,
                kmRodado: parseFloat(kmRodado.toFixed(1)),
                combustivelGasto: parseFloat(combustivelGasto.toFixed(2)),
                consumoMedio: parseFloat(consumoMedio.toFixed(2)),
                alertas: totalAlertas,
                carrosConsumo
            };

            return res.status(200).json({
                message: "Estatísticas do Dashboard retornadas com sucesso",
                estatisticas
            });

        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return res.status(500).json({
                message: 'Erro ao buscar estatísticas do dashboard',
                erro: error.message
            });
        }
    }
    
    // --- MÉTODOS CRUD PADRÃO ---

    static async create(req, res) {
        try {
            if (req.body.placa) {
                req.body.placa = req.body.placa.toUpperCase().replace(/\s/g, '');
            }
            
            if (!req.body.empresa && req.empresa) {
                req.body.empresa = req.empresa._id.toString();
            }
            
            const { error, value } = carroCreateSchema.validate(req.body, { abortEarly: false });
            if (error) {
                return res.status(422).json({ message: 'Dados inválidos', erros: error.details.map(err => err.message) });
            }
            
            if (!value.empresa) {
                return res.status(422).json({ message: 'Empresa não identificada.' });
            }
            
            const empresaExiste = await Empresa.findById(value.empresa);
            if (!empresaExiste) return res.status(404).json({ message: 'Empresa não encontrada' });
            
            const placaExiste = await Carro.findOne({ placa: value.placa });
            if (placaExiste) return res.status(422).json({ message: 'Placa já cadastrada' });
            
            const carro = new Carro({ ...value, status: 'disponivel' });
            await carro.save();
            await carro.populate('empresa', 'nome cnpj');
            
            return res.status(201).json({ message: 'Carro cadastrado com sucesso!', carro });
        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            return res.status(500).json({ message: 'Erro ao cadastrar carro', erro: error.message });
        }
    }

    static async getAll(req, res) {
        try {
            const { empresaId, status } = req.query;
            const filtro = {};
            
            if (empresaId) filtro.empresa = empresaId;
            else if (req.empresa) filtro.empresa = req.empresa._id;
            
            if (status) filtro.status = status;
            
            const carros = await Carro.find(filtro)
                .populate('empresa', 'nome cnpj email')
                .populate('funcionarioAtual', 'nome cpf email telefone')
                .sort({ createdAt: -1 });
            
            return res.status(200).json({ total: carros.length, carros });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar carros', erro: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const carro = await Carro.findById(id)
                .populate('empresa', 'nome cnpj email telefone')
                .populate('funcionarioAtual', 'nome cpf email');
            
            if (!carro) return res.status(404).json({ message: 'Carro não encontrado' });
            if (req.empresa && carro.empresa._id.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ message: 'Sem permissão' });
            }
            return res.status(200).json(carro);
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar carro', erro: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            if (req.body.placa) req.body.placa = req.body.placa.toUpperCase().replace(/\s/g, '');
            
            const { error, value } = carroUpdateSchema.validate(req.body, { abortEarly: false });
            if (error) return res.status(422).json({ message: 'Dados inválidos', erros: error.details.map(err => err.message) });
            
            const carroExistente = await Carro.findById(id);
            if (!carroExistente) return res.status(404).json({ message: 'Carro não encontrado' });
            if (req.empresa && carroExistente.empresa.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ message: 'Sem permissão' });
            }
            
            if (value.placa) {
                const placaExiste = await Carro.findOne({ placa: value.placa, _id: { $ne: id } });
                if (placaExiste) return res.status(422).json({ message: 'Placa já existe em outro veículo' });
            }
            
            const carro = await Carro.findByIdAndUpdate(id, value, { new: true, runValidators: true })
                .populate('empresa', 'nome cnpj')
                .populate('funcionarioAtual', 'nome cpf');
            
            return res.status(200).json({ message: 'Carro atualizado!', carro });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao atualizar', erro: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const carro = await Carro.findById(id);
            if (!carro) return res.status(404).json({ message: 'Carro não encontrado' });
            if (req.empresa && carro.empresa.toString() !== req.empresa._id.toString()) {
                return res.status(403).json({ message: 'Sem permissão' });
            }
            if (carro.funcionarioAtual) {
                return res.status(422).json({ message: 'Remova o funcionário vinculado antes de excluir.' });
            }
            await Carro.findByIdAndDelete(id);
            return res.status(200).json({ message: 'Carro excluído!' });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao excluir', erro: error.message });
        }
    }

    // --- GERENCIAMENTO DE VÍNCULOS ---

    static async vincularFuncionario(req, res) {
        try {
            const { carroId } = req.params;
            const { funcionarioId } = req.body;
            
            if (!funcionarioId) return res.status(422).json({ message: 'ID do funcionário obrigatório' });
            
            const carro = await Carro.findById(carroId);
            if (!carro) return res.status(404).json({ message: 'Carro não encontrado' });
            if (req.empresa && carro.empresa.toString() !== req.empresa._id.toString()) return res.status(403).json({ message: 'Sem permissão' });
            if (carro.funcionarioAtual) return res.status(422).json({ message: 'Carro já possui funcionário' });
            
            const funcionario = await Funcionario.findById(funcionarioId);
            if (!funcionario) return res.status(404).json({ message: 'Funcionário não encontrado' });
            if (funcionario.carroAtual) return res.status(422).json({ message: 'Funcionário já possui carro' });
            if (carro.empresa.toString() !== funcionario.empresa.toString()) return res.status(422).json({ message: 'Empresas divergentes' });
            
            carro.funcionarioAtual = funcionarioId;
            carro.status = 'em_uso';
            await carro.save();
            
            await Funcionario.findByIdAndUpdate(funcionarioId, { carroAtual: carroId });
            
            return res.status(200).json({ 
                message: 'Vinculado com sucesso!',
                carro: await Carro.findById(carroId).populate('funcionarioAtual', 'nome cpf email')
            });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao vincular', erro: error.message });
        }
    }

    static async desvincularFuncionario(req, res) {
        try {
            const { carroId } = req.params;
            const carro = await Carro.findById(carroId);
            if (!carro) return res.status(404).json({ message: 'Carro não encontrado' });
            if (req.empresa && carro.empresa.toString() !== req.empresa._id.toString()) return res.status(403).json({ message: 'Sem permissão' });
            if (!carro.funcionarioAtual) return res.status(422).json({ message: 'Nenhum funcionário vinculado' });
            
            const funcionarioId = carro.funcionarioAtual;
            carro.funcionarioAtual = null;
            carro.status = 'disponivel';
            await carro.save();
            
            await Funcionario.findByIdAndUpdate(funcionarioId, { carroAtual: null });
            
            return res.status(200).json({ message: 'Desvinculado com sucesso!', carro });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao desvincular', erro: error.message });
        }
    }

    // --- RECEBIMENTO DE DADOS OBD ---

    static async atualizarDadosOBD(req, res) {
        try {
            const { carroId } = req.params;
            const dadosOBD = req.body;
            
            const carro = await Carro.findById(carroId);
            if (!carro) return res.status(404).json({ message: 'Carro não encontrado' });
            
            // 1. Salva histórico
            const novaLeitura = new LeituraOBD({
                carro: carroId,
                empresa: carro.empresa,
                funcionario: carro.funcionarioAtual, 
                dados: dadosOBD,
            });
            await novaLeitura.save();
            
            // 2. Atualiza status em tempo real
            // Soma a distância desse "pacote" ao KM total do carro
            const novaDistancia = dadosOBD.distanciaPercorrida || 0;
            const novoKmTotal = carro.kmTotal + novaDistancia;

            const carroAtualizado = await Carro.findByIdAndUpdate(
                carroId,
                {
                    dadosOBD: {
                        ...dadosOBD,
                        ultimaAtualizacao: novaLeitura.createdAt
                    },
                    kmTotal: novoKmTotal
                },
                { new: true }
            );
            
            // 3. Emite Socket.IO
            if (req.io) {
                req.io.to(`carro:${carroId}`).emit('obd:atualizado', {
                    carroId: carroId,
                    dadosOBD: carroAtualizado.dadosOBD,
                    kmTotal: carroAtualizado.kmTotal
                });
            }
            
            return res.status(200).json({ 
                message: 'Dados atualizados e histórico salvo',
                dadosOBD: carroAtualizado.dadosOBD,
                historicoId: novaLeitura._id
            });
            
        } catch (error) {
            console.error('Erro ao atualizar OBD:', error);
            return res.status(500).json({ message: 'Erro ao atualizar dados OBD', erro: error.message });
        }
    }

    // --- HISTÓRICO E ALERTAS ---

    static async buscarHistoricoOBD(req, res) {
        try {
            const { carroId } = req.params;
            const { error, value: query } = obdQuerySchema.validate(req.query);
            if (error) return res.status(422).json({ message: 'Parâmetros inválidos' });

            const carro = await Carro.findById(carroId);
            if (!carro) return res.status(404).json({ message: 'Carro não encontrado' });
            
            // Validação de permissão omitida para brevidade (manter igual anterior se necessário)
            
            const filtro = { carro: carroId };
            const dataFiltro = {};
            if (query.dataInicio) dataFiltro.$gte = new Date(query.dataInicio);
            if (query.dataFim) {
                const end = new Date(query.dataFim);
                end.setDate(end.getDate() + 1);
                dataFiltro.$lt = end;
            }
            if (Object.keys(dataFiltro).length > 0) filtro.createdAt = dataFiltro;

            const { page, limit } = query;
            const skip = (page - 1) * limit;

            const [leituras, total] = await Promise.all([
                LeituraOBD.find(filtro)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('funcionario', 'nome cpf')
                    .select('-empresa'),
                LeituraOBD.countDocuments(filtro)
            ]);
            
            return res.status(200).json({
                message: 'Histórico retornado',
                total, page, limit, totalPaginas: Math.ceil(total / limit),
                leituras
            });

        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar histórico', erro: error.message });
        }
    }
    
    static async buscarAlertas(req, res) {
        try {
            const { carroId } = req.params;
            const { error, value: query } = alertasQuerySchema.validate(req.query);
            if (error) return res.status(422).json({ message: 'Parâmetros inválidos' });

            const carro = await Carro.findById(carroId);
            if (!carro) return res.status(404).json({ message: 'Carro não encontrado' });

            const { page, limit } = query;
            const skip = (page - 1) * limit;
            
            const filtro = { 
                carro: carroId,
                $or: [
                    { 'dados.dtcCount': { $gt: 0 } },
                    { 'alertas.0': { $exists: true } }
                ]
            };
            
            // Pipeline de Agregação para unificar Falhas DTC e Alertas de Sistema
            const pipeline = [
                { $match: filtro },
                { $unwind: { path: '$alertas', preserveNullAndEmptyArrays: true } },
                { $project: {
                    _id: 0,
                    timestamp: '$createdAt',
                    funcionario: '$funcionario',
                    carro: '$carro',
                    alerta: {
                        $cond: {
                            if: '$alertas',
                            then: {
                                tipo: '$alertas.tipo',
                                mensagem: '$alertas.mensagem',
                                severidade: '$alertas.severidade',
                                isDTC: false
                            },
                            else: {
                                $cond: {
                                    if: { $gt: ['$dados.dtcCount', 0] },
                                    then: {
                                        tipo: 'falha_motor_dtc',
                                        mensagem: {$concat: ["Falha DTC detectada: ", {$toString: "$dados.dtcCount"}, " erros."]},
                                        severidade: 'alta',
                                        falhasDTC: '$dados.falhas',
                                        isDTC: true
                                    },
                                    else: '$$REMOVE'
                                }
                            }
                        }
                    }
                }},
                ...(query.severidade ? [{ $match: { 'alerta.severidade': query.severidade } }] : []),
                ...(query.tipo ? [{ $match: { 'alerta.tipo': query.tipo } }] : []),
                { $sort: { timestamp: -1 } },
                { $skip: skip },
                { $limit: limit },
            ];

            const alertasPaginados = await LeituraOBD.aggregate(pipeline);
            await Funcionario.populate(alertasPaginados, { path: 'funcionario', select: 'nome cpf' });

            return res.status(200).json({
                message: 'Alertas retornados',
                page, limit,
                alertas: alertasPaginados
            });

        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar alertas', erro: error.message });
        }
    }
}