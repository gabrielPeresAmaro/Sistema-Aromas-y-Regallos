const express = require('express');
const caminho = require('path');
const sessao = require('express-session');
const rotasInicio = require('./rotas/inicio');
const rotasCarrinho = require('./rotas/carrinho');
const rotasCadastro = require('./rotas/cadastro');

const aplicativo = express();

// Configurações
aplicativo.set('view engine', 'ejs');
aplicativo.set('views', caminho.join(__dirname, 'visualizacoes'));

// Middlewares
aplicativo.use(express.static(caminho.join(__dirname, 'publico')));
aplicativo.use(express.urlencoded({ extended: true }));
aplicativo.use(express.json());
aplicativo.use(sessao({
    secret: 'sobreiro_vinhos_secreto',
    resave: false,
    saveUninitialized: true
}));

// Rotas
aplicativo.use('/', rotasInicio);
aplicativo.use('/carrinho', rotasCarrinho);
aplicativo.use('/cadastro', rotasCadastro);

// Iniciar servidor
const porta = 3001;
if (require.main === module) {
    aplicativo.listen(porta, () => {
        console.log(`Servidor rodando em http://localhost:${porta}`);
    });
}

module.exports = aplicativo; // Exportado para testes
