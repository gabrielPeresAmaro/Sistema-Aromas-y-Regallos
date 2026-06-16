require('dotenv').config({ path: '../../.env' });

const express = require('express')
const cors = require('cors');
const exphbs = require('express-handlebars');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const handlebars = require('handlebars'); //adicionado para por o helper do Handlebars
const { calcularVolumeLitros, normalizarNumero, volumetriaProdutoValida } = require('../../config/volumetria');

const app = express()


function bloquearAcessoExterno(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;

    if (ip !== '127.0.0.1' && ip !== '::1') {
        return res.status(403).send('Acesso externo não permitido');
    }

    next();
}

// liberar para qualquer origem (mais simples)
//app.use(cors());

const corsOptions = {
    origin: ['http://172.26.3.157:3000', 'http://localhost:3000']
};

// só essas rotas têm CORS
//app.use('/produtos/categoria/:categoria', cors(corsOptions));
//app.use('/pedidos/cadastrar', cors(corsOptions));

// Configurar o Handlebars como o motor de templates da aplicacao
app.engine('.handlebars', exphbs.engine({ extname: '.handlebars', defaultLayout: "main", helpers: { eq: (a, b) => a === b } }));
app.set('view engine', 'handlebars');

// registrando este helper do Handlebars para deixar em negrito o produto Cesta na página de dados do pedido
handlebars.registerHelper('contains', function (str, substring, options) {
    if (typeof str === 'string' && str.toLowerCase().includes(substring.toLowerCase())) {
        return options.fn(this);  // executa o bloco "then"
    } else {
        return options.inverse(this); // executa o bloco "else"
    }
});



const nomeBanco = process.env.BANCO_NOME || 'Aromas-y-Regallos';
const usuarioBanco = process.env.BANCO_USUARIO || 'postgres';
const senhaBanco = process.env.BANCO_SENHA || 'postgres';
const hostBanco = process.env.BANCO_HOST || 'localhost';
const portaBanco = Number.parseInt(process.env.BANCO_PORTA || '5432', 10);

//configuracao do Sequelize
const sequelize = new Sequelize(nomeBanco, usuarioBanco, senhaBanco, {
    host: hostBanco,
    port: portaBanco,
    dialect: 'postgres'
});

//teste de conexao com o bd
sequelize.authenticate().then(function () {

    console.log("conexão com o banco de dados realizada com sucesso")

}).catch(function (e) {
    console.log(e)
    console.log("erro ao realizar a conexão com o banco de dados")
})



//cria o modelo Produto (representa a tabela produtos no BD)
const Produto = sequelize.define('produtos',
    {
        //colunas da tabela produtos no banco de dados
        codigo: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        nome: { type: Sequelize.STRING(100), allowNull: false },
        descricao: { type: Sequelize.TEXT, allowNull: false },
        quantidade_estoque: { type: Sequelize.INTEGER, allowNull: false },
        preco: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        categoria: { type: Sequelize.STRING(30), allowNull: false },
        foto: { type: Sequelize.STRING(255), allowNull: false },
        altura_cm: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
        largura_cm: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
        profundidade_cm: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
        peso_kg: { type: Sequelize.DECIMAL(10, 3), allowNull: false, defaultValue: 0.000 },
        volume: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 }
    },
    {
        //configurações
        createdAt: false, //tabela do bd sem este campo padrao do Sequ.
        updatedAt: false, //tabela do bd sem este campo padrao do Sequ.
    }
)


//cria o modelo Pedido (representa a tabela pedidos no BD)
const Pedido = sequelize.define('pedidos',
    {
        //colunas da tabela pedidos no banco de dados
        codigo: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        cliente_nome: { type: Sequelize.STRING(100), allowNull: false },
        cliente_cpf_cnpj: { type: Sequelize.STRING(100), allowNull: false },
        cliente_telefone: { type: Sequelize.STRING(20), allowNull: false },
        lista_codigos_produtos: { type: Sequelize.STRING(255), allowNull: false },
        preco_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },

        entrega_destinatario_nome: { type: Sequelize.STRING(100), allowNull: false },
        entrega_destinatario_endereco: { type: Sequelize.STRING(255), allowNull: false },
        entrega_data_horario: { type: Sequelize.DATE, allowNull: false },
        data_criacao: { type: Sequelize.DATE, allowNull: false }
    },
    {
        //configurações
        createdAt: false, //tabela do bd sem este campo padrao do Sequ.
        updatedAt: false, //tabela do bd sem este campo padrao do Sequ.
    }
)

