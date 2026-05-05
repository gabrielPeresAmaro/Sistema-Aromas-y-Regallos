const express = require('express');
const roteador = express.Router();

roteador.get('/', async (requisicao, resposta) => {
    try {
        const respostaApi = await fetch('http://127.0.0.1:3000/produtos/categoria/cesta');
        let cestas = [];
        if (respostaApi.ok) {
            cestas = await respostaApi.json();
            // Substituir foto genérica pelas da loja
            cestas = cestas.map((c, i) => {
                const imagens = ['/fotos/IMG_3940.JPG', '/fotos/IMG_3941.JPG', '/fotos/IMG_3946.JPG', '/fotos/IMG_3948.JPG', '/fotos/IMG_3954.JPG'];
                return { ...c, foto: imagens[i % imagens.length] };
            });
        } else {
            cestas = [
                { codigo: 1, nome: "Cesta Reserva Especial", descricao: "Seleção harmonizada de vinhos tintos, queijos nobres e charcutaria fina.", preco: 280.00, foto: "/fotos/IMG_3940.JPG" },
                { codigo: 2, nome: "Cesta Espumante & Trufas", descricao: "Celebre momentos inesquecíveis com nossa seleção de espumantes e trufas artesanais.", preco: 350.00, foto: "/fotos/IMG_3941.JPG" },
                { codigo: 3, nome: "Cesta Degustação Premium", descricao: "A verdadeira experiência Sobreiro com produtos exclusivos e safras limitadas.", preco: 520.00, foto: "/fotos/IMG_3948.JPG" }
            ];
        }
        
        const carrinho = requisicao.session.carrinho || [];
        const quantidadeCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);

        resposta.render('inicio', { produtos: cestas, quantidadeCarrinho });
    } catch (erro) {
        console.log("Erro ao conectar com API base:", erro);
        const cestas = [
            { codigo: 1, nome: "Cesta Reserva Especial", descricao: "Seleção harmonizada de vinhos tintos, queijos nobres e charcutaria fina.", preco: 280.00, foto: "/fotos/IMG_3940.JPG" },
            { codigo: 2, nome: "Cesta Espumante & Trufas", descricao: "Celebre momentos inesquecíveis com nossa seleção de espumantes e trufas artesanais.", preco: 350.00, foto: "/fotos/IMG_3941.JPG" },
            { codigo: 3, nome: "Cesta Degustação Premium", descricao: "A verdadeira experiência Sobreiro com produtos exclusivos e safras limitadas.", preco: 520.00, foto: "/fotos/IMG_3948.JPG" }
        ];
        const carrinho = requisicao.session.carrinho || [];
        const quantidadeCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);

        resposta.render('inicio', { produtos: cestas, quantidadeCarrinho });
    }
});

module.exports = roteador;
