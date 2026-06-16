const { obterConfiguracaoMercadoPago, tokenMercadoPagoPareceValido } = require('../../config/mercado-pago');
const {
    gerarReferenciaExterna,
    obterNomeESobrenome,
    urlLojaEhLocal
} = require('./utilitarios');

function montarItensMercadoPago(cesta, dadosFrete) {
    const itens = cesta.map(item => ({
        id: String(item.codigo || item.id),
        title: item.nome,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(Number(item.preco || 0).toFixed(2))
    }));

    if ((dadosFrete?.valor || 0) > 0) {
        itens.push({
            id: 'frete',
            title: `Frete - ${dadosFrete.transportadora || 'Melhor Envio'} ${dadosFrete.servico ? `(${dadosFrete.servico})` : ''}`.trim(),
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(Number(dadosFrete.valor || 0).toFixed(2))
        });
    }

    return itens;
}

async function criarPreferenciaMercadoPago(dadosCliente, cesta, dadosFrete) {
    const configuracaoMercadoPago = obterConfiguracaoMercadoPago();

    if (!configuracaoMercadoPago.accessToken) {
        const erroConfiguracao = new Error('MERCADO_PAGO_NAO_CONFIGURADO');
        erroConfiguracao.code = 'MERCADO_PAGO_NAO_CONFIGURADO';
        throw erroConfiguracao;
    }

    if (!tokenMercadoPagoPareceValido(configuracaoMercadoPago.accessToken)) {
        const erroTokenInvalido = new Error('MERCADO_PAGO_TOKEN_INVALIDO');
        erroTokenInvalido.code = 'MERCADO_PAGO_TOKEN_INVALIDO';
        throw erroTokenInvalido;
    }

    const nomes = obterNomeESobrenome(dadosCliente.nome);
    const referenciaExterna = gerarReferenciaExterna();
    const corpoPreferencia = {
        items: montarItensMercadoPago(cesta, dadosFrete),
        payer: {
            name: nomes.nome,
            surname: nomes.sobrenome,
            email: dadosCliente.email
        },
        back_urls: {
            success: `${configuracaoMercadoPago.urlLoja}/pagamento/sucesso`,
            pending: `${configuracaoMercadoPago.urlLoja}/pagamento/pendente`,
            failure: `${configuracaoMercadoPago.urlLoja}/pagamento/falha`
        },
        external_reference: referenciaExterna
    };

    if (!urlLojaEhLocal(configuracaoMercadoPago.urlLoja)) {
        corpoPreferencia.auto_return = 'approved';
    }

    const respostaMercadoPago = await fetch(
        `${configuracaoMercadoPago.urlBaseApi}/checkout/preferences`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${configuracaoMercadoPago.accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(corpoPreferencia)
        }
    );

    const textoResposta = await respostaMercadoPago.text();
    let dadosResposta = {};

    try {
        dadosResposta = JSON.parse(textoResposta);
    } catch (erro) {
        dadosResposta = {};
    }

    if (!respostaMercadoPago.ok) {
        const erroApi = new Error('ERRO_API_MERCADO_PAGO');
        erroApi.code = 'ERRO_API_MERCADO_PAGO';
        erroApi.detalhes = textoResposta;
        throw erroApi;
    }

    return {
        referenciaExterna,
        urlPagamento: configuracaoMercadoPago.ambiente === 'sandbox'
            ? (dadosResposta.sandbox_init_point || dadosResposta.init_point || '')
            : (dadosResposta.init_point || dadosResposta.sandbox_init_point || '')
    };
}

async function consultarPagamentoMercadoPago(idPagamento) {
    const configuracaoMercadoPago = obterConfiguracaoMercadoPago();

    if (!configuracaoMercadoPago.accessToken) {
        const erroConfiguracao = new Error('MERCADO_PAGO_NAO_CONFIGURADO');
        erroConfiguracao.code = 'MERCADO_PAGO_NAO_CONFIGURADO';
        throw erroConfiguracao;
    }

    if (!tokenMercadoPagoPareceValido(configuracaoMercadoPago.accessToken)) {
        const erroTokenInvalido = new Error('MERCADO_PAGO_TOKEN_INVALIDO');
        erroTokenInvalido.code = 'MERCADO_PAGO_TOKEN_INVALIDO';
        throw erroTokenInvalido;
    }

    const respostaMercadoPago = await fetch(
        `${configuracaoMercadoPago.urlBaseApi}/v1/payments/${idPagamento}`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${configuracaoMercadoPago.accessToken}`,
                'Accept': 'application/json'
            }
        }
    );

    const textoResposta = await respostaMercadoPago.text();
    let dadosResposta = {};

    try {
        dadosResposta = JSON.parse(textoResposta);
    } catch (erro) {
        dadosResposta = {};
    }

    if (!respostaMercadoPago.ok) {
        const erroApi = new Error('ERRO_CONSULTA_MERCADO_PAGO');
        erroApi.code = 'ERRO_CONSULTA_MERCADO_PAGO';
        erroApi.detalhes = textoResposta;
        throw erroApi;
    }

    return dadosResposta;
}

module.exports = {
    consultarPagamentoMercadoPago,
    criarPreferenciaMercadoPago
};
