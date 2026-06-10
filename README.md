# Sistema Aromas y Regallos

Projeto acadêmico com duas aplicações Node.js:

- `localhost:3000`: loja pública
- `localhost:3001`: gestor local e API de produtos/pedidos

O sistema usa PostgreSQL em Docker e cotação real de frete com Melhor Envio.

## Tecnologias

- Node.js 20+
- Express
- PostgreSQL
- Docker Desktop
- Sequelize
- Melhor Envio

## Estrutura

- `App.js`: aplicação principal da loja
- `rotas/`: rotas da loja pública
- `sistema-gestor-loja/loja-virtual/app.js`: gestor e API local
- `docker-compose.yml`: banco local
- `.env.exemplo`: modelo de variáveis de ambiente

## Pré-requisitos

Antes de rodar:

1. Instale o `Node.js`
2. Instale o `Docker Desktop`
3. Abra o Docker Desktop e espere ele iniciar completamente

Se aparecer este erro:

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

isso significa que o Docker Desktop não está rodando.

## Configuração

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

## Instalação

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

### 1. Subir o banco

Na raiz:

```powershell
npm run docker:up
```

ou

```powershell
docker compose up -d
```

### 2. Rodar a loja pública

Em um terminal na raiz:

```powershell
npm start
```

### 3. Rodar o gestor

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
7. Vá ao carrinho
8. Informe o CEP de destino
9. Clique em `Calcular`

O frete será buscado no Melhor Envio usando os dados reais de volumetria.

## Scripts úteis

Na raiz:

```powershell
npm start
npm run dev
npm run docker:up
npm run docker:down
```

No gestor:

```powershell
npm start
npm run dev
```

## Encerrar o ambiente

Para parar o banco:

```powershell
npm run docker:down
```

ou

```powershell
docker compose down
```

Para parar as aplicações Node.js, use `Ctrl + C` em cada terminal.
