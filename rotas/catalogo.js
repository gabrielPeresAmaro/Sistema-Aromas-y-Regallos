const express = require('express');
const router = express.Router();


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

async function Categoria(res, titulo, apiCategoria, origem) {
    try {
        let api = await fetch(`http://localhost:3001/produtos/categoria/${apiCategoria}`);
        let txt = await api.text();
        let obj = JSON.parse(txt);
        let produtosHtml = '';

        for (let i = 0; i < obj.length; i++) {
            const produto = obj[i];
            let precoFormatado = parseFloat(produto.preco).toFixed(2);
            let imagemProduto = produto.foto;
            let idProduto = produto.codigo || produto.id;
            let volumeProduto = parseFloat(produto.volume) || 0.00;

            produtosHtml += `
                <div class="card-produto">
                    <img src="${imagemProduto}" width="100">
                    <h3>${produto.nome}</h3>
                    
                    <p class="texto-volume-produto">
                        ${titulo === 'Cestas' ? `Espaço total: ${volumeProduto}L` : `Ocupa: ${volumeProduto}L`}
                    </p>
                    
                    <p>R$ ${precoFormatado}</p>
                    
                    <form action="/adicionar" method="POST">
                        <input type="hidden" name="nome" value="${produto.nome}">
                        <input type="hidden" name="preco" value="${produto.preco}">
                        <input type="hidden" name="imagem" value="${imagemProduto}">
                        <input type="hidden" name="origem" value="${origem}">
                        
                        <input type="hidden" name="volume" value="${volumeProduto}">
                        <input type="hidden" name="categoria" value="${produto.categoria}">
                        
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
                    <h1>${titulo}</h1>
                    <a href="/resumo" class="btn-carrinho-topo">Ir ao carrinho</a>
                </header>
                
                <div id="barra-volume" class="barra-status-volume">
                    Verificando espaço da cesta...
                </div>

                <section class="vitrine">
                    ${produtosHtml || '<p style="color: black;">Nenhum produto disponível nesta categoria.</p>'}
                </section>
                <a href="/catalogo" class="btn-voltar">Voltar</a>
                
                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        const carrinho = JSON.parse(localStorage.getItem('carrinho_aromas')) || [];
                        const cestaEscolhida = carrinho.find(item => item.categoria === 'Cesta');
                        const barra = document.getElementById('barra-volume');

                        const capacidadTotal = cestaEscolhida.volume;
                        
                        const volumeOcupado = carrinho
                            .filter(item => item.categoria !== 'Cesta')
                            .reduce((acc, item) => acc + item.volume, 0);

                        const espacoLivre = capacidadTotal - volumeOcupado;

                        barra.innerHTML = "🧺 Cesta: " + cestaEscolhida.nome + " | Espaço: " + volumeOcupado.toFixed(2) + "L de " + capacidadTotal.toFixed(2) + "L ocupados.";

                        if (espacoLivre <= 0) {
                            // Adiciona classe de erro/cheia caso passe do limite
                            barra.classList.add('cheia');
                            barra.innerHTML += " ❌ Cesta cheia! Não é possível adicionar mais produtos.";
                            
                            const botoes = document.querySelectorAll('.btn-add');
                            botoes.forEach(btn => {
                                const form = btn.closest('form');
                                const catInput = form.querySelector('input[name="categoria"]');
                                if (catInput && catInput.value !== 'Cesta') {
                                    btn.disabled = true;
                                    btn.innerText = 'Sem Espaço';
                                }
                            });
                        }
                    });

                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.has('sucesso')) alert('Item adicionado à sua cesta!');
                    if (urlParams.has('excluido')) alert('Produto removido do sistema!');
                </script>
            </body>
            </html>
        `);

    } catch (erro) {
        console.error("Erro ao consumir a API:", erro);
        res.status(500).send("Erro interno ao buscar os produtos da API.");
    }
}

router.get('/categoria/bebidas', (req, res) => Categoria(res, 'Bebidas', 'bebida', '/categoria/bebidas'));
router.get('/categoria/decoracao', (req, res) => Categoria(res, 'Decoração', 'decoracao_cesta', '/categoria/decoracao'));
router.get('/categoria/itens-comestiveis', (req, res) => Categoria(res, 'Itens comestíveis', 'item_comestivel', '/categoria/itens-comestiveis'));
router.get('/categoria/cestas', (req, res) => Categoria(res, 'Cestas', 'cesta', '/categoria/cestas'));
router.get('/categoria/presentes', (req, res) => Categoria(res, 'Presentes', 'presente_tematico', '/categoria/presentes'));
router.get('/categoria/cartoes-mensagem', (req, res) => Categoria(res, 'Cartões de Mensagens', 'cartao_de_mensagem', '/categoria/cartoes-mensagem'));


module.exports = router;