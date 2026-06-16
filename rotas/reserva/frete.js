const { obterConfiguracaoMelhorEnvio } = require('../../config/melhor-envio');
const { normalizarNumero } = require('../../config/volumetria');

function registrarDebugFrete(etiqueta, dados) {
    if (process.env.DEBUG_FRETE !== '1') {
        return;
    }

    console.log(`[frete] ${etiqueta}: ${JSON.stringify(dados)}`);
}

function montarProdutosMelhorEnvio(cesta) {
    return cesta.map((item, indice) => ({
        id: String(item.codigo || item.id || indice + 1),
        width: Math.max(11, Math.round(normalizarNumero(item.largura_cm))),
        height: Math.max(2, Math.round(normalizarNumero(item.altura_cm))),
        length: Math.max(16, Math.round(normalizarNumero(item.profundidade_cm))),
        weight: Number(Math.max(0.1, normalizarNumero(item.peso_kg, 3)).toFixed(3)),
        insurance_value: Number(normalizarNumero(item.preco).toFixed(2)),
        quantity: 1
    }));
}

function cestaTemVolumetriaCompleta(cesta) {
    return cesta.every(item => (
        normalizarNumero(item.altura_cm) > 0 &&
        normalizarNumero(item.largura_cm) > 0 &&
        normalizarNumero(item.profundidade_cm) > 0 &&
        normalizarNumero(item.peso_kg, 3) > 0
    ));
}

function normalizarOpcoesFrete(opcoesFrete, cepDestino) {
    const opcoesValidas = opcoesFrete
        .filter(opcaoFrete => !opcaoFrete.error)
        .filter(opcaoFrete => Number.isFinite(Number.parseFloat(opcaoFrete.price)));

    if (opcoesValidas.length === 0) {
        return [];
    }

    return opcoesValidas.sort((opcaoAtual, proximaOpcao) => {
        const valorAtual = Number.parseFloat(opcaoAtual.price);
        const valorProximo = Number.parseFloat(proximaOpcao.price);

        if (valorAtual !== valorProximo) {
            return valorAtual - valorProximo;
        }

        const prazoAtual = Number.parseInt(opcaoAtual.delivery_time || '999', 10);
        const prazoProximo = Number.parseInt(proximaOpcao.delivery_time || '999', 10);

        return prazoAtual - prazoProximo;
    }).map((opcaoFrete, indice) => ({
        codigo: String(indice + 1),
        valor: Number.parseFloat(opcaoFrete.price),
        prazo: Number.parseInt(opcaoFrete.delivery_time || '0', 10),
        cepCalculado: cepDestino,
        servico: opcaoFrete.name || 'Frete',
        transportadora: opcaoFrete.company?.name || 'Melhor Envio'
    }));
}

async function cotarFreteMelhorEnvio(cesta, cepDestino) {
    const configuracaoMelhorEnvio = obterConfiguracaoMelhorEnvio();

    if (!configuracaoMelhorEnvio.token || !configuracaoMelhorEnvio.cepOrigem) {
        const erroConfiguracao = new Error('MELHOR_ENVIO_NAO_CONFIGURADO');
        erroConfiguracao.code = 'MELHOR_ENVIO_NAO_CONFIGURADO';
        throw erroConfiguracao;
    }

    const corpoCotacao = {
        from: { postal_code: configuracaoMelhorEnvio.cepOrigem },
        to: { postal_code: cepDestino },
        products: montarProdutosMelhorEnvio(cesta)
    };

    if (configuracaoMelhorEnvio.servicos) {
        corpoCotacao.services = configuracaoMelhorEnvio.servicos;
    }

    registrarDebugFrete('corpo-cotacao', corpoCotacao);

    const respostaMelhorEnvio = await fetch(
        `${configuracaoMelhorEnvio.urlBase}/shipment/calculate`,
        {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${configuracaoMelhorEnvio.token}`,
                'Content-Type': 'application/json',
                'User-Agent': configuracaoMelhorEnvio.userAgent
            },
            body: JSON.stringify(corpoCotacao)
        }
    );

    const textoResposta = await respostaMelhorEnvio.text();
    registrarDebugFrete('resposta-melhor-envio', {
        status: respostaMelhorEnvio.status,
        ok: respostaMelhorEnvio.ok,
        textoResposta
    });
    let dadosResposta = [];

    try {
        dadosResposta = JSON.parse(textoResposta);
    } catch (erro) {
        dadosResposta = [];
    }

    if (!respostaMelhorEnvio.ok) {
        const erroApi = new Error('ERRO_API_MELHOR_ENVIO');
        erroApi.code = 'ERRO_API_MELHOR_ENVIO';
        erroApi.detalhes = textoResposta;
        throw erroApi;
    }

    const opcoesFrete = Array.isArray(dadosResposta) ? dadosResposta : [];
    const opcoesNormalizadas = normalizarOpcoesFrete(opcoesFrete, cepDestino);

    if (opcoesNormalizadas.length === 0) {
        const erroSemCotacao = new Error('SEM_COTACAO');
        erroSemCotacao.code = 'SEM_COTACAO';
        erroSemCotacao.detalhes = dadosResposta;
        throw erroSemCotacao;
    }

    return opcoesNormalizadas;
}

module.exports = {
    cestaTemVolumetriaCompleta,
    cotarFreteMelhorEnvio
};
