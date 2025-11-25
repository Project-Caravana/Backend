import mongoose from "../db/conn.js";

const { Schema } = mongoose;

const empresaSchema = new Schema({
    nome: {
        type: String,
        required: true
    },
    cnpj: {
        type: String,
        required: true,
        unique: true
    },
    funcionarios: [{
        type: Schema.Types.ObjectId,
        ref: "Funcionario"
    }],
    telefone: {
        type: String,
        required: true
    },
    endereco: {
        rua: String,
        numero: String,
        bairro: String,
        cidade: String,
        estado: String,
        cep: String
    },
    ativa: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Empresa = mongoose.model("Empresa", empresaSchema);

export default Empresa;