const express = require('express');
const router = express.Router();

var cestaLogica = [];

router.post('/adicionar', (req, res) => {
    const item = {
        id: Date.now(),
        nome: req.body.nome,
        preco: parseFloat(req.body.preco),
        imagem: req.body.imagem
    };
    cestaLogica.push(item);
    res.redirect('/categoria/bebidas?sucesso=1');
});

router.post('/remover', (req, res) => {
    const idParaRemover = req.body.id;
    cestaLogica = cestaLogica.filter(item => item.id != idParaRemover);
    res.redirect('/resumo');
});

router.get('/resumo', (req, res) => {
    let total = cestaLogica.reduce((acc, item) => acc + item.preco, 0);

    let itensHtml = cestaLogica.map(i => `
    <div class="item-reserva">
        <div class="item-info">
            <img src="${i.imagem}" class="item-foto">
            <div>
                <p class="texto-negrito">${i.nome}</p>
                <p class="texto-cinza">R$ ${i.preco.toFixed(2)}</p>
            </div>
        </div>
        <form action="/remover" method="POST">
            <input type="hidden" name="id" value="${i.id}">
            <button type="submit" class="btn-remover">Remover</button>
        </form>
    </div>
`).join('');

    res.send(`
        <html>
        <head><link rel="stylesheet" href="/style.css"></head>
        <body>
            <header class="header-preto"><h1>Minha Cesta</h1></header>
            <div class="conteudo-resumo" style="max-width: 600px; margin: 20px auto; padding: 20px;">
                ${itensHtml || '<p style="text-align: center;">Sua cesta está vazia.</p>'}
                <hr>
                <div class="total-reserva" style="text-align: right;">
                    <h3>Total: R$ ${total.toFixed(2)}</h3>
                </div>
                <div style="margin-top: 30px;">
                    <a href="/catalogo" class="btn-item" style="text-decoration: none; display: block; margin-bottom: 10px;">Continuar Comprando</a>
                    <button class="btn-item" style="width: 100%; cursor: pointer;">Finalizar</button>
                </div>
            </div>
        </body>
        </html>
    `);
});

module.exports = router;