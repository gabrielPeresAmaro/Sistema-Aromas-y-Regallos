const express = require('express');
const router = express.Router();


router.post('/adicionar', (req, res) => {
    if (!req.session.cesta) {
        req.session.cesta = [];
    }
    const item = {
        id: Date.now(),
        nome: req.body.nome,
        preco: parseFloat(req.body.preco),
        volume: parseFloat(req.body.volume) || 0.00,
        categoria: req.body.categoria,
        imagem: req.body.imagem
    };
    if (item.categoria === 'Cesta') {
        req.session.cesta = req.session.cesta.filter(i => i.categoria !== 'Cesta');
    }

    req.session.cesta.push(item);
    const paginaOrigem = req.body.origem || '/catalogo';
    res.redirect(`${paginaOrigem}?sucesso=1`);
});

router.post('/remover', (req, res) => {
    const idParaRemover = req.body.id;
    let cesta = req.session.cesta || [];
    req.session.cesta = cesta.filter(item => item.id != idParaRemover);
    res.redirect('/resumo');
});

router.get('/resumo', (req, res) => {
    let cesta = req.session.cesta || [];
    let dadosFrete = req.session.frete || { valor: 0, prazo: 0, cidade: '' };
    const cestaEscolhida = cesta.find(item => item.categoria === 'Cesta');
    let capacidadeMaxCesta = cestaEscolhida ? cestaEscolhida.volume : 0.00;

    let volumeItensOcupado = cesta
        .filter(item => item.categoria !== 'Cesta')
        .reduce((acc, item) => acc + item.volume, 0);

    let subtotal = cesta.reduce((acc, item) => acc + item.preco, 0);
    let totalComFrete = subtotal + dadosFrete.valor;

    let itensHtml = cesta.map(i => `
        <div class="item-reserva">
            <div class="item-info">
                <img src="${i.imagem}" class="item-foto">
                <div>
                    <p class="texto-negrito">${i.nome}</p>
                    <p class="texto-cinza">R$ ${i.preco.toFixed(2)}</p>
                    <p class="texto-cinza">
                        ${i.categoria === 'Cesta' ? `Capacidade: ${i.volume.toFixed(2)}L` : `Ocupa: ${i.volume.toFixed(2)}L`}
                    </p>
                </div>
            </div>
            <form action="/remover" method="POST">
                <input type="hidden" name="id" value="${i.id}">
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
                ${itensHtml || '<p style="text-align: center; color: black;">Sua cesta está vazia.</p>'}
                <hr>
                
                <div class="secao-frete">
                    <h4>Calcular Frete (Correios)</h4>
                    <form action="/calcular-frete" method="POST" class="form-frete">
                        <input type="text" name="cep" placeholder="Digite seu CEP" value="${dadosFrete.cepCalculado || ''}" maxlength="9" required class="input-frete">
                        <button type="submit" class="btn-add">Calcular</button>
                    </form>
                    
                    ${dadosFrete.valor > 0 ? `
                        <div class="resultado-frete">
                            <p><strong>Entrega para:</strong> ${dadosFrete.rua}, ${dadosFrete.bairro} - ${dadosFrete.cidade}</p>
                            <p><strong>Valor do Frete:</strong> R$ ${dadosFrete.valor.toFixed(2)}</p>
                            <p><strong>Prazo estimado:</strong> ${dadosFrete.prazo} dias úteis</p>
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
                            Modelo da Cesta: <strong>${cestaEscolhida.nome}</strong>
                        </p>
                        <h4 style="color: black; margin-top: 5px;">
                            Ocupação do espaço: <span style="color: ${volumeItensOcupado > capacidadeMaxCesta ? 'red' : 'green'}">
                                ${volumeItensOcupado.toFixed(2)}L
                            </span> de ${capacidadeMaxCesta.toFixed(2)}L utilizados
                        </h4>
                    ` : `
                        <h4 style="color: #ffcc00; margin-top: 5px;">Nenhuma cesta adicionada ao pedido ainda.</h4>
                    `}
                </div>
                
                <div style="margin-top: 30px;">
                    <a href="/catalogo" class="btn-item" style="text-decoration: none; display: block; margin-bottom: 10px; text-align: center;">Continuar Comprando</a>
                    ${cestaEscolhida ? `
                        <a href="/dados-cliente?total=${totalComFrete}" class="btn-item" style="text-decoration: none; display: block; text-align: center;">Finalizar Pedido</a>
                    ` : `
                        <button class="btn-item" disabled style="background: gray; cursor: not-allowed; width: 100%;">Escolha uma Cesta para Finalizar</button>
                    `}
                </div>
            </div>
            
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('erro_cep')) {
                    alert('Ops! Verifique o CEP digitado e tente novamente.');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            </script>
        </body>
        </html>
    `);
});
router.get('/dados-cliente', (req, res) => {
    let dadosFrete = req.session.frete || { valor: 0, cepCalculado: '', cidade: '' };
    let cesta = req.session.cesta || [];
    if (cesta.length === 0) {
        return res.redirect('/resumo');
    }

    let subtotal = cesta.reduce((acc, item) => acc + item.preco, 0);
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

            <label for="cpf">CPF:</label><br>
            <input type="text" id="cpf" name="cpf" required><br><br>

            <label for="cep">CEP:</label><br>
            <input type="text" id="cep" name="cep" value="${dadosFrete.cepCalculado}" required readonly style="background: #eee;"><br>
            <small style="color: green;">Endereço identificado: ${dadosFrete.rua}, ${dadosFrete.bairro} - ${dadosFrete.cidade || 'Não informada'}</small><br><br>

            <button type="submit" class="btn-item" style="width: 100%;">Confirmar e Registrar Reserva</button>
        </form>
        
        <br/><a href="/resumo" class="btn-voltar">Voltar ao Carrinho</a>
    </body>
    </html>`;

    res.send(html);
});
router.post('/calcular-frete', async (req, res) => {
    const cepDestino = req.body.cep.replace(/\D/g, '');

    if (cepDestino.length !== 8) {
        return res.redirect('/resumo?erro_cep=1');
    }

    try {
        const url = `https://cep.awesomeapi.com.br/json/${cepDestino}`;
        const respostaCep = await fetch(url);

        if (!respostaCep.ok) {
            throw new Error("CEP não encontrado");
        }

        const dadosCep = await respostaCep.json();

        let valorFrete = 15.90; // Exemplo RS
        let prazoEntrega = 3;

        if (dadosCep.state !== 'RS') {
            valorFrete = 34.90; // Fora do RS
            prazoEntrega = 7;
        }

        req.session.frete = {
            valor: valorFrete,
            prazo: prazoEntrega,
            cepCalculado: cepDestino,
            cidade: dadosCep.city,
            bairro: dadosCep.district,
            rua: dadosCep.address_name
        };

        res.redirect('/resumo');

    } catch (erro) {
        console.error("Erro ao calcular frete:", erro);
        res.redirect('/resumo?erro_cep=2');
    }
});

