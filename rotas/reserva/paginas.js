const {
    escaparHtml,
    formatarCep,
    formatarMoeda,
    obterMensagemErroEstoque,
    obterMensagemErroFrete
} = require('./utilitarios');

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

function montarPaginaResumo(cesta, opcoesFrete, dadosFrete) {
    const cepCalculadoResumo = dadosFrete.cepCalculado || opcoesFrete[0]?.cepCalculado || '';
    const cestaEscolhida = cesta.find(item => item.categoria === 'Cesta');
    const capacidadeMaxCesta = cestaEscolhida ? cestaEscolhida.volume : 0.00;
    const volumeItensOcupado = cesta
        .filter(item => item.categoria !== 'Cesta')
        .reduce((acumulador, item) => acumulador + item.volume, 0);
    const subtotal = cesta.reduce((acumulador, item) => acumulador + item.preco, 0);
    const totalComFrete = subtotal + dadosFrete.valor;

    const opcoesFreteHtml = opcoesFrete.map(opcaoFrete => `
        <label style="display: block; border: 1px solid #ddd; padding: 12px; border-radius: 8px; margin-top: 10px; cursor: pointer;">
            <input type="radio" name="codigo_frete" value="${escaparHtml(opcaoFrete.codigo)}" ${dadosFrete.codigo === opcaoFrete.codigo ? 'checked' : ''}>
            <strong>${escaparHtml(opcaoFrete.transportadora)}</strong> - ${escaparHtml(opcaoFrete.servico)}<br>
            <span>R$ ${formatarMoeda(opcaoFrete.valor)} | ${opcaoFrete.prazo} dias uteis</span>
        </label>
    `).join('');

    const itensHtml = cesta.map(item => `
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

    return `
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
                const codigoErroEstoque = urlParams.get('erro_estoque');

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

                if (codigoErroEstoque) {
                    const mapaMensagensEstoque = {
                        '1': '${obterMensagemErroEstoque('1')}',
                        '2': '${obterMensagemErroEstoque('2')}',
                        '3': '${obterMensagemErroEstoque('3')}'
                    };

                    alert(mapaMensagensEstoque[codigoErroEstoque] || '${obterMensagemErroEstoque('0')}');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            </script>
        </body>
        </html>
    `;
}

function montarPaginaDadosCliente(cesta, dadosFrete) {
    const subtotal = cesta.reduce((acumulador, item) => acumulador + item.preco, 0);
    const totalGeral = subtotal + dadosFrete.valor;

    return `
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
}

module.exports = {
    montarHtmlMensagem,
    montarHtmlPedidoConfirmado,
    montarPaginaDadosCliente,
    montarPaginaResumo
};
