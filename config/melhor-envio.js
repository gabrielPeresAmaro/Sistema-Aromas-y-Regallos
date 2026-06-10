function obterConfiguracaoMelhorEnvio() {
    const ambienteMelhorEnvio = process.env.MELHOR_ENVIO_AMBIENTE === 'producao'
        ? 'producao'
        : 'sandbox';

    const urlBaseMelhorEnvio = process.env.MELHOR_ENVIO_URL_BASE || (
        ambienteMelhorEnvio === 'producao'
            ? 'https://www.melhorenvio.com.br/api/v2/me'
            : 'https://sandbox.melhorenvio.com.br/api/v2/me'
    );

    return {
        ambiente: ambienteMelhorEnvio,
        urlBase: urlBaseMelhorEnvio,
        token: process.env.MELHOR_ENVIO_TOKEN || '',
        cepOrigem: (process.env.MELHOR_ENVIO_CEP_ORIGEM || '').replace(/\D/g, ''),
        userAgent: process.env.MELHOR_ENVIO_USER_AGENT || 'Aromas y Regallos <contato@exemplo.com>',
        servicos: process.env.MELHOR_ENVIO_SERVICOS || ''
    };
}

module.exports = {
    obterConfiguracaoMelhorEnvio
};
