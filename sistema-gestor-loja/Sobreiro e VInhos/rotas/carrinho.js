const express = require('express');
const roteador = express.Router();

roteador.get('/', (requisicao, resposta) => {
    const carrinho = requisicao.session.carrinho || [];
    let valorTotal = 0;
    
    carrinho.forEach(item => {
        valorTotal += item.preco * item.quantidade;
    });

    const quantidadeCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);
    
    resposta.render('carrinho', { carrinho, valorTotal, quantidadeCarrinho });
});

roteador.post('/adicionar', (requisicao, resposta) => {
    if (!requisicao.session.carrinho) {
        requisicao.session.carrinho = [];
    }
    
    const codigoProduto = parseInt(requisicao.body.codigo);
    const nomeProduto = requisicao.body.nome;
    const precoProduto = parseFloat(requisicao.body.preco);
    
    const indiceProduto = requisicao.session.carrinho.findIndex(item => item.codigo === codigoProduto);
    
    if (indiceProduto > -1) {
        requisicao.session.carrinho[indiceProduto].quantidade += 1;
    } else {
        requisicao.session.carrinho.push({
            codigo: codigoProduto,
            nome: nomeProduto,
            preco: precoProduto,
            quantidade: 1
        });
    }
    
    resposta.redirect('/carrinho');
});

roteador.post('/remover', (requisicao, resposta) => {
    if (requisicao.session.carrinho) {
        const codigoProduto = parseInt(requisicao.body.codigo);
        requisicao.session.carrinho = requisicao.session.carrinho.filter(item => item.codigo !== codigoProduto);
    }
    resposta.redirect('/carrinho');
});

module.exports = roteador;
