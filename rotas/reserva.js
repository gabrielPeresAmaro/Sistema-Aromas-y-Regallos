const express = require('express');

const { validarEstoqueCesta, registrarPedidoNoGestor } = require('./reserva/estoque');
const { cestaTemVolumetriaCompleta, cotarFreteMelhorEnvio } = require('./reserva/frete');
const { consultarPagamentoMercadoPago, criarPreferenciaMercadoPago } = require('./reserva/mercado-pago');
const {
    montarHtmlMensagem,
    montarHtmlPedidoConfirmado,
    montarPaginaDadosCliente,
    montarPaginaResumo
} = require('./reserva/paginas');

const router = express.Router();

function obterCestaDaSessao(req) {
    if (!req.session.cesta) {
        req.session.cesta = [];
    }

    return req.session.cesta;
}

function limparFreteDaSessao(req) {
    req.session.frete = null;
    req.session.opcoesFrete = [];
}

function obterFreteDaSessao(req) {
    return req.session.frete || {
        valor: 0,
        prazo: 0,
        cepCalculado: '',
        transportadora: '',
        servico: ''
    };
}

router.post('/adicionar', async (req, res) => {
    const cesta = obterCestaDaSessao(req);
    const item = {
        id: Date.now(),
        codigo: Number.parseInt(req.body.codigo, 10) || null,
        nome: req.body.nome,
        preco: parseFloat(req.body.preco),
        volume: parseFloat(req.body.volume) || 0.00,
        altura_cm: parseFloat(req.body.altura_cm) || 0.00,
        largura_cm: parseFloat(req.body.largura_cm) || 0.00,
        profundidade_cm: parseFloat(req.body.profundidade_cm) || 0.00,
        peso_kg: parseFloat(req.body.peso_kg) || 0.00,
        categoria: req.body.categoria,
        imagem: req.body.imagem
    };
    const paginaOrigem = req.body.origem || '/catalogo';
    let cestaAtualizada = [...cesta];

    if (item.categoria === 'Cesta') {
        cestaAtualizada = cestaAtualizada.filter(itemAtual => itemAtual.categoria !== 'Cesta');
    }

    try {
        cestaAtualizada.push(item);

        const validacaoEstoque = await validarEstoqueCesta(cestaAtualizada, { aceitarFalhaConsulta: true });

        if (!validacaoEstoque.valido) {
            return res.redirect(`${paginaOrigem}?erro_estoque=1`);
        }

        req.session.cesta = cestaAtualizada;
        limparFreteDaSessao(req);

        res.redirect(`${paginaOrigem}?sucesso=1`);
    } catch (erro) {
        console.error('Erro ao validar estoque no carrinho:', erro.message || erro);
        res.redirect(`${paginaOrigem}?erro_estoque=2`);
    }
});

router.post('/remover', (req, res) => {
    const cesta = obterCestaDaSessao(req);
    const idParaRemover = req.body.id;

    req.session.cesta = cesta.filter(item => item.id != idParaRemover);
    limparFreteDaSessao(req);
    res.redirect('/resumo');
});

router.get('/resumo', (req, res) => {
    const cesta = obterCestaDaSessao(req);
    const opcoesFrete = req.session.opcoesFrete || [];
    const dadosFrete = obterFreteDaSessao(req);

    res.send(montarPaginaResumo(cesta, opcoesFrete, dadosFrete));
});

router.get('/dados-cliente', (req, res) => {
    const cesta = obterCestaDaSessao(req);
    const dadosFrete = obterFreteDaSessao(req);

    if (cesta.length === 0) {
        return res.redirect('/resumo');
    }

    if (!dadosFrete.cepCalculado || dadosFrete.valor <= 0) {
        return res.redirect('/resumo?erro_frete=3');
    }

    res.send(montarPaginaDadosCliente(cesta, dadosFrete));
});

