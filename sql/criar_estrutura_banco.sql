CREATE TABLE IF NOT EXISTS produtos (
    codigo SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    quantidade_estoque INTEGER NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    categoria VARCHAR(30) NOT NULL,
    foto VARCHAR(255) NOT NULL,
    altura_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
    largura_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
    profundidade_cm NUMERIC(10, 2) NOT NULL DEFAULT 0,
    peso_kg NUMERIC(10, 3) NOT NULL DEFAULT 0,
    volume NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pedidos (
    codigo SERIAL PRIMARY KEY,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_cpf_cnpj VARCHAR(100) NOT NULL,
    cliente_telefone VARCHAR(20) NOT NULL,
    lista_codigos_produtos VARCHAR(255) NOT NULL,
    preco_total NUMERIC(10, 2) NOT NULL,
    entrega_destinatario_nome VARCHAR(100) NOT NULL,
    entrega_destinatario_endereco VARCHAR(255) NOT NULL,
    entrega_data_horario TIMESTAMP NOT NULL,
    data_criacao TIMESTAMP NOT NULL
);
