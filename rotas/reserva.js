const express = require('express');
const router = express.Router();


router.post('/adicionar', (req, res) => {
    if (!req.session.cesta) {
        req.session.cesta = [];
    }
    const item = {
        id: Date.now(),
        nome: req.body.nome,
        preco: parseFloat(req.body.preco),
        imagem: req.body.imagem
    };
    req.session.cesta.push(item);
    const paginaOrigem = req.body.origem || '/catalogo';
    res.redirect(`${paginaOrigem}?sucesso=1`);
});

router.post('/remover', (req, res) => {
    const idParaRemover = req.body.id;
    let cesta = req.session.cesta || [];
    req.session.cesta = cesta.filter(item => item.id != idParaRemover);
    res.redirect('/resumo');
});

router.get('/resumo', (req, res) => {
    let cesta = req.session.cesta || [];
    let total = cesta.reduce((acc, item) => acc + item.preco, 0);

    let itensHtml = cesta.map(i => `
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
                    <a href="/dados-cliente" class="btn-item" style="width: 100%; cursor: pointer;">Finalizar</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

router.get('/dados-cliente', (req, res) => {
    const valorTotal = req.query.total
    const html = `
    <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
        </head>
        <body>
            <form action="/tela-confirmacao" method="POST">

            <label for="nome">Nome completo:</label><br>
            <input type="text" id="nome" name="nome" maxlength="100"><br><br>

            <label for="cpf">CPF:</label><br>
            <input type="text" id="cpf" name="cpf" min="11"><br><br>

            <label for="cep">Cep:</label><br>
            <input type="number" id="cep" name="cep" maxlength="8"><br><br>

            <label for="bairro">Bairo:</label><br>
            <input type="text" id="bairro" name="bairro" min="0"><br><br>

            <label for="rua">Rua:</label><br>
            <input type="text" id="rua" name="rua" min="0"><br><br>

            <button type="submit">Registrar reserva</button>
            </form>
        </body>
        </html>
        <br/><br/><a href="/resumo">Voltar</a>`
    res.send(html)
})

router.post('/tela-confirmacao', (req, res) => {
    const nome = req.body.nome
    const cpf = req.body.cpf
    const cep = parseInt(req.body.cep)
    const bairro = req.body.bairro
    const rua = req.body.rua
    const total = parseFloat(req.body.total)
    const html =
        `<!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
        </head>
        <body>
            <h1>Pedido Confirmado com sucesso!</h1>
            <p>Nome: ${nome}</p>
            <p>CPF: ${cpf}</p>
            <p>CEP: ${cep}</p>
            <p>Bairro: ${bairro}</p>
            <p>Rua: ${rua}</p>
            <p>Valor Total: R$ ${total.toFixed(2)}</p>
            
        </body>
        </html>
        `
    erro = 'Erro - não pode haver campo de dado em branco.<br/><br/><a href="/dados-cliente">Voltar</a>'
    if (nome == "" || cpf == "" || cep == "" || bairro == "" || rua == "") {
        res.send(erro);
    }
    else {
        res.send(html)
    }
})

module.exports = router;