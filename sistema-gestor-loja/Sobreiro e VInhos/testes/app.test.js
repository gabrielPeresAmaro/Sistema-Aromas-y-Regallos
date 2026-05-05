const request = require('supertest');
const aplicativo = require('../servidor');

describe('Bateria de Testes - Rotas do Sistema', () => {
    
    it('Deve carregar a página inicial com sucesso (status 200)', async () => {
        const resposta = await request(aplicativo).get('/');
        expect(resposta.statusCode).toBe(200);
        expect(resposta.text).toContain('Nossa Seleção Especial');
    });

    it('Deve carregar a página do carrinho com sucesso (status 200)', async () => {
        const resposta = await request(aplicativo).get('/carrinho');
        expect(resposta.statusCode).toBe(200);
        expect(resposta.text).toContain('Sua Reserva');
    });

    it('A página de cadastro deve redirecionar (status 302) se o carrinho estiver vazio', async () => {
        const resposta = await request(aplicativo).get('/cadastro');
        expect(resposta.statusCode).toBe(302);
        expect(resposta.header.location).toBe('/carrinho');
    });

    it('Deve adicionar um item ao carrinho e redirecionar para /carrinho (status 302)', async () => {
        const resposta = await request(aplicativo)
            .post('/carrinho/adicionar')
            .send({
                codigo: 1,
                nome: 'Cesta Teste',
                preco: 100.00
            });
        expect(resposta.statusCode).toBe(302);
        expect(resposta.header.location).toBe('/carrinho');
    });
});