// Middleware para ler dados do formulário (application/x-www-form-urlencoded)
// (funções de middleware são funções que tem acesso ao objeto de solicitação (req), o objeto de resposta (res))
app.use(express.urlencoded({ extended: true }));
// E também para aceitar JSON no body da requisição
app.use(express.json());

function montarProdutoRecebido(dadosProduto) {
    const altura_cm = normalizarNumero(dadosProduto.altura_cm);
    const largura_cm = normalizarNumero(dadosProduto.largura_cm);
    const profundidade_cm = normalizarNumero(dadosProduto.profundidade_cm);
    const peso_kg = normalizarNumero(dadosProduto.peso_kg, 3);

    return {
        nome: dadosProduto.nome,
        descricao: dadosProduto.descricao,
        quantidade_estoque: parseInt(dadosProduto.quantidade_estoque),
        preco: parseFloat(dadosProduto.preco),
        categoria: dadosProduto.categoria,
        foto: dadosProduto.foto,
        altura_cm,
        largura_cm,
        profundidade_cm,
        peso_kg,
        volume: calcularVolumeLitros(altura_cm, largura_cm, profundidade_cm)
    };
}

function dadosBasicosProdutoValidos(produto) {
    return (
        Number.isInteger(produto.quantidade_estoque) &&
        produto.quantidade_estoque >= 0 &&
        Number.isFinite(produto.preco) &&
        produto.preco >= 0 &&
        Boolean(produto.categoria) &&
        Boolean(produto.foto)
    );
}

function contarCodigosProdutos(listaCodigosProdutos) {
    const listaNormalizada = Array.isArray(listaCodigosProdutos)
        ? listaCodigosProdutos
        : String(listaCodigosProdutos || '')
            .split(',')
            .map(codigo => Number.parseInt(String(codigo).trim(), 10))
            .filter(Number.isInteger);

    return listaNormalizada.reduce((acumulador, codigoProduto) => {
        acumulador[codigoProduto] = (acumulador[codigoProduto] || 0) + 1;
        return acumulador;
    }, {});
}


const porta = 3001
const ipDoServidor = 'localhost'

//rotas:

app.get('/', function (req, res) {

    //res.send("Bem vindos ao meu site")
    res.render('bemVindo', {});

});

/*app.get('/teste-cadastrar-produto', function(req, res){

    var umProduto = {
        nome: "teste1 prod", 
        descricao: "teste1 descr",
        quantidade_estoque: 10,
        preco: 10.90,
        categoria: 'Bebida',
        foto: 'bebida123.png'
    }

    Produto.create(umProduto);

    res.render('bemVindo', {});

});*/


app.get('/produtos/cadastrar', bloquearAcessoExterno, function (req, res) {

    res.render('cadastrarProduto', {});
});

app.post('/produtos/cadastrar', function (req, res) {

    const { nome, descricao } = req.body;

    if (nome == "" || descricao == "") {
        res.send("Erro - não pode haver campo de dado em branco.");
    }
    else {
        var umProdutoRecebido = montarProdutoRecebido(req.body);

        if (!dadosBasicosProdutoValidos(umProdutoRecebido)) {
            return res.send("Erro - confira estoque, preco, categoria e foto do produto.");
        }

        if (!volumetriaProdutoValida(umProdutoRecebido)) {
            return res.send("Erro - informe altura, largura, profundidade e peso validos.");
        }

        Produto.create(umProdutoRecebido);
        res.send("Produto cadastrado com sucesso.");
    }
});


app.get('/produtos/listar-todos', bloquearAcessoExterno, async function (req, res) {

    try {
        const produtosBD = (await Produto.findAll()).map(p => p.get({ plain: true })); //adicionado o map pois o Handlbars exibe objetos 'planos'
        res.render('listaProdutos', { produtosBD });

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar produtos");
    }
});

