const express = require('express');
const router = express.Router();

const { obterConfiguracaoMelhorEnvio } = require('../config/melhor-envio');
const { normalizarNumero } = require('../config/volumetria');

function registrarDebugFrete(etiqueta, dados) {
    if (process.env.DEBUG_FRETE !== '1') {
        return;
    }

    console.log(`[frete] ${etiqueta}: ${JSON.stringify(dados)}`);
}

function formatarCep(cepInformado) {
    const cepLimpo = String(cepInformado || '').replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
        return cepLimpo;
    }

    return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
}

function obterMensagemErroFrete(codigoErro) {
    const mensagens = {
        '1': 'Digite um CEP valido com 8 numeros.',
        '2': 'Configure o token e o CEP de origem do Melhor Envio para calcular o frete.',
        '3': 'Nao foi possivel encontrar uma cotacao valida para este CEP.',
        '4': 'Adicione pelo menos um produto antes de calcular o frete.',
        '5': 'Existem produtos sem peso ou dimensoes validas para cotacao.'
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

function escolherMelhorCotacao(opcoesFrete) {
    const opcoesValidas = opcoesFrete
        .filter(opcaoFrete => !opcaoFrete.error)
        .filter(opcaoFrete => Number.isFinite(Number.parseFloat(opcaoFrete.price)));

    if (opcoesValidas.length === 0) {
        return null;
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
    })[0];
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
    const melhorOpcao = escolherMelhorCotacao(opcoesFrete);

    if (!melhorOpcao) {
        const erroSemCotacao = new Error('SEM_COTACAO');
        erroSemCotacao.code = 'SEM_COTACAO';
        erroSemCotacao.detalhes = dadosResposta;
        throw erroSemCotacao;
    }

    return {
        valor: Number.parseFloat(melhorOpcao.price),
        prazo: Number.parseInt(melhorOpcao.delivery_time || '0', 10),
        cepCalculado: cepDestino,
        servico: melhorOpcao.name || 'Frete',
        transportadora: melhorOpcao.company?.name || 'Melhor Envio'
    };
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

    const paginaOrigem = req.body.origem || '/catalogo';
    res.redirect(`${paginaOrigem}?sucesso=1`);
});

router.post('/remover', (req, res) => {
    const idParaRemover = req.body.id;
    let cesta = req.session.cesta || [];
    req.session.cesta = cesta.filter(item => item.id != idParaRemover);
    req.session.frete = null;
    res.redirect('/resumo');
});

router.get('/resumo', (req, res) => {
    let cesta = req.session.cesta || [];
    let dadosFrete = req.session.frete || {
        valor: 0,
        prazo: 0,
        cepCalculado: '',
        transportadora: '',
        servico: ''
    };
    const cestaEscolhida = cesta.find(item => item.categoria === 'Cesta');
    let capacidadeMaxCesta = cestaEscolhida ? cestaEscolhida.volume : 0.00;

    let volumeItensOcupado = cesta
        .filter(item => item.categoria !== 'Cesta')
        .reduce((acumulador, item) => acumulador + item.volume, 0);

    let subtotal = cesta.reduce((acumulador, item) => acumulador + item.preco, 0);
    let totalComFrete = subtotal + dadosFrete.valor;

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
                        <input type="text" name="cep" placeholder="Digite seu CEP" value="${formatarCep(dadosFrete.cepCalculado || '')}" maxlength="9" required class="input-frete">
                        <button type="submit" class="btn-add">Calcular</button>
                    </form>

                    ${dadosFrete.valor > 0 ? `
                        <div class="resultado-frete">
                            <p><strong>CEP calculado:</strong> ${formatarCep(dadosFrete.cepCalculado)}</p>
                            <p><strong>Transportadora:</strong> ${dadosFrete.transportadora}</p>
                            <p><strong>Servico:</strong> ${dadosFrete.servico}</p>
                            <p><strong>Valor do frete:</strong> R$ ${dadosFrete.valor.toFixed(2)}</p>
                            <p><strong>Prazo estimado:</strong> ${dadosFrete.prazo} dias uteis</p>
                        </div>
                    ` : ''}
                </div>

                <hr>
                <div class="total-reserva">
                    <p class="texto-subtotal">Subtotal: R$ ${subtotal.toFixed(2)}</p>
                    ${dadosFrete.valor > 0 ? `<p class="texto-frete-sucesso">Frete: R$ ${dadosFrete.valor.toFixed(2)}</p>` : ''}
                    <h3>Total Geral: R$ ${totalComFrete.toFixed(2)}</h3>

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
                        <button class="btn-item" disabled style="background: gray; cursor: not-allowed; width: 100%;">Calcule o Frete para Finalizar</button>
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
                        '5': '${obterMensagemErroFrete('5')}'
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

        <form action="/tela-confirmacao" method="POST">
            <input type="hidden" name="total" value="${totalGeral}">

            <label for="nome">Nome completo:</label><br>
            <input type="text" id="nome" name="nome" maxlength="100" required><br><br>

            <label for="cpf">CPF ou CNPJ:</label><br>
            <input type="text" id="cpf" name="cpf" required><br><br>

            <label for="telefone">Telefone:</label><br>
            <input type="text" id="telefone" name="telefone" maxlength="20" required><br><br>

            <label for="cep">CEP:</label><br>
            <input type="text" id="cep" name="cep" value="${formatarCep(dadosFrete.cepCalculado)}" required readonly style="background: #eee;"><br>
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

            <button type="submit" class="btn-item" style="width: 100%;">Confirmar e Registrar Reserva</button>
        </form>

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
        const dadosFrete = await cotarFreteMelhorEnvio(cesta, cepDestino);
        req.session.frete = dadosFrete;
        res.redirect('/resumo');
    } catch (erro) {
        console.error('Erro ao calcular frete:', erro.detalhes || erro.message || erro);

        if (erro.code === 'MELHOR_ENVIO_NAO_CONFIGURADO') {
            return res.redirect('/resumo?erro_frete=2');
        }

        res.redirect('/resumo?erro_frete=3');
    }
});

