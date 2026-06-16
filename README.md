# Sistema Aromas y Regallos

- `localhost:3000`: loja publica
- `localhost:3001`: gestor local e API de produtos/pedidos

O sistema usa:

- PostgreSQL local
- pgAdmin, DBeaver ou outro cliente SQL
- Melhor Envio para cotacao real de frete
- Mercado Pago para pagamento

## Tecnologias

- Node.js 20+
- Express
- PostgreSQL
- Sequelize
- Melhor Envio
- Mercado Pago Checkout Pro

## Estrutura

- `App.js`: aplicacao principal da loja
- `rotas/`: rotas da loja publica
- `sistema-gestor-loja/loja-virtual/app.js`: gestor e API local
- `sql/criar_estrutura_banco.sql`: cria as tabelas do zero
- `sql/atualizar_volumetria_produtos.sql`: ajusta banco antigo
- `.env.exemplo`: modelo das variaveis de ambiente

## Pre-requisitos

Antes de rodar:

1. Instale o `Node.js`
2. Tenha um PostgreSQL local rodando
3. Use `pgAdmin`, `DBeaver` ou outro cliente para criar o banco e executar os scripts SQL

## Configuracao do banco

Crie um banco PostgreSQL com este nome:

```text
Aromas-y-Regallos
```

Depois execute o script:

- [sql/criar_estrutura_banco.sql](\sistema-aromas-y-regallos\Sistema-Aromas-y-Regallos\sql\criar_estrutura_banco.sql)

Se voce ja tiver um banco antigo criado antes desta atualizacao, execute:

- [sql/atualizar_volumetria_produtos.sql](\sistema-aromas-y-regallos\Sistema-Aromas-y-Regallos\sql\atualizar_volumetria_produtos.sql)

## Configuracao do .env

Crie um arquivo `.env` na raiz com base no `.env.exemplo`.

Campos principais:

- `BANCO_HOST`
- `BANCO_PORTA`
- `BANCO_NOME`
- `BANCO_USUARIO`
- `BANCO_SENHA`
- `MELHOR_ENVIO_AMBIENTE`
- `MELHOR_ENVIO_TOKEN`
- `MELHOR_ENVIO_CEP_ORIGEM`
- `MELHOR_ENVIO_USER_AGENT`
- `MERCADO_PAGO_AMBIENTE`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_URL_LOJA`

## Instalacao

Na raiz do projeto:

```powershell
npm install
```

No gestor:

```powershell
cd .\sistema-gestor-loja\loja-virtual\
npm install
cd ..\..\
```

## Como executar

### 1. Rodar a loja publica

Em um terminal na raiz:

```powershell
npm start
```

### 2. Rodar o gestor

Em outro terminal:

```powershell
cd .\sistema-gestor-loja\loja-virtual\
npm start
```

## URLs locais

- Loja: [http://localhost:3000](http://localhost:3000)
- Gestor: [http://localhost:3001](http://localhost:3001)

## Fluxo de teste

1. Abra o gestor em `http://localhost:3001`
2. Cadastre uma `Cesta`
3. Cadastre pelo menos um item, como `Bebida`
4. Preencha `altura`, `largura`, `profundidade` e `peso`
5. Abra a loja em `http://localhost:3000`
6. Monte a cesta
7. Va ao carrinho
8. Informe o CEP de destino
9. Clique em `Calcular`
10. Preencha os dados do cliente
11. Clique em `Ir para Pagamento`

O frete sera buscado no Melhor Envio usando os dados reais de volumetria.

## Fluxo de pagamento

O checkout foi mantido simples:

1. O cliente monta a cesta
2. Calcula o frete pelo Melhor Envio
3. Preenche os dados de entrega
4. O sistema cria uma preferencia no Mercado Pago
5. O cliente paga no checkout do Mercado Pago
6. Depois do pagamento aprovado, o pedido e gravado no sistema gestor

## Observacao importante sobre teste local

O sistema funciona localmente com:

- PostgreSQL local
- pgAdmin, DBeaver ou outro cliente
- Loja em `http://localhost:3000`
- Gestor em `http://localhost:3001`

Para criar o pagamento no Mercado Pago, isso ja basta.

Para o retorno automatico do checkout do Mercado Pago, o mais seguro em ambiente real e usar uma URL publica em `MERCADO_PAGO_URL_LOJA`, porque o Mercado Pago pode limitar retornos com `localhost`.

Se quiser testar o retorno completo fora do localhost, voce pode usar uma URL publica temporaria e colocar essa URL na variavel:

```text
MERCADO_PAGO_URL_LOJA=https://sua-url-publica
```

## Scripts uteis

Na raiz:

```powershell
npm start
npm run dev
```

No gestor:

```powershell
npm start
npm run dev
```

## Encerrar o ambiente

Para parar as aplicacoes Node.js, use `Ctrl + C` em cada terminal.
