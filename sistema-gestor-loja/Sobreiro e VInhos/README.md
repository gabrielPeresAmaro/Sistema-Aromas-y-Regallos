# Sobreiro Vinos y Regalos 🍷✨

Este é o repositório do sistema web desenvolvido para a loja **Sobreiro Vinos y Regalos** (Bagé/RS), como parte do projeto da disciplina de Computação VI. O sistema permite que os clientes explorem o catálogo de produtos e realizem a reserva de cestas temáticas, vinhos e espumantes de forma integrada à API do Sistema Base da loja.

## 🚀 Funcionalidades

- **Vitrine Virtual (Integração com API)**: Catálogo dinâmico de produtos com fallback para dados locais em caso de indisponibilidade da API.
- **Carrinho de Compras**: Controle em sessão do lado do servidor (SSR) das reservas selecionadas e contagem em tempo real.
- **Checkout Inteligente**: Interface elegante de cadastro para capturar dados essenciais para o faturamento do lojista e efetuar o envio (`POST`) para a API base.
- **Design de Luxo**: Interface baseada em UX/UI moderna com tipografia fina (*Cinzel/Montserrat*), responsividade, *Dark Mode*, paleta em tons vinho/dourado e *Glassmorphism*.

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express, express-session
- **Frontend / SSR**: EJS (Embedded JavaScript templating), HTML5, CSS3 Nativo
- **Testes**: Jest, Supertest

---

## 📖 Como Instalar e Rodar o Projeto

### 1. Pré-requisitos
Certifique-se de que possui instalado no seu computador:
- **Git**
- **Node.js** (versão 18 ou superior)

### 2. Passo a Passo

Abra o seu terminal (Prompt de Comando, PowerShell ou Terminal do VS Code) e siga os passos abaixo:

**Passo 1: Clonar o repositório**
```bash
git clone https://github.com/gabrielPeresAmaro/Sistema-Aromas-y-Regallos.git
```

**Passo 2: Entrar na pasta do sistema**
```bash
cd Sistema-Aromas-y-Regallos/sistema-gestor-loja/Sobreiro\ e\ VInhos/
```

**Passo 3: Instalar as dependências**
```bash
npm install
```

**Passo 4: Rodar o servidor**
```bash
npm start
```
Após o comando acima, você verá a mensagem `Servidor rodando em http://localhost:3001`.
Basta abrir o seu navegador de preferência e acessar: [http://localhost:3001](http://localhost:3001)

> **Aviso Importante**: A aplicação está configurada na porta `3001` para não haver conflito de porta se a API do Sistema Base (geralmente instalada na porta `3000`) estiver rodando simultaneamente.

---

## 🧪 Rodando a Bateria de Testes

O sistema já vem equipado com uma bateria de testes automatizados com o **Jest**, cumprindo um dos principais requisitos da *sprint* de entrega (Testes pré-deploy). 

Para rodar os testes, use o comando:
```bash
npm test
```
O console exibirá o relatório garantindo que as rotas HTTP de *Inicio*, *Carrinho* e *Cadastro* estão íntegras e redirecionando adequadamente os *Status Codes*.

---
*Desenvolvido para fins educacionais - Simulação de Projeto de Software.*
