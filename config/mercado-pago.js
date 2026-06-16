function obterConfiguracaoMercadoPago() {
    return {
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
        ambiente: process.env.MERCADO_PAGO_AMBIENTE === 'sandbox' ? 'sandbox' : 'producao',
        urlBaseApi: process.env.MERCADO_PAGO_URL_BASE_API || 'https://api.mercadopago.com',
        urlLoja: (process.env.MERCADO_PAGO_URL_LOJA || 'http://localhost:3000').replace(/\/$/, '')
    };
}

function tokenMercadoPagoPareceValido(accessToken) {
    const token = String(accessToken || '').trim();

    return token.startsWith('APP_USR-') || token.startsWith('TEST-');
}

module.exports = {
    obterConfiguracaoMercadoPago,
    tokenMercadoPagoPareceValido
};
