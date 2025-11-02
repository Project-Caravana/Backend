import mongoose from "../db/conn.js";

const { Schema } = mongoose;

const leituraOBDSchema = new Schema({
    carro: {
        type: Schema.Types.ObjectId,
        ref: "Carro",
        required: true
    },
    funcionario: {
        type: Schema.Types.ObjectId,
        ref: "Funcionario",
        required: true
    },
    dados: {
        velocidade: Number,
        rpm: Number,
        temperatura: Number,
        nivelCombustivel: Number,
        voltagem: Number,
        consumoInstantaneo: Number,
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
                enum: ['pendente', 'confirmado', 'permanente']
            }
        }]
    },
    alertas: [{
        tipo: String,
        mensagem: String,
        severidade: {
            type: String,
            enum: ['baixa', 'media', 'alta']
        }
    }]
}, { timestamps: true });

leituraOBDSchema.index({ carro: 1, createdAt: -1 });
leituraOBDSchema.index({ funcionario: 1, createdAt: -1 });

const LeituraOBD = mongoose.model("LeituraOBD", leituraOBDSchema);

export default LeituraOBD;