router.post('/calcular-frete', async (req, res) => {
    const cepDestino = String(req.body.cep || '').replace(/\D/g, '');
    const cesta = obterCestaDaSessao(req);

    if (cesta.length === 0) {
        return res.redirect('/resumo?erro_frete=4');
    }

    if (!cestaTemVolumetriaCompleta(cesta)) {
        return res.redirect('/resumo?erro_frete=5');
    }

    if (cepDestino.length !== 8) {
        return res.redirect('/resumo?erro_frete=1');
    }

    try {
        const opcoesFrete = await cotarFreteMelhorEnvio(cesta, cepDestino);
        req.session.opcoesFrete = opcoesFrete;
        req.session.frete = null;
        res.redirect('/resumo');
    } catch (erro) {
        console.error('Erro ao calcular frete:', erro.detalhes || erro.message || erro);

        if (erro.code === 'MELHOR_ENVIO_NAO_CONFIGURADO') {
            return res.redirect('/resumo?erro_frete=2');
        }

        res.redirect('/resumo?erro_frete=3');
    }
});

router.post('/selecionar-frete', (req, res) => {
    const codigoFrete = String(req.body.codigo_frete || '');
    const opcoesFrete = req.session.opcoesFrete || [];
    const freteEscolhido = opcoesFrete.find(opcaoFrete => opcaoFrete.codigo === codigoFrete);

    if (!freteEscolhido) {
        return res.redirect('/resumo?erro_frete=6');
    }

    req.session.frete = freteEscolhido;
    res.redirect('/resumo');
});

router.post('/iniciar-pagamento', async (req, res) => {
    if (!req.session.frete) {
        return res.send('Erro - Informacoes de frete nao encontradas na sessao.<br/><br/><a href="/resumo">Voltar ao Carrinho</a>');
    }

    const {
        nome,
        email,
        cpf,
        telefone,
        cep,
        rua,
        numero,
        bairro,
        cidade,
        estado,
        complemento,
        total
    } = req.body;

    const totalFormatado = parseFloat(total) || 0;
    const cepFrete = String(req.session.frete?.cepCalculado || '').replace(/\D/g, '');
    const cepInformado = String(cep || '').replace(/\D/g, '');

    if (!nome || !email || !cpf || !telefone || !cep || !rua || !numero || !bairro || !cidade || !estado) {
        return res.send('Erro - nao pode haver campo de dado em branco.<br/><br/><a href="/dados-cliente">Voltar</a>');
    }

    if (cepFrete !== cepInformado) {
        return res.redirect('/resumo?erro_frete=7');
    }

    const cesta = obterCestaDaSessao(req);

    if (cesta.length === 0) {
        return res.send('Erro - Seu carrinho esta vazio.<br/><br/><a href="/catalogo">Voltar ao Catalogo</a>');
    }

    try {
        const validacaoEstoque = await validarEstoqueCesta(cesta);

        if (!validacaoEstoque.valido) {
            return res.redirect('/resumo?erro_estoque=3');
        }

        const dadosCliente = {
            nome,
            email,
            cpf,
            telefone,
            cep,
            rua,
            numero,
            bairro,
            cidade,
            estado,
            complemento,
            total: totalFormatado
        };
        const dadosFrete = req.session.frete || {};
        const preferenciaMercadoPago = await criarPreferenciaMercadoPago(dadosCliente, cesta, dadosFrete);

        if (!preferenciaMercadoPago.urlPagamento) {
            throw new Error('Nao foi possivel obter a URL de pagamento do Mercado Pago.');
        }

        req.session.pedidoPendenteMercadoPago = {
            referenciaExterna: preferenciaMercadoPago.referenciaExterna,
            dadosCliente,
            totalFormatado
        };
        req.session.pedidoConfirmadoMercadoPago = null;

        res.redirect(preferenciaMercadoPago.urlPagamento);
    } catch (erro) {
        console.error('Erro ao iniciar pagamento com Mercado Pago:', erro.detalhes || erro.message || erro);

        if (erro.code === 'MERCADO_PAGO_NAO_CONFIGURADO') {
            return res.status(500).send('Erro - token do Mercado Pago nao configurado.<br/><br/><a href="/dados-cliente">Voltar</a>');
        }

        if (erro.code === 'MERCADO_PAGO_TOKEN_INVALIDO') {
            return res.status(500).send('Erro - o token informado em MERCADO_PAGO_ACCESS_TOKEN nao parece ser uma credencial do Mercado Pago.<br/><br/><a href="/dados-cliente">Voltar</a>');
        }

        res.status(500).send('Erro interno ao iniciar o pagamento com Mercado Pago.<br/><br/><a href="/dados-cliente">Voltar</a>');
    }
});

