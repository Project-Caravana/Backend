import mongoose from "../db/conn.js";

const { Schema } = mongoose;

const funcionarioSchema = new Schema({
    nome: {
        type: String,
        required: true
    },
    cpf: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    senha: {
        type: String,
        required: true,
        select: false
    },
    telefone: {
        type: String,
        required: true
    },
    empresa: {
        type: Schema.Types.ObjectId,
        ref: "Empresa",
        required: true
    },
    carroAtual: {
        type: Schema.Types.ObjectId,
        ref: "Carro",
        default: null
    },
    perfil: {
        type: String,
        enum: ['funcionario', 'admin', 'motorista'],
        default: ['funcionario']
    },
    ativo: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Funcionario = mongoose.model("Funcionario", funcionarioSchema);

export default Funcionario;