import mongoose from "../db/conn.js";

const { Schema } = mongoose;

const leituraOBDSchema = new Schema({
    carro: {
        type: Schema.Types.ObjectId,
        ref: "Carro",
        required: true,
        index: true
    },
    funcionario: {
        type: Schema.Types.ObjectId,
        ref: "Funcionario",
        required: false  // Pode ser null se for leitura automática do dispositivo
    },
    empresa: {
        type: Schema.Types.ObjectId,
        ref: "Empresa",
        required: true,
        index: true
    },
    
    // Dados de telemetria
    dados: {
        velocidade: {
            type: Number,
            min: 0,
            max: 300  // km/h
        },
        rpm: {
            type: Number,
            min: 0,
            max: 10000
        },
        temperatura: {
            type: Number,
            min: -50,
            max: 150  // Celsius
        },
        nivelCombustivel: {
            type: Number,
            min: 0,
            max: 100  // Porcentagem
        },
        pressaoOleo: {
            type: Number,
            min: 0,
            max: 10  // bar
        },
        voltagem: {
            type: Number,
            min: 0,
            max: 20  // Volts
        },
        consumoInstantaneo: {
            type: Number,
            min: 0,
            max: 100  // km/l ou l/100km
        },
        distanciaPercorrida: {
            type: Number,
            default: 0  // km total
        },
        horasMotor: {
            type: Number,
            default: 0  // Horas totais de uso
        },
        
        // Diagnósticos
        milStatus: {
            type: Boolean,
            default: false  // true quando a luz da injeção está acesa
        },
        dtcCount: {
            type: Number,
            default: 0  // quantidade de códigos de falha
        },
        falhas: [{
            codigo: String,  // Ex: "P0300"
            descricao: String,
            status: {
                type: String,
                enum: ['pendente', 'confirmado', 'permanente'],
                default: 'pendente'
            },
            detectadoEm: {
                type: Date,
                default: Date.now
            }
        }]
    },
    
    // Localização (se disponível)
    localizacao: {
        latitude: Number,
        longitude: Number,
        altitude: Number,
        precisao: Number,  // metros
        timestamp: Date
    },
    
    // Alertas gerados automaticamente
    alertas: [{
        tipo: {
            type: String,
            enum: [
                'velocidade_alta',
                'temperatura_alta', 
                'combustivel_baixo',
                'rpm_alto',
                'pressao_oleo_baixa',
                'falha_motor',
                'manutencao_proxima',
                'outro'
            ]
        },
        mensagem: String,
        severidade: {
            type: String,
            enum: ['baixa', 'media', 'alta', 'critica'],
            default: 'baixa'
        },
        geradoEm: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Tipo de leitura
    tipoLeitura: {
        type: String,
        enum: ['automatica', 'manual', 'evento'],
        default: 'automatica'
    },
    
    // Fonte dos dados
    fonte: {
        type: String,
        enum: ['obd_bluetooth', 'obd_wifi', 'simulador', 'app_mobile'],
        default: 'obd_bluetooth'
    }
    
}, { 
    timestamps: true,
    // Cria índice TTL opcional para dados antigos (ex: deletar após 1 ano)
    // expires: '365d'  // Descomente se quiser expiração automática
});

// Índices para queries rápidas
leituraOBDSchema.index({ carro: 1, createdAt: -1 });
leituraOBDSchema.index({ funcionario: 1, createdAt: -1 });
leituraOBDSchema.index({ empresa: 1, createdAt: -1 });
leituraOBDSchema.index({ 'dados.milStatus': 1, createdAt: -1 });
leituraOBDSchema.index({ 'alertas.severidade': 1, createdAt: -1 });

// Método para gerar alertas automáticos
leituraOBDSchema.methods.gerarAlertas = function() {
    const alertas = [];
    const { dados } = this;
    
    // Alerta: Velocidade alta
    if (dados.velocidade > 120) {
        alertas.push({
            tipo: 'velocidade_alta',
            mensagem: `Velocidade muito alta: ${dados.velocidade} km/h`,
            severidade: dados.velocidade > 140 ? 'critica' : 'alta'
        });
    }
    
    // Alerta: Temperatura alta
    if (dados.temperatura > 100) {
        alertas.push({
            tipo: 'temperatura_alta',
            mensagem: `Motor superaquecendo: ${dados.temperatura}°C`,
            severidade: dados.temperatura > 110 ? 'critica' : 'alta'
        });
    }
    
    // Alerta: Combustível baixo
    if (dados.nivelCombustivel < 15) {
        alertas.push({
            tipo: 'combustivel_baixo',
            mensagem: `Combustível baixo: ${dados.nivelCombustivel}%`,
            severidade: dados.nivelCombustivel < 5 ? 'alta' : 'media'
        });
    }
    
    // Alerta: RPM muito alto
    if (dados.rpm > 5000) {
        alertas.push({
            tipo: 'rpm_alto',
            mensagem: `RPM muito alto: ${dados.rpm}`,
            severidade: 'media'
        });
    }
    
    // Alerta: Pressão do óleo baixa
    if (dados.pressaoOleo && dados.pressaoOleo < 1.5) {
        alertas.push({
            tipo: 'pressao_oleo_baixa',
            mensagem: `Pressão do óleo crítica: ${dados.pressaoOleo} bar`,
            severidade: 'critica'
        });
    }
    
    // Alerta: Luz da injeção acesa
    if (dados.milStatus) {
        alertas.push({
            tipo: 'falha_motor',
            mensagem: `Luz da injeção acesa. ${dados.dtcCount} falha(s) detectada(s)`,
            severidade: 'alta'
        });
    }
    
    return alertas;
};

// Hook: Gera alertas antes de salvar
leituraOBDSchema.pre('save', function(next) {
    if (this.isNew) {
        const alertasGerados = this.gerarAlertas();
        this.alertas = [...this.alertas, ...alertasGerados];
    }
    next();
});

const LeituraOBD = mongoose.model("LeituraOBD", leituraOBDSchema);

export default LeituraOBD;