router.post('/tela-confirmacao', async (req, res) => {
    // 1. Garante que os dados do frete existem na sessão para evitar quebrar o código
    if (!req.session.frete) {
        return res.send('Erro - Informações de frete não encontradas na sessão.<br/><br/><a href="/resumo">Voltar ao Carrinho</a>');
    }

    let bairro = req.session.frete.bairro;
    let rua = req.session.frete.rua;
    let cidade = req.session.frete.cidade || 'Bagé'; // Pega a cidade da API de CEP

    const { nome, cpf, cep, total } = req.body;
    const totalFormatado = parseFloat(total) || 0;

    if (!nome || !cpf || !cep) {
        return res.send('Erro - não pode haver campo de dado em branco.<br/><br/><a href="/dados-cliente">Voltar</a>');
    }

    let cesta = req.session.cesta || [];
    if (cesta.length === 0) {
        return res.send('Erro - Seu carrinho está vazio.<br/><br/><a href="/catalogo">Voltar ao Catálogo</a>');
    }

    try {
        // 2. Extrai apenas os códigos numéricos dos produtos que estão na cesta do cliente
        // O seu gestor usa esses códigos para fazer o Produto.findAll() depois
        const listaCodigos = cesta.map(item => item.codigo || item.id);

        // 3. Monta o payload JSON exatamente com as colunas do seu modelo Pedido (Sequelize)
        const pedidoParaEnviar = {
            cliente_nome: nome,
            cliente_cpf_cnpj: cpf,
            cliente_telefone: "53999999999", // Telefone padrão/temporário exigido pelo banco (NOT NULL)
            lista_codigos_produtos: listaCodigos, // Passamos o array (o Sequelize no gestor trata como string/JSON)
            preco_total: totalFormatado,
            entrega_destinatario_nome: nome,
            entrega_destinatario_endereco: `${rua}, ${bairro} - ${cidade} - CEP: ${cep}`,
            entrega_data_horario: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // Simula entrega para daqui a 5 dias
        };

        // 4. FAZ O INSERT DE FATO: Dispara a requisição para a API salvar no Banco de Dados
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
            console.error("Erro da API do Gestor:", erroTexto);
            throw new Error("A API do gestor recusou o cadastro do pedido.");
        }

        const resultadoBD = await respostaApi.json();

        // Tenta capturar o código do pedido gerado automaticamente pelo banco (AUTO_INCREMENT/SERIAL)
        const idPedidoGerado = resultadoBD.pedido?.codigo || resultadoBD.pedido?.id || "Gravado";

        // 5. Renderiza a tela bonita com as informações reais vindas da sessão e do formulário
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
                <p><strong>Nº do Pedido:</strong> #${idPedidoGerado}</p>
                <p><strong>Nome:</strong> ${nome}</p>
                <p><strong>CPF:</strong> ${cpf}</p>
                <p><strong>CEP:</strong> ${cep}</p>
                <p><strong>Bairro:</strong> ${bairro}</p>
                <p><strong>Rua:</strong> ${rua}</p>
                <h3>Valor Pago Total: R$ ${totalFormatado.toFixed(2)}</h3>
            </div>
            <br/><a href="/catalogo" class="btn-item" style="text-decoration:none; display:inline-block;">Voltar ao Catálogo</a>
        </body>
        </html>`;

        // Limpa o carrinho e o frete da sessão após a compra finalizada com sucesso
        req.session.cesta = [];
        req.session.frete = null;

        res.send(html);

    } catch (erro) {
        console.error("Erro crítico ao salvar pedido no banco de dados:", erro);
        res.status(500).send('Erro interno ao processar e salvar seu pedido no sistema gestor.<br/><br/><a href="/resumo">Voltar ao Carrinho</a>');
    }
});
module.exports = router;