import * as argon2 from "argon2"
import Empresa from "../models/Empresa.js";
import Funcionario from "../models/Funcionario.js";
import { gerarToken } from "../helpers/auth.js";



export default class AuthController {
    static async login(req, res) {
        try {
            const { email, senha } = req.body;
            
            if (!email || !senha) {
                return res.status(422).json({ 
                    message: 'Dados inválidos'
                });
            }
            
            // Busca funcionário com senha
            const funcionario = await Funcionario.findOne({ email }).select('+senha').populate('empresa');
            
            if (!funcionario) {
                return res.status(401).json({ 
                    message: 'Email ou senha incorretos' 
                });
            }

            const senhaCorreta = await argon2.verify(funcionario.senha, senha);
            if (!senhaCorreta) {
                return res.status(401).json({ 
                    message: 'Email ou senha incorretos' 
                });
            }
            
            // Verifica se funcionário está ativo
            if (!funcionario.ativo) {
                return res.status(401).json({ 
                    message: 'Funcionário inativo. Entre em contato com sua empresa.' 
                });
            }
            
            // Verifica se empresa está ativa
            if (!funcionario.empresa.ativa) {
                return res.status(401).json({ 
                    message: 'Empresa inativa. Entre em contato com o suporte.' 
                });
            }
                        
            // Gera tokens
            const accessToken = gerarToken(funcionario._id, 'funcionario');
            
            await funcionario.save();
            
            return res.status(200).json({ 
                message: 'Login realizado com sucesso!',
                accessToken,
                funcionario: {
                    id: funcionario._id,
                    nome: funcionario.nome,
                    cpf: funcionario.cpf,
                    perfil: funcionario.perfil,
                    email: funcionario.email,
                    empresaId: funcionario.empresa._id,
                    empresa: funcionario.empresa.nome
                }
            });
            
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            return res.status(500).json({ 
                message: 'Erro ao fazer login',
                erro: error.message 
            });
        }
    }

    static async create(req, res) {
        try {
            const { nome, cpf, email, senha, telefone, empresaNome, empresaCnpj, empresaTelefone,
                empresaEnderecoRua, empresaEnderecoNumero, empresaEnderecoBairro, empresaEnderecoCidade,
                empresaEnderecoEstado, empresaEnderecoCep
             } = req.body;
            
            // Verifica se empresa existe
            const empresaExiste = await Empresa.findOne({ cnpj: empresaCnpj });
            if (empresaExiste) {
                return res.status(404).json({ 
                    message: 'Empresa já cadastrada' 
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

            const senhaHash = await argon2.hash(senha);

            const empresa = new Empresa({
                nome: empresaNome,
                cnpj: empresaCnpj,
                telefone: empresaTelefone,
                endereco: {
                    rua: empresaEnderecoRua,
                    numero: empresaEnderecoNumero,
                    bairro: empresaEnderecoBairro,
                    cidade: empresaEnderecoCidade,
                    estado: empresaEnderecoEstado,
                    cep: empresaEnderecoCep
                },
                ativa: true
            });
            await empresa.save();
            
            // Cria funcionário
            const funcionario = new Funcionario({
                nome, cpf, email, senha: senhaHash, telefone, empresa: empresa._id, perfil: "admin", ativo: true
            });
            await funcionario.save();

            empresa.funcionarios.push(funcionario._id);
            await empresa.save();
            
            return res.status(201).json({ 
                message: 'Funcionário cadastrado com sucesso!',
                funcionario: {
                    id: funcionario._id,
                    nome: funcionario.nome,
                    cpf: funcionario.cpf,
                    email: funcionario.email
                },
                empresa: {
                    id: empresa._id,
                    nome: empresa.nome,
                    cnpj: empresa.cnpj
                }
            });
        } catch (error) {
            console.error('Erro ao cadastrar funcionário:', error);
            return res.status(500).json({ 
                message: 'Erro ao cadastrar funcionário',
                erro: error.message 
            });
        }
    }
}