app.get('/produtos/:codigoProduto', bloquearAcessoExterno, async function (req, res) {

    const codigo = req.params.codigoProduto;

    try {
        const produtoBD = (await Produto.findByPk(codigo));
        const produtoPlano = produtoBD.get({ plain: true }); // necessário para Handlebars!
        res.render('consultaProduto', { produtoPlano });

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar produto");
    }
});

app.get('/produtos/codigo/:codigoProduto/json', cors(corsOptions), async function (req, res) {

    const codigo = req.params.codigoProduto;

    try {
        const produtoBD = await Produto.findByPk(codigo);

        if (!produtoBD) {
            return res.status(404).json({ erro: "Produto não encontrado." });
        }

        res.status(200).json(produtoBD.get({ plain: true }));

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao buscar produto" });
    }
});

app.get('/produtos/editar/:codigoProduto', bloquearAcessoExterno, async function (req, res) {

    const codigo = req.params.codigoProduto;

    try {
        const produtoBD = (await Produto.findByPk(codigo));
        const produtoPlano = produtoBD.get({ plain: true }); // necessário para Handlebars!
        res.render('editarProduto', { produtoPlano });

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar produto");
    }
});

app.post('/produtos/salvar-edicao', function (req, res) {

    const codigo = req.body.codigo;

    const { nome, descricao } = req.body;

    if (nome == "" || descricao == "") {
        res.send("Erro - não pode haver campo de dado em branco.");
    }
    else {
        const produtoAtualizado = montarProdutoRecebido(req.body);

        if (!dadosBasicosProdutoValidos(produtoAtualizado)) {
            return res.send("Erro - confira estoque, preco, categoria e foto do produto.");
        }

        if (!volumetriaProdutoValida(produtoAtualizado)) {
            return res.send("Erro - informe altura, largura, profundidade e peso validos.");
        }

        Produto.update(
            produtoAtualizado,
            { where: { codigo } }
        );
        res.redirect('/produtos/listar-todos');
    }
});


app.get('/produtos/excluir/:codigoProduto', bloquearAcessoExterno, async function (req, res) {

    const codigoProduto = req.params.codigoProduto;



    try {
        await Produto.destroy({
            where: { codigo: codigoProduto }
        });
        res.redirect('/produtos/listar-todos');

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao excluir o produto");
    }
});


app.get('/pedidos/listar-todos', bloquearAcessoExterno, async function (req, res) {

    try {
        const pedidosBD = (await Pedido.findAll()).map(p => p.get({ plain: true })); //adicionado o map pois o Handlbars exibe objetos 'planos'
        res.render('listaPedidos', { pedidosBD });

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar pedidos");
    }
});


// Consultar pedido
app.get('/pedidos/:codigoPedido', bloquearAcessoExterno, async function (req, res) {
    const codigo = req.params.codigoPedido;

    try {
        const pedidoBD = await Pedido.findByPk(codigo);
        const pedidoPlano = pedidoBD.get({ plain: true });

        // Transforma lista_codigos_produtos em array de inteiros
        let listaCodigos = pedidoPlano.lista_codigos_produtos;

        if (typeof listaCodigos === 'string') {
            if (listaCodigos.trim().startsWith('[')) {
                // JSON válido, como "[1,2,3]"
                listaCodigos = JSON.parse(listaCodigos);
            } else {
                // String com vírgulas, como "1,2,3"
                listaCodigos = listaCodigos.split(',').map(c => parseInt(c.trim()));
            }
        }

        if (!Array.isArray(listaCodigos)) {
            listaCodigos = [];
        }

        const listaProdutosCestaBD = await Produto.findAll({
            where: {
                codigo: {
                    [Op.in]: [...new Set(listaCodigos)]
                }
            }
        });

        const produtosMap = {};
        listaProdutosCestaBD.forEach(produto => {
            produtosMap[produto.codigo] = produto.get({ plain: true });
        });

        const listaProdutosCestaBDPlanos = listaCodigos.map(codigo => produtosMap[codigo]);

        res.render('consultaPedido', { pedidoPlano, listaProdutosCestaBDPlanos });

    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar pedido");
    }
});

