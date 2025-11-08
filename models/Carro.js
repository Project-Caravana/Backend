import mongoose from "../db/conn.js";

const { Schema } = mongoose;

const carroSchema = new Schema({
    // Informações básicas do veículo
    placa: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    modelo: {
        type: String,
        required: true
    },
    marca: {
        type: String,
        required: true
    },
    ano: {
        type: Number,
        required: true
    },
    tipoVeiculo: {
        type: String,
        enum: ['Passeio', 'Van', 'Caminhonete', 'Caminhão']
    },
    tipoCombustivel: {
        type: String,
        enum: ['Etanol', 'Gasolina', 'Diesel', 'Elétrico', 'Flex']  // ADICIONEI 'Flex'
    },
    chassi: {
        type: String,
        required: false  // ← MUDEI PARA FALSE (era true)
    },
    cor: {
        type: String
    },
    
    // Relacionamentos
    empresa: {
        type: Schema.Types.ObjectId,
        ref: "Empresa",
        required: true
    },
    funcionarioAtual: {
        type: Schema.Types.ObjectId,
        ref: "Funcionario",
        default: null
    },
    
    // Dados OBD-II em tempo real (último registro)
    dadosOBD: {
        velocidade: Number,
        rpm: Number,
        temperatura: Number,
        nivelCombustivel: Number,
        pressaoOleo: Number,
        voltagem: Number,
        consumoInstantaneo: Number,
        distanciaPercorrida: Number,
        horasMotor: Number,
        ultimaAtualizacao: Date
    },
    
    // Status e manutenção
    status: {
        type: String,
        enum: ['disponivel', 'em_uso', 'manutencao', 'inativo'],
        default: 'disponivel'
    },
    kmTotal: {
        type: Number,
        default: 0
    },
    proxManutencao: {
        type: Date
    }
}, { timestamps: true });

// Índice para garantir que um carro só pode ter um funcionário
carroSchema.index({ funcionarioAtual: 1 }, { 
    unique: true, 
    sparse: true 
});

const Carro = mongoose.model("Carro", carroSchema);

export default Carro;