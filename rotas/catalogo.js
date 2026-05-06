const express = require('express');
const router = express.Router();

var cestaLogica = [];

router.get('/catalogo', (req, res) => {
    res.send(`
        <html>
        <head><link rel="stylesheet" href="/style.css"></head>
        <body>
            <header class="header-preto"><h1>Catalogo</h1></header>
            <div class="grid-botoes">
                <a href="/categoria/bebidas" class="btn-item">Bebidas</a>
                <a href="#" class="btn-item">Decoração</a>
                <a href="#" class="btn-item">Itens comestíveis</a>
                <a href="#" class="btn-item">Cestas</a>
                <a href="#" class="btn-item">Presentes</a>
                <a href="#" class="btn-item">Cartões de mensagens</a>
            </div>
            <a href="/inicial" class="btn-voltar">Voltar</a>
        </body>
        </html>
    `);
});

router.get('/categoria/bebidas', (req, res) => {
    res.send(`
        <html>
        <head><link rel="stylesheet" href="/style.css"></head>
        <body>
            <header class="header-preto">
                <h1>Bebidas</h1>
                <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a>
            </header>
            <section class="vitrine">
                <div class="card-produto">
                    <img src="/vinho.jpg" width="100">
                    <h3>Vinho Fino Tinto Seco</h3>
                    <p>R$ 120,90</p>
                    <form action="/adicionar" method="POST">
                        <input type="hidden" name="nome" value="Vinho Fino Tinto Seco">
                        <input type="hidden" name="preco" value="120.90">
                        <input type="hidden" name="imagem" value="/vinho.jpg">
                        <button type="submit" class="btn-add">Reservar</button>
                    </form>
                </div>
                
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
});


module.exports = router;