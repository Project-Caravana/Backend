import jwt from "jsonwebtoken";

// Gerar access token (curta duração)
export const gerarToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: '2h' } // 2 horas
    );
};

// Verificar access token
export const verificarToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};
