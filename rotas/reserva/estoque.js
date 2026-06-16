const { montarEnderecoEntrega } = require('./utilitarios');

function contarItensPorCodigo(cesta) {
    return cesta.reduce((acumulador, item) => {
        if (!Number.isInteger(item.codigo)) {
            return acumulador;
        }

        acumulador[item.codigo] = (acumulador[item.codigo] || 0) + 1;
        return acumulador;
    }, {});
}

async function obterProdutoNoGestor(codigoProduto) {
    const respostaApi = await fetch(`http://localhost:3001/produtos/codigo/${codigoProduto}/json`, {
        headers: {
            'Accept': 'application/json'
        }
    });

    if (respostaApi.status === 404) {
        return null;
    }

    if (!respostaApi.ok) {
        throw new Error('ERRO_AO_CONSULTAR_PRODUTO');
    }

    return respostaApi.json();
}

async function validarEstoqueCesta(cesta) {
    const contagemItens = contarItensPorCodigo(cesta);
    const codigosProdutos = Object.keys(contagemItens).map(codigo => Number.parseInt(codigo, 10));

    for (const codigoProduto of codigosProdutos) {
        const produto = await obterProdutoNoGestor(codigoProduto);

        if (!produto) {
            return { valido: false };
        }

        if (Number.parseInt(produto.quantidade_estoque, 10) < contagemItens[codigoProduto]) {
            return { valido: false };
        }
    }

    return { valido: true };
}

async function registrarPedidoNoGestor(dadosCliente, cesta, dadosFrete, totalFormatado) {
    const listaCodigos = cesta
        .map(item => item.codigo)
        .filter(codigoProduto => Number.isInteger(codigoProduto));

    if (listaCodigos.length !== cesta.length) {
        throw new Error('Existem produtos na cesta sem codigo valido para gravacao do pedido.');
    }

    const enderecoEntrega = montarEnderecoEntrega(dadosCliente);
    const pedidoParaEnviar = {
        cliente_nome: dadosCliente.nome,
        cliente_cpf_cnpj: dadosCliente.cpf,
        cliente_telefone: dadosCliente.telefone,
        lista_codigos_produtos: listaCodigos,
        preco_total: totalFormatado,
        entrega_destinatario_nome: dadosCliente.nome,
        entrega_destinatario_endereco: enderecoEntrega,
        entrega_data_horario: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    };

    const respostaApi = await fetch('http://localhost:3001/pedidos/cadastrar', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pedidoParaEnviar)
    });

    if (!respostaApi.ok) {
        const erroTexto = await respostaApi.text();
        console.error('Erro da API do gestor:', erroTexto);
        const erroCadastroPedido = new Error('A API do gestor recusou o cadastro do pedido.');
        erroCadastroPedido.status = respostaApi.status;
        erroCadastroPedido.detalhes = erroTexto;
        throw erroCadastroPedido;
    }

    const resultadoBD = await respostaApi.json();
    const idPedidoGerado = resultadoBD.pedido?.codigo || resultadoBD.pedido?.id || 'Gravado';

    return {
        idPedidoGerado,
        enderecoEntrega
    };
}

module.exports = {
    registrarPedidoNoGestor,
    validarEstoqueCesta
};
