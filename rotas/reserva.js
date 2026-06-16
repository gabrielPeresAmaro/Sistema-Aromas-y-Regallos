const express = require('express');
const router = express.Router();

const { obterConfiguracaoMelhorEnvio } = require('../config/melhor-envio');
const { obterConfiguracaoMercadoPago, tokenMercadoPagoPareceValido } = require('../config/mercado-pago');
const { normalizarNumero } = require('../config/volumetria');

function registrarDebugFrete(etiqueta, dados) {
    if (process.env.DEBUG_FRETE !== '1') {
        return;
    }

    console.log(`[frete] ${etiqueta}: ${JSON.stringify(dados)}`);
}

function formatarMoeda(valor) {
    return Number(valor || 0).toFixed(2);
}

function formatarCep(cepInformado) {
    const cepLimpo = String(cepInformado || '').replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
        return cepLimpo;
    }

    return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
}

function escaparHtml(texto) {
    return String(texto || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function obterNomeESobrenome(nomeCompleto) {
    const nomeTratado = String(nomeCompleto || '').trim();
    const partesNome = nomeTratado.split(/\s+/).filter(Boolean);

    if (partesNome.length === 0) {
        return { nome: '', sobrenome: '' };
    }

    if (partesNome.length === 1) {
        return { nome: partesNome[0], sobrenome: partesNome[0] };
    }

    return {
        nome: partesNome[0],
        sobrenome: partesNome.slice(1).join(' ')
    };
}

function montarEnderecoEntrega(dadosCliente) {
    return [
        `${dadosCliente.rua}, ${dadosCliente.numero}`,
        dadosCliente.complemento ? `Compl.: ${dadosCliente.complemento}` : '',
        `${dadosCliente.bairro} - ${dadosCliente.cidade}/${String(dadosCliente.estado).toUpperCase()}`,
        `CEP: ${formatarCep(dadosCliente.cep)}`
    ].filter(Boolean).join(' | ');
}

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

function gerarReferenciaExterna() {
    return `pedido_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function urlLojaEhLocal(urlLoja) {
    return /localhost|127\.0\.0\.1|::1/i.test(String(urlLoja || ''));
}

function montarHtmlMensagem(titulo, mensagem, linkTexto, linkUrl) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="/style.css">
        <title>${escaparHtml(titulo)}</title>
    </head>
    <body style="color: black; padding: 20px; text-align: center;">
        <h1>${escaparHtml(titulo)}</h1>
        <p>${escaparHtml(mensagem)}</p>
        <br/><a href="${linkUrl}" class="btn-item" style="text-decoration:none; display:inline-block;">${escaparHtml(linkTexto)}</a>
    </body>
    </html>`;
}

function montarHtmlPedidoConfirmado(dadosCliente, enderecoEntrega, totalFormatado, dadosFrete, idPedidoGerado, dadosPagamento) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="/style.css">
        <title>Pedido Confirmado</title>
    </head>
    <body style="color: black; padding: 20px; text-align: center;">
        <h1 style="color: green;">Pedido Confirmado com sucesso!</h1>
        <div style="text-align: left; max-width: 460px; margin: 20px auto; background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
            <p><strong>No do pedido:</strong> #${escaparHtml(idPedidoGerado)}</p>
            <p><strong>Nome:</strong> ${escaparHtml(dadosCliente.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> ${escaparHtml(dadosCliente.cpf)}</p>
            <p><strong>Telefone:</strong> ${escaparHtml(dadosCliente.telefone)}</p>
            <p><strong>E-mail:</strong> ${escaparHtml(dadosCliente.email)}</p>
            <p><strong>Endereco:</strong> ${escaparHtml(enderecoEntrega)}</p>
            <p><strong>Frete:</strong> ${escaparHtml(dadosFrete.transportadora || 'Melhor Envio')} - ${escaparHtml(dadosFrete.servico || 'Cotacao')} (R$ ${Number(dadosFrete.valor || 0).toFixed(2)})</p>
            <p><strong>Pagamento:</strong> Mercado Pago - ${escaparHtml(dadosPagamento.status || 'approved')}</p>
            <p><strong>Codigo do pagamento:</strong> ${escaparHtml(dadosPagamento.id || '-')}</p>
            <h3>Valor pago total: R$ ${Number(totalFormatado || 0).toFixed(2)}</h3>
        </div>
        <br/><a href="/catalogo" class="btn-item" style="text-decoration:none; display:inline-block;">Voltar ao Catalogo</a>
    </body>
    </html>`;
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
        throw new Error('A API do gestor recusou o cadastro do pedido.');
    }

    const resultadoBD = await respostaApi.json();
    const idPedidoGerado = resultadoBD.pedido?.codigo || resultadoBD.pedido?.id || 'Gravado';

    return {
        idPedidoGerado,
        enderecoEntrega
    };
}

function obterMensagemErroFrete(codigoErro) {
    const mensagens = {
        '1': 'Digite um CEP valido com 8 numeros.',
        '2': 'Configure o token e o CEP de origem do Melhor Envio para calcular o frete.',
        '3': 'Nao foi possivel encontrar uma cotacao valida para este CEP.',
        '4': 'Adicione pelo menos um produto antes de calcular o frete.',
        '5': 'Existem produtos sem peso ou dimensoes validas para cotacao.',
        '6': 'Escolha uma opcao de frete antes de finalizar o pedido.',
        '7': 'O CEP do endereco esta diferente do CEP usado no frete. Recalcule o frete.'
    };

    return mensagens[String(codigoErro || '')] || 'Nao foi possivel calcular o frete agora.';
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

router.post('/adicionar', (req, res) => {
    if (!req.session.cesta) {
        req.session.cesta = [];
    }

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

    if (item.categoria === 'Cesta') {
        req.session.cesta = req.session.cesta.filter(itemAtual => itemAtual.categoria !== 'Cesta');
    }

    req.session.cesta.push(item);
    req.session.frete = null;
    req.session.opcoesFrete = [];

    const paginaOrigem = req.body.origem || '/catalogo';
    res.redirect(`${paginaOrigem}?sucesso=1`);
});

router.post('/remover', (req, res) => {
    const idParaRemover = req.body.id;
    let cesta = req.session.cesta || [];
    req.session.cesta = cesta.filter(item => item.id != idParaRemover);
    req.session.frete = null;
    req.session.opcoesFrete = [];
    res.redirect('/resumo');
});

router.get('/resumo', (req, res) => {
    let cesta = req.session.cesta || [];
    let opcoesFrete = req.session.opcoesFrete || [];
    let dadosFrete = req.session.frete || {
        valor: 0,
        prazo: 0,
        cepCalculado: '',
        transportadora: '',
        servico: ''
    };
    const cepCalculadoResumo = dadosFrete.cepCalculado || opcoesFrete[0]?.cepCalculado || '';
    const cestaEscolhida = cesta.find(item => item.categoria === 'Cesta');
    let capacidadeMaxCesta = cestaEscolhida ? cestaEscolhida.volume : 0.00;

    let volumeItensOcupado = cesta
        .filter(item => item.categoria !== 'Cesta')
        .reduce((acumulador, item) => acumulador + item.volume, 0);

    let subtotal = cesta.reduce((acumulador, item) => acumulador + item.preco, 0);
    let totalComFrete = subtotal + dadosFrete.valor;
    let opcoesFreteHtml = opcoesFrete.map(opcaoFrete => `
        <label style="display: block; border: 1px solid #ddd; padding: 12px; border-radius: 8px; margin-top: 10px; cursor: pointer;">
            <input type="radio" name="codigo_frete" value="${escaparHtml(opcaoFrete.codigo)}" ${dadosFrete.codigo === opcaoFrete.codigo ? 'checked' : ''}>
            <strong>${escaparHtml(opcaoFrete.transportadora)}</strong> - ${escaparHtml(opcaoFrete.servico)}<br>
            <span>R$ ${formatarMoeda(opcaoFrete.valor)} | ${opcaoFrete.prazo} dias uteis</span>
        </label>
    `).join('');

    let itensHtml = cesta.map(item => `
        <div class="item-reserva">
            <div class="item-info">
                <img src="${item.imagem}" class="item-foto">
                <div>
                    <p class="texto-negrito">${item.nome}</p>
                    <p class="texto-cinza">R$ ${item.preco.toFixed(2)}</p>
                    <p class="texto-cinza">
                        ${item.categoria === 'Cesta'
        ? `Capacidade: ${item.volume.toFixed(2)}L`
        : `Ocupa: ${item.volume.toFixed(2)}L`}
                    </p>
                </div>
            </div>
            <form action="/remover" method="POST">
                <input type="hidden" name="id" value="${item.id}">
                <button type="submit" class="btn-remover">Remover</button>
            </form>
        </div>
    `).join('');

    res.send(`
        <html>
        <head><link rel="stylesheet" href="/style.css"></head>
        <body>
            <header class="header-preto"><h1>Minha Cesta</h1></header>
            <div class="conteudo-resumo" style="max-width: 600px; margin: 20px auto; padding: 20px;">
                ${itensHtml || '<p style="text-align: center; color: black;">Sua cesta esta vazia.</p>'}
                <hr>

                <div class="secao-frete">
                    <h4>Calcular Frete (Melhor Envio)</h4>
                    <form action="/calcular-frete" method="POST" class="form-frete">
                        <input type="text" name="cep" placeholder="Digite seu CEP" value="${formatarCep(cepCalculadoResumo)}" maxlength="9" required class="input-frete">
                        <button type="submit" class="btn-add">Calcular</button>
                    </form>

                    ${opcoesFrete.length > 0 ? `
                        <form action="/selecionar-frete" method="POST" style="margin-top: 15px;">
                            <p><strong>Escolha o frete:</strong></p>
                            ${opcoesFreteHtml}
                            <button type="submit" class="btn-add" style="margin-top: 12px;">Usar este frete</button>
                        </form>
                    ` : ''}

                    ${dadosFrete.valor > 0 ? `
                        <div class="resultado-frete">
                            <p><strong>CEP calculado:</strong> ${formatarCep(dadosFrete.cepCalculado)}</p>
                            <p><strong>Transportadora:</strong> ${dadosFrete.transportadora}</p>
                            <p><strong>Servico:</strong> ${dadosFrete.servico}</p>
                            <p><strong>Valor do frete:</strong> R$ ${formatarMoeda(dadosFrete.valor)}</p>
                            <p><strong>Prazo estimado:</strong> ${dadosFrete.prazo} dias uteis</p>
                        </div>
                    ` : ''}
                </div>

                <hr>
                <div class="total-reserva">
                    <p class="texto-subtotal">Subtotal: R$ ${formatarMoeda(subtotal)}</p>
                    ${dadosFrete.valor > 0 ? `<p class="texto-frete-sucesso">Frete: R$ ${formatarMoeda(dadosFrete.valor)}</p>` : ''}
                    <h3>Total Geral: R$ ${formatarMoeda(totalComFrete)}</h3>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
                    ${cestaEscolhida ? `
                        <p style="color: black; font-size: 0.95rem;">
                            Modelo da cesta: <strong>${cestaEscolhida.nome}</strong>
                        </p>
                        <h4 style="color: black; margin-top: 5px;">
                            Ocupacao do espaco: <span style="color: ${volumeItensOcupado > capacidadeMaxCesta ? 'red' : 'green'}">
                                ${volumeItensOcupado.toFixed(2)}L
                            </span> de ${capacidadeMaxCesta.toFixed(2)}L utilizados
                        </h4>
                    ` : `
                        <h4 style="color: #ffcc00; margin-top: 5px;">Nenhuma cesta adicionada ao pedido ainda.</h4>
                    `}
                </div>

                <div style="margin-top: 30px;">
                    <a href="/catalogo" class="btn-item" style="text-decoration: none; display: block; margin-bottom: 10px; text-align: center;">Continuar Comprando</a>
                    ${cestaEscolhida && dadosFrete.valor > 0 ? `
                        <a href="/dados-cliente?total=${totalComFrete}" class="btn-item" style="text-decoration: none; display: block; text-align: center;">Finalizar Pedido</a>
                    ` : cestaEscolhida ? `
                        <button class="btn-item" disabled style="background: gray; cursor: not-allowed; width: 100%;">Calcule e Escolha o Frete</button>
                    ` : `
                        <button class="btn-item" disabled style="background: gray; cursor: not-allowed; width: 100%;">Escolha uma Cesta para Finalizar</button>
                    `}
                </div>
            </div>

            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const codigoErroFrete = urlParams.get('erro_frete');

                if (codigoErroFrete) {
                    const mapaMensagens = {
                        '1': '${obterMensagemErroFrete('1')}',
                        '2': '${obterMensagemErroFrete('2')}',
                        '3': '${obterMensagemErroFrete('3')}',
                        '4': '${obterMensagemErroFrete('4')}',
                        '5': '${obterMensagemErroFrete('5')}',
                        '6': '${obterMensagemErroFrete('6')}',
                        '7': '${obterMensagemErroFrete('7')}'
                    };

                    alert(mapaMensagens[codigoErroFrete] || '${obterMensagemErroFrete('0')}');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            </script>
        </body>
        </html>
    `);
});

router.get('/dados-cliente', (req, res) => {
    let dadosFrete = req.session.frete || {
        valor: 0,
        cepCalculado: '',
        transportadora: '',
        servico: '',
        prazo: 0
    };
    let cesta = req.session.cesta || [];

    if (cesta.length === 0) {
        return res.redirect('/resumo');
    }

    if (!dadosFrete.cepCalculado || dadosFrete.valor <= 0) {
        return res.redirect('/resumo?erro_frete=3');
    }

    let subtotal = cesta.reduce((acumulador, item) => acumulador + item.preco, 0);
    let totalGeral = subtotal + dadosFrete.valor;

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="/style.css">
        <title>Dados de Entrega</title>
    </head>
    <body style="color: black; padding: 20px; max-width: 500px; margin: 0 auto;">
        <h2>Dados do cliente</h2>

        <form action="/iniciar-pagamento" method="POST">
            <input type="hidden" name="total" value="${totalGeral}">

            <label for="nome">Nome completo:</label><br>
            <input type="text" id="nome" name="nome" maxlength="100" required><br><br>

            <label for="email">E-mail:</label><br>
            <input type="email" id="email" name="email" maxlength="120" required><br><br>

            <label for="cpf">CPF ou CNPJ:</label><br>
            <input type="text" id="cpf" name="cpf" required><br><br>

            <label for="telefone">Telefone:</label><br>
            <input type="text" id="telefone" name="telefone" maxlength="20" required><br><br>

            <label for="cep">CEP:</label><br>
            <input type="text" id="cep" name="cep" value="${formatarCep(dadosFrete.cepCalculado)}" maxlength="9" required><br>
            <small style="color: green;">Frete escolhido: ${dadosFrete.transportadora || 'Melhor Envio'} - ${dadosFrete.servico || 'Cotacao'} (${dadosFrete.prazo || 0} dias uteis)</small><br><br>

            <label for="rua">Rua:</label><br>
            <input type="text" id="rua" name="rua" maxlength="120" required><br><br>

            <label for="numero">Numero:</label><br>
            <input type="text" id="numero" name="numero" maxlength="20" required><br><br>

            <label for="bairro">Bairro:</label><br>
            <input type="text" id="bairro" name="bairro" maxlength="80" required><br><br>

            <label for="cidade">Cidade:</label><br>
            <input type="text" id="cidade" name="cidade" maxlength="80" required><br><br>

            <label for="estado">Estado (UF):</label><br>
            <input type="text" id="estado" name="estado" maxlength="2" required><br><br>

            <label for="complemento">Complemento:</label><br>
            <input type="text" id="complemento" name="complemento" maxlength="80"><br><br>

            <button type="submit" class="btn-item" style="width: 100%;">Ir para Pagamento</button>
        </form>

        <script>
            async function buscarCep() {
                const campoCep = document.getElementById('cep');
                const campoRua = document.getElementById('rua');
                const campoBairro = document.getElementById('bairro');
                const campoCidade = document.getElementById('cidade');
                const campoEstado = document.getElementById('estado');
                const cepLimpo = String(campoCep.value || '').replace(/\\D/g, '');

                if (cepLimpo.length !== 8) {
                    return;
                }

                try {
                    const respostaCep = await fetch('https://viacep.com.br/ws/' + cepLimpo + '/json/');
                    const endereco = await respostaCep.json();

                    if (endereco.erro) {
                        alert('CEP nao encontrado.');
                        return;
                    }

                    campoRua.value = endereco.logradouro || '';
                    campoBairro.value = endereco.bairro || '';
                    campoCidade.value = endereco.localidade || '';
                    campoEstado.value = endereco.uf || '';
                } catch (erro) {
                    console.error('Erro ao buscar CEP:', erro);
                    alert('Nao foi possivel consultar o CEP agora.');
                }
            }

            document.getElementById('cep').addEventListener('blur', buscarCep);
            buscarCep();
        </script>

        <br/><a href="/resumo" class="btn-voltar">Voltar ao Carrinho</a>
    </body>
    </html>`;

    res.send(html);
});

router.post('/calcular-frete', async (req, res) => {
    const cepDestino = String(req.body.cep || '').replace(/\D/g, '');
    const cesta = req.session.cesta || [];

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

    const cesta = req.session.cesta || [];
    if (cesta.length === 0) {
        return res.send('Erro - Seu carrinho esta vazio.<br/><br/><a href="/catalogo">Voltar ao Catalogo</a>');
    }

    try {
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
            'Nao encontramos os dados do pedido na sessao. Refaça o checkout.',
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

        const cesta = req.session.cesta || [];
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