// Cadastrar pedido a partir de um objeto Pedido JSON
app.post('/pedidos/cadastrar', cors(corsOptions), async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            cliente_nome,
            cliente_cpf_cnpj,
            cliente_telefone,
            lista_codigos_produtos,
            preco_total,
            entrega_destinatario_nome,
            entrega_destinatario_endereco,
            entrega_data_horario
        } = req.body;

        // validação básica
        if (!cliente_nome || !cliente_cpf_cnpj || !cliente_telefone || !lista_codigos_produtos || !preco_total || !entrega_destinatario_nome || !entrega_destinatario_endereco || !entrega_data_horario) {
            await transaction.rollback();
            return res.status(400).json({ erro: "Dados incompletos." });
        }

        const contagemProdutos = contarCodigosProdutos(lista_codigos_produtos);
        const codigosProdutos = Object.keys(contagemProdutos).map(codigo => Number.parseInt(codigo, 10));
        const produtosBD = await Produto.findAll({
            where: {
                codigo: {
                    [Op.in]: codigosProdutos
                }
            },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (produtosBD.length !== codigosProdutos.length) {
            await transaction.rollback();
            return res.status(409).json({ erro: "Existe produto no pedido que nao foi encontrado." });
        }

        for (const produtoBD of produtosBD) {
            const quantidadeSolicitada = contagemProdutos[produtoBD.codigo] || 0;

            if (produtoBD.quantidade_estoque < quantidadeSolicitada) {
                await transaction.rollback();
                return res.status(409).json({
                    erro: `Estoque insuficiente para o produto ${produtoBD.nome}. Disponivel: ${produtoBD.quantidade_estoque}.`
                });
            }
        }

        for (const produtoBD of produtosBD) {
            const quantidadeSolicitada = contagemProdutos[produtoBD.codigo] || 0;

            await produtoBD.update({
                quantidade_estoque: produtoBD.quantidade_estoque - quantidadeSolicitada
            }, { transaction });
        }

        const novoPedidoBD = await Pedido.create({
            cliente_nome,
            cliente_cpf_cnpj,
            cliente_telefone,
            lista_codigos_produtos: Array.isArray(lista_codigos_produtos)
                ? JSON.stringify(lista_codigos_produtos)
                : lista_codigos_produtos,
            preco_total,
            entrega_destinatario_nome,
            entrega_destinatario_endereco,
            entrega_data_horario,
            data_criacao: new Date()
        }, { transaction });

        await transaction.commit();

        res.status(201).json({ mensagem: "Pedido cadastrado com sucesso", pedido: novoPedidoBD });

    } catch (erro) {
        await transaction.rollback();
        console.error(erro);
        res.status(500).json({ erro: "Erro ao cadastrar o pedido" });
    }
});


//retornar a lista de produtos de uma categoria em JSON
app.get('/produtos/categoria/:categoria', cors(corsOptions), async function (req, res) {

    const categoria = req.params.categoria;

    let categoriaBD;

    switch (categoria) {
        case 'cesta':
            categoriaBD = 'Cesta';
            break;

        case 'item_comestivel':
            categoriaBD = 'Item comestível';
            break;

        case 'bebida':
            categoriaBD = 'Bebida';
            break;

        case 'cartao_de_mensagem':
            categoriaBD = 'Cartão de mensagem';
            break;

        case 'presente_tematico':
            categoriaBD = 'Presente temático';
            break;

        case 'decoracao_cesta':
            categoriaBD = 'Decoração';
            break;

        default:
            return res.status(400).json({ erro: "Categoria inválida." });
    }

    try {

        const produtosBD = await Produto.findAll({
            where: {
                quantidade_estoque: {
                    [Op.gt]: 0
                },
                categoria: {
                    [Op.iLike]: categoriaBD
                }
            }
        });

        // converter objetos Sequelize para JSON simples
        const produtosJSON = produtosBD.map(p => p.get({ plain: true }));

        res.status(200).json(produtosJSON);

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao buscar produtos da categoria" });
    }

});


app.listen(porta, ipDoServidor, function () {
    console.log('\n Aplicacao web executando na rede em  http://' + ipDoServidor + ':' + porta);
})
