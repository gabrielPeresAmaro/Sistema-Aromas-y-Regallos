const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const porta = 3000;

const rotaInicial = require('./rotas/inicial');
const rotaCatalogo = require('./rotas/catalogo');
const rotaReserva = require('./rotas/reserva');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use('/', rotaInicial);
app.use('/', rotaCatalogo);
app.use('/', rotaReserva);

app.listen(porta, () => {
    console.log(`Servidor rodando em http://localhost:${porta}`);
});