const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.redirect('/inicial'));

router.get('/inicial', (req, res) => {
    res.send(`
        <html>
            <head><link rel="stylesheet" href="/style.css"></head>
            <body class="tela-flex">
                <div class="container-centro">
                    <h1 style="color: black; margin-bottom: 20px;">Sobreiro Vinhos y Regalos</h1>
                    <a href="/catalogo" class="btn-grande">Montar cesta personalizada</a>
                </div>
            </body>
        </html>
    `);
});

module.exports = router;