router.get('/pagamento/sucesso', async (req, res) => {
    const idPagamento = req.query.payment_id || req.query.collection_id;
    const referenciaExterna = req.query.external_reference || '';
    const pedidoPendente = req.session.pedidoPendenteMercadoPago;

    if (!idPagamento) {
        return res.status(400).send(montarHtmlMensagem(
            'Pagamento nao encontrado',
            'O Mercado Pago nao retornou o codigo do pagamento.',
            'Voltar ao carrinho',
            '/resumo'
        ));
    }

    if (!pedidoPendente) {
        return res.status(400).send(montarHtmlMensagem(
            'Sessao expirada',
            'Nao encontramos os dados do pedido na sessao. Refaca o checkout.',
            'Voltar ao carrinho',
            '/resumo'
        ));
    }

    if (pedidoPendente.referenciaExterna !== referenciaExterna) {
        return res.status(400).send(montarHtmlMensagem(
            'Referencia invalida',
            'O retorno do pagamento nao corresponde ao pedido atual.',
            'Voltar ao carrinho',
            '/resumo'
        ));
    }

    if (
        req.session.pedidoConfirmadoMercadoPago &&
        req.session.pedidoConfirmadoMercadoPago.referenciaExterna === referenciaExterna
    ) {
        return res.send(req.session.pedidoConfirmadoMercadoPago.html);
    }

    try {
        const dadosPagamento = await consultarPagamentoMercadoPago(idPagamento);

        if (dadosPagamento.status !== 'approved') {
            return res.status(400).send(montarHtmlMensagem(
                'Pagamento ainda nao aprovado',
                `O status atual do pagamento e ${dadosPagamento.status || 'desconhecido'}.`,
                'Voltar ao carrinho',
                '/resumo'
            ));
        }

        const cesta = obterCestaDaSessao(req);
        const dadosFrete = req.session.frete || {};

        if (cesta.length === 0) {
            return res.status(400).send(montarHtmlMensagem(
                'Carrinho vazio',
                'Nao foi possivel localizar os itens do pedido para concluir a gravacao.',
                'Voltar ao catalogo',
                '/catalogo'
            ));
        }

        const pedidoRegistrado = await registrarPedidoNoGestor(
            pedidoPendente.dadosCliente,
            cesta,
            dadosFrete,
            pedidoPendente.totalFormatado
        );

        const html = montarHtmlPedidoConfirmado(
            pedidoPendente.dadosCliente,
            pedidoRegistrado.enderecoEntrega,
            pedidoPendente.totalFormatado,
            dadosFrete,
            pedidoRegistrado.idPedidoGerado,
            {
                id: dadosPagamento.id,
                status: dadosPagamento.status
            }
        );

        req.session.pedidoConfirmadoMercadoPago = {
            referenciaExterna,
            html
        };
        req.session.pedidoPendenteMercadoPago = null;
        req.session.cesta = [];
        req.session.frete = null;

        res.send(html);
    } catch (erro) {
        console.error('Erro ao confirmar pagamento com Mercado Pago:', erro.detalhes || erro.message || erro);

        if (erro.status === 409) {
            return res.status(409).send(montarHtmlMensagem(
                'Estoque indisponivel',
                'O pagamento foi aprovado, mas um dos itens ficou sem estoque antes da confirmacao do pedido. Revise o pedido no gestor antes de seguir.',
                'Voltar ao carrinho',
                '/resumo'
            ));
        }

        res.status(500).send(montarHtmlMensagem(
            'Erro ao confirmar pedido',
            'O pagamento foi retornado, mas nao conseguimos concluir a gravacao do pedido agora.',
            'Voltar ao carrinho',
            '/resumo'
        ));
    }
});

router.get('/pagamento/pendente', (req, res) => {
    res.send(montarHtmlMensagem(
        'Pagamento pendente',
        'O Mercado Pago informou que o pagamento ainda esta pendente. Assim que for aprovado, refaca o retorno pelo checkout.',
        'Voltar ao carrinho',
        '/resumo'
    ));
});

router.get('/pagamento/falha', (req, res) => {
    res.send(montarHtmlMensagem(
        'Pagamento nao concluido',
        'O pagamento foi cancelado ou recusado. Voce pode revisar os dados e tentar novamente.',
        'Voltar ao carrinho',
        '/resumo'
    ));
});

module.exports = router;
