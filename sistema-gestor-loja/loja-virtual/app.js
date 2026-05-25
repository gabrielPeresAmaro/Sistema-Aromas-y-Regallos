const express = require('express')
const cors = require('cors');
const exphbs = require('express-handlebars');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const handlebars = require('handlebars'); //adicionado para por o helper do Handlebars

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



//configuracao do Sequelize
const sequelize = new Sequelize('Aromas-y-Regallos', 'postgres', 'postgres', {
    host: 'localhost',
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
        cliente_telefone: { type: Sequelize.STRING(15), allowNull: false },
        lista_codigos_produtos: { type: Sequelize.STRING(100), allowNull: false },
        preco_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },

        entrega_destinatario_nome: { type: Sequelize.STRING(100), allowNull: false },
        entrega_destinatario_endereco: { type: Sequelize.STRING(100), allowNull: false },
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

    const { nome, descricao, quantidade_estoque, preco, categoria, foto, volume } = req.body;

    if (nome == "" || descricao == "") {
        res.send("Erro - não pode haver campo de dado em branco.");
    }
    else {
        var umProdutoRecebido = {
            nome,
            descricao,
            quantidade_estoque: parseInt(quantidade_estoque),
            preco: parseFloat(preco),
            categoria,
            foto,
            volume: parseFloat(volume) || 0.00
        };
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

    const { nome, descricao, quantidade_estoque, preco, categoria, foto, volume } = req.body;

    if (nome == "" || descricao == "") {
        res.send("Erro - não pode haver campo de dado em branco.");
    }
    else {
        Produto.update(
            {
                nome,
                descricao,
                quantidade_estoque: parseInt(quantidade_estoque),
                preco: parseFloat(preco),
                categoria,
                foto,
                volume: parseFloat(volume) || 0.00
            },
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
            return res.status(400).json({ erro: "Dados incompletos." });
        }

        // Insert no banco de dados
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
        });

        res.status(201).json({ mensagem: "Pedido cadastrado com sucesso", pedido: novoPedidoBD });

    } catch (erro) {
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
