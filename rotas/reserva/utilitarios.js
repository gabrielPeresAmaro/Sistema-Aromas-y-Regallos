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

function gerarReferenciaExterna() {
    return `pedido_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function urlLojaEhLocal(urlLoja) {
    return /localhost|127\.0\.0\.1|::1/i.test(String(urlLoja || ''));
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

function obterMensagemErroEstoque(codigoErro) {
    const mensagens = {
        '1': 'Este produto nao possui estoque disponivel no momento.',
        '2': 'Nao foi possivel validar o estoque agora. Tente novamente.',
        '3': 'Um ou mais produtos do carrinho ficaram sem estoque. Revise o pedido antes de pagar.'
    };

    return mensagens[String(codigoErro || '')] || 'Nao foi possivel validar o estoque agora.';
}

module.exports = {
    escaparHtml,
    formatarCep,
    formatarMoeda,
    gerarReferenciaExterna,
    montarEnderecoEntrega,
    obterMensagemErroEstoque,
    obterMensagemErroFrete,
    obterNomeESobrenome,
    urlLojaEhLocal
};
