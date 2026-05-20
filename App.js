const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const porta = 3000;
const session = require('express-session');



const rotaInicial = require('./rotas/inicial');
const rotaCatalogo = require('./rotas/catalogo');
const rotaReserva = require('./rotas/reserva');

app.use(session({
    secret: 'chave', // Pode ser qualquer texto de segurança
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // false permite funcionar em localhost sem HTTPS
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use('/', rotaInicial);
app.use('/', rotaCatalogo);
app.use('/', rotaReserva);



app.listen(porta, () => {
    console.log(`Servidor rodando em http://localhost:${porta}`);
});