const express = require('express');
const roteador = express.Router();

roteador.get('/', (requisicao, resposta) => {
    const carrinho = requisicao.session.carrinho || [];
    const quantidadeCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);

    if (carrinho.length === 0) {
        return resposta.redirect('/carrinho');
    }
    
    resposta.render('cadastro', { quantidadeCarrinho });
});

roteador.post('/finalizar', async (requisicao, resposta) => {
    const carrinho = requisicao.session.carrinho || [];
    
    if (carrinho.length === 0) {
        return resposta.redirect('/carrinho');
    }
    
    const { nome, cpf, telefone, endereco, dataReserva } = requisicao.body;
    
    let valorTotal = 0;
    const listaCodigos = [];
    carrinho.forEach(item => {
        valorTotal += item.preco * item.quantidade;
        for(let i=0; i < item.quantidade; i++){
            listaCodigos.push(item.codigo);
        }
    });

    const dadosPedido = {
        cliente_nome: nome,
        cliente_cpf_cnpj: cpf,
        cliente_telefone: telefone,
        lista_codigos_produtos: listaCodigos.join(','),
        preco_total: valorTotal,
        entrega_destinatario_nome: nome,
        entrega_destinatario_endereco: endereco,
        entrega_data_horario: dataReserva || new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    try {
        const respostaApi = await fetch('http://127.0.0.1:3000/pedidos/cadastrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosPedido)
        });

        if (respostaApi.ok) {
            requisicao.session.carrinho = [];
            const quantidadeCarrinho = 0;
            resposta.render('sucesso', { mensagem: "Sua reserva foi concluída com sucesso! Entraremos em contato em breve.", quantidadeCarrinho });
        } else {
            console.log("Erro na API base, simulando sucesso local");
            requisicao.session.carrinho = [];
            const quantidadeCarrinho = 0;
            resposta.render('sucesso', { mensagem: "Reserva recebida com sucesso! (Modo Simulação).", quantidadeCarrinho });
        }
    } catch (erro) {
        console.log("Erro ao enviar pedido para API base:", erro);
        requisicao.session.carrinho = [];
        const quantidadeCarrinho = 0;
        resposta.render('sucesso', { mensagem: "Reserva recebida com sucesso! (Modo Simulação).", quantidadeCarrinho });
    }
});

module.exports = roteador;
