const express = require('express');
const router = express.Router();

var cestaLogica = [];


router.get('/catalogo', (req, res) => {
    res.send(`
        <html>
        <head><link rel="stylesheet" href="/style.css"></head>
        <body>
            <header class="header-preto"><h1>Catalogo</h1>
            <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a></header>
            <div class="grid-botoes">
                <a href="/categoria/bebidas" class="btn-item">Bebidas</a>
                <a href="/categoria/decoracao" class="btn-item">Decoração</a>
                <a href="/categoria/itens-comestiveis" class="btn-item">Itens comestíveis</a>
                <a href="/categoria/cestas" class="btn-item">Cestas</a>
                <a href="/categoria/presentes" class="btn-item">Presentes</a>
                <a href="/categoria/cartoes-mensagem" class="btn-item">Cartões de mensagens</a>
            </div>
            <a href="/inicial" class="btn-voltar">Voltar</a>
        </body>
        </html>
    `);
});

router.get('/categoria/bebidas', async function (req, res) {
    try {
        let api = await fetch('http://localhost:3001/produtos/categoria/bebida');
        let txt = await api.text();
        let obj = await JSON.parse(txt);
        let produtosHtml = '';
        for (let i = 0; i < obj.length; i++) {
            const produto = obj[i];
            let precoFormatado = parseFloat(produto.preco).toFixed(2);
            let imagemProduto = produto.foto;

            produtosHtml += `
                <div class="card-produto">
                    <img src="${imagemProduto}" width="100">
                    <h3>${produto.nome}</h3>
                    <p>R$ ${precoFormatado}</p>
                    <form action="/adicionar" method="POST">
                        <input type="hidden" name="nome" value="${produto.nome}">
                        <input type="hidden" name="preco" value="${produto.preco}">
                        <input type="hidden" name="imagem" value="${imagemProduto}">
                        <input type="hidden" name="origem" value="/categoria/bebidas">
                        <button type="submit" class="btn-add">Reservar</button>
                    </form>
                </div>
            `;
        }

        res.send(`
            <html>
            <head><link rel="stylesheet" href="/style.css"></head>
            <body>
                <header class="header-preto">
                    <h1>Bebidas</h1>
                    <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a>
                </header>
                <section class="vitrine">
                    ${produtosHtml || '<p style="color: black;">Nenhum produto disponível nesta categoria.</p>'}
                </section>
                <a href="/catalogo" class="btn-voltar">Voltar</a>
                <script>
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('sucesso')) {
                        alert('Item adicionado à sua cesta!');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                </script>
            </body>
            </html>
        `);

    } catch (erro) {
        console.error("Erro ao consumir a API:", erro);
        res.status(500).send("Erro interno ao buscar os produtos da API.");
    }
});
router.get('/categoria/decoracao', async function (req, res) {
    try {
        let api = await fetch('http://localhost:3001/produtos/categoria/decoracao_cesta');
        let txt = await api.text();
        let obj = await JSON.parse(txt);
        let produtosHtml = '';
        for (let i = 0; i < obj.length; i++) {
            const produto = obj[i];
            let precoFormatado = parseFloat(produto.preco).toFixed(2);
            let imagemProduto = produto.foto;

            produtosHtml += `
                <div class="card-produto">
                    <img src="${imagemProduto}" width="100">
                    <h3>${produto.nome}</h3>
                    <p>R$ ${precoFormatado}</p>
                    <form action="/adicionar" method="POST">
                        <input type="hidden" name="nome" value="${produto.nome}">
                        <input type="hidden" name="preco" value="${produto.preco}">
                        <input type="hidden" name="imagem" value="${imagemProduto}">
                        <input type="hidden" name="origem" value="/categoria/decoracao">
                        <button type="submit" class="btn-add">Reservar</button>
                    </form>
                </div>
            `;
        }

        res.send(`
            <html>
            <head><link rel="stylesheet" href="/style.css"></head>
            <body>
                <header class="header-preto">
                    <h1>Decoração</h1>
                    <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a>
                </header>
                <section class="vitrine">
                    ${produtosHtml || '<p style="color: black;">Nenhum produto disponível nesta categoria.</p>'}
                </section>
                <a href="/catalogo" class="btn-voltar">Voltar</a>
                <script>
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('sucesso')) {
                        alert('Item adicionado à sua cesta!');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                </script>
            </body>
            </html>
        `);
        const item = {
            id: Date.now(),
            nome: req.body.nome,
            preco: parseFloat(req.body.preco),
            imagem: req.body.imagem
        };
        cestaLogica.push(item);
        res.redirect('/categoria/decoracao?sucesso=1');
    } catch (erro) {
        console.error("Erro ao consumir a API:", erro);
        res.status(500).send("Erro interno ao buscar os produtos da API.");
    }
});
router.get('/categoria/itens-comestiveis', async function (req, res) {
    try {
        let api = await fetch('http://localhost:3001/produtos/categoria/item_comestivel');
        let txt = await api.text();
        let obj = await JSON.parse(txt);
        let produtosHtml = '';
        for (let i = 0; i < obj.length; i++) {
            const produto = obj[i];
            let precoFormatado = parseFloat(produto.preco).toFixed(2);
            let imagemProduto = produto.foto;

            produtosHtml += `
                <div class="card-produto">
                    <img src="${imagemProduto}" width="100">
                    <h3>${produto.nome}</h3>
                    <p>R$ ${precoFormatado}</p>
                    <form action="/adicionar" method="POST">
                        <input type="hidden" name="nome" value="${produto.nome}">
                        <input type="hidden" name="preco" value="${produto.preco}">
                        <input type="hidden" name="imagem" value="${imagemProduto}">
                        <input type="hidden" name="origem" value="/categoria/itens-comestiveis">
                        <button type="submit" class="btn-add">Reservar</button>
                    </form>
                </div>
            `;
        }

        res.send(`
            <html>
            <head><link rel="stylesheet" href="/style.css"></head>
            <body>
                <header class="header-preto">
                    <h1>Itens comestíveis</h1>
                    <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a>
                </header>
                <section class="vitrine">
                    ${produtosHtml || '<p style="color: black;">Nenhum produto disponível nesta categoria.</p>'}
                </section>
                <a href="/catalogo" class="btn-voltar">Voltar</a>
                <script>
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('sucesso')) {
                        alert('Item adicionado à sua cesta!');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                </script>
            </body>
            </html>
        `);
    } catch (erro) {
        console.error("Erro ao consumir a API:", erro);
        res.status(500).send("Erro interno ao buscar os produtos da API.");
    }
});
router.get('/categoria/cestas', async function (req, res) {
    try {
        let api = await fetch('http://localhost:3001/produtos/categoria/cesta');
        let txt = await api.text();
        let obj = await JSON.parse(txt);
        let produtosHtml = '';
        for (let i = 0; i < obj.length; i++) {
            const produto = obj[i];
            let precoFormatado = parseFloat(produto.preco).toFixed(2);
            let imagemProduto = produto.foto;

            produtosHtml += `
                <div class="card-produto">
                    <img src="${imagemProduto}" width="100">
                    <h3>${produto.nome}</h3>
                    <p>R$ ${precoFormatado}</p>
                    <form action="/adicionar" method="POST">
                        <input type="hidden" name="nome" value="${produto.nome}">
                        <input type="hidden" name="preco" value="${produto.preco}">
                        <input type="hidden" name="imagem" value="${imagemProduto}">
                        <input type="hidden" name="origem" value="/categoria/cestas">

                        <button type="submit" class="btn-add">Reservar</button>
                    </form>
                </div>
            `;
        }

        res.send(`
            <html>
            <head><link rel="stylesheet" href="/style.css"></head>
            <body>
                <header class="header-preto">
                    <h1>Itens comestíveis</h1>
                    <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a>
                </header>
                <section class="vitrine">
                    ${produtosHtml || '<p style="color: black;">Nenhum produto disponível nesta categoria.</p>'}
                </section>
                <a href="/catalogo" class="btn-voltar">Voltar</a>
                <script>
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('sucesso')) {
                        alert('Item adicionado à sua cesta!');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                </script>
            </body>
            </html>
        `);
    } catch (erro) {
        console.error("Erro ao consumir a API:", erro);
        res.status(500).send("Erro interno ao buscar os produtos da API.");
    }
});
router.get('/categoria/presentes', async function (req, res) {
    try {
        let api = await fetch('http://localhost:3001/produtos/categoria/presente_tematico');
        let txt = await api.text();
        let obj = await JSON.parse(txt);
        let produtosHtml = '';
        for (let i = 0; i < obj.length; i++) {
            const produto = obj[i];
            let precoFormatado = parseFloat(produto.preco).toFixed(2);
            let imagemProduto = produto.foto;

            produtosHtml += `
                <div class="card-produto">
                    <img src="${imagemProduto}" width="100">
                    <h3>${produto.nome}</h3>
                    <p>R$ ${precoFormatado}</p>
                    <form action="/adicionar" method="POST">
                        <input type="hidden" name="nome" value="${produto.nome}">
                        <input type="hidden" name="preco" value="${produto.preco}">
                        <input type="hidden" name="imagem" value="${imagemProduto}">
                        <input type="hidden" name="origem" value="/categoria/presentes">
                        <button type="submit" class="btn-add">Reservar</button>
                    </form>
                </div>
            `;
        }

        res.send(`
            <html>
            <head><link rel="stylesheet" href="/style.css"></head>
            <body>
                <header class="header-preto">
                    <h1>Presentes</h1>
                    <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a>
                </header>
                <section class="vitrine">
                    ${produtosHtml || '<p style="color: black;">Nenhum produto disponível nesta categoria.</p>'}
                </section>
                <a href="/catalogo" class="btn-voltar">Voltar</a>
                <script>
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('sucesso')) {
                        alert('Item adicionado à sua cesta!');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                </script>
            </body>
            </html>
        `);
    } catch (erro) {
        console.error("Erro ao consumir a API:", erro);
        res.status(500).send("Erro interno ao buscar os produtos da API.");
    }
});
router.get('/categoria/cartoes-mensagem', async function (req, res) {
    try {
        let api = await fetch('http://localhost:3001/produtos/categoria/cartao_de_mensagem');
        let txt = await api.text();
        let obj = await JSON.parse(txt);
        let produtosHtml = '';
        for (let i = 0; i < obj.length; i++) {
            const produto = obj[i];
            let precoFormatado = parseFloat(produto.preco).toFixed(2);
            let imagemProduto = produto.foto;

            produtosHtml += `
                <div class="card-produto">
                    <img src="${imagemProduto}" width="100">
                    <h3>${produto.nome}</h3>
                    <p>R$ ${precoFormatado}</p>
                    <form action="/adicionar" method="POST">
                        <input type="hidden" name="nome" value="${produto.nome}">
                        <input type="hidden" name="preco" value="${produto.preco}">
                        <input type="hidden" name="imagem" value="${imagemProduto}">
                        <input type="hidden" name="origem" value="/categoria/cartoes-mensagem">
                        <button type="submit" class="btn-add">Reservar</button>
                    </form>
                </div>
            `;
        }

        res.send(`
            <html>
            <head><link rel="stylesheet" href="/style.css"></head>
            <body>
                <header class="header-preto">
                    <h1>Cartões de Mensagens</h1>
                    <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a>
                </header>
                <section class="vitrine">
                    ${produtosHtml || '<p style="color: black;">Nenhum produto disponível nesta categoria.</p>'}
                </section>
                <a href="/catalogo" class="btn-voltar">Voltar</a>
                <script>
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('sucesso')) {
                        alert('Item adicionado à sua cesta!');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                </script>
            </body>
            </html>
        `);
    } catch (erro) {
        console.error("Erro ao consumir a API:", erro);
        res.status(500).send("Erro interno ao buscar os produtos da API.");
    }
});


module.exports = router;