function normalizarNumero(valorInformado, casasDecimais = 2) {
    const numeroConvertido = Number.parseFloat(valorInformado);

    if (!Number.isFinite(numeroConvertido) || numeroConvertido < 0) {
        return 0;
    }

    return Number(numeroConvertido.toFixed(casasDecimais));
}

function calcularVolumeLitros(alturaCm, larguraCm, profundidadeCm) {
    const alturaNormalizada = normalizarNumero(alturaCm);
    const larguraNormalizada = normalizarNumero(larguraCm);
    const profundidadeNormalizada = normalizarNumero(profundidadeCm);

    const volumeEmCentimetrosCubicos =
        alturaNormalizada * larguraNormalizada * profundidadeNormalizada;

    return Number((volumeEmCentimetrosCubicos / 1000).toFixed(2));
}

function volumetriaProdutoValida(produto) {
    return (
        normalizarNumero(produto.altura_cm) > 0 &&
        normalizarNumero(produto.largura_cm) > 0 &&
        normalizarNumero(produto.profundidade_cm) > 0 &&
        normalizarNumero(produto.peso_kg, 3) > 0
    );
}

module.exports = {
    calcularVolumeLitros,
    normalizarNumero,
    volumetriaProdutoValida
};