router.post('/tela-confirmacao', async (req, res) => {
    if (!req.session.frete) {
        return res.send('Erro - Informacoes de frete nao encontradas na sessao.<br/><br/><a href="/resumo">Voltar ao Carrinho</a>');
    }

    const {
        nome,
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

    if (!nome || !cpf || !telefone || !cep || !rua || !numero || !bairro || !cidade || !estado) {
        return res.send('Erro - nao pode haver campo de dado em branco.<br/><br/><a href="/dados-cliente">Voltar</a>');
    }

    let cesta = req.session.cesta || [];
    if (cesta.length === 0) {
        return res.send('Erro - Seu carrinho esta vazio.<br/><br/><a href="/catalogo">Voltar ao Catalogo</a>');
    }

    try {
        const listaCodigos = cesta
            .map(item => item.codigo)
            .filter(codigoProduto => Number.isInteger(codigoProduto));

        if (listaCodigos.length !== cesta.length) {
            throw new Error('Existem produtos na cesta sem codigo valido para gravacao do pedido.');
        }

        const enderecoEntrega = [
            `${rua}, ${numero}`,
            complemento ? `Compl.: ${complemento}` : '',
            `${bairro} - ${cidade}/${String(estado).toUpperCase()}`,
            `CEP: ${formatarCep(cep)}`
        ].filter(Boolean).join(' | ');

        const pedidoParaEnviar = {
            cliente_nome: nome,
            cliente_cpf_cnpj: cpf,
            cliente_telefone: telefone,
            lista_codigos_produtos: listaCodigos,
            preco_total: totalFormatado,
            entrega_destinatario_nome: nome,
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
        const dadosFrete = req.session.frete || {};

        const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="/style.css">
            <title>Pedido Confirmado</title>
        </head>
        <body style="color: black; padding: 20px; text-align: center;">
            <h1 style="color: green;">Pedido Confirmado com sucesso!</h1>
            <div style="text-align: left; max-width: 400px; margin: 20px auto; background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                <p><strong>No do pedido:</strong> #${idPedidoGerado}</p>
                <p><strong>Nome:</strong> ${nome}</p>
                <p><strong>CPF/CNPJ:</strong> ${cpf}</p>
                <p><strong>Telefone:</strong> ${telefone}</p>
                <p><strong>Endereco:</strong> ${enderecoEntrega}</p>
                <p><strong>Frete:</strong> ${dadosFrete.transportadora || 'Melhor Envio'} - ${dadosFrete.servico || 'Cotacao'} (R$ ${(dadosFrete.valor || 0).toFixed(2)})</p>
                <h3>Valor pago total: R$ ${totalFormatado.toFixed(2)}</h3>
            </div>
            <br/><a href="/catalogo" class="btn-item" style="text-decoration:none; display:inline-block;">Voltar ao Catalogo</a>
        </body>
        </html>`;

        req.session.cesta = [];
        req.session.frete = null;

        res.send(html);
    } catch (erro) {
        console.error('Erro critico ao salvar pedido no banco de dados:', erro);
        res.status(500).send('Erro interno ao processar e salvar seu pedido no sistema gestor.<br/><br/><a href="/resumo">Voltar ao Carrinho</a>');
    }
});

module.exports = router;
