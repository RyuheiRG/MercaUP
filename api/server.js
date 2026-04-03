const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// habilita CORS
app.use(cors());

// permite que la API lea los datos en formato JSON que le enviemos
app.use(express.json());

app.get('/rates', (req, res) => {
    console.log('Se ha recibido una petición de tasas de cambio.');
    
    res.json({
        base: "MXN",
        rates: {
            MXN: 1,
            USD: 0.058,
            EUR: 0.049
        }
    });
});

// ruta para procesar el pago y recibir el pedido
app.post('/checkout', (req, res) => {
    const pedido = req.body;
    console.log('\n=== NUEVO PEDIDO RECIBIDO ===');
    console.log('Cliente:', pedido.cliente);
    console.log('Artículos comprados (IDs):', pedido.articulos);
    
    res.json({
        success: true,
        orderId: Math.floor(Math.random() * 1000000) // genera un ID de pedido aleatorio
    });
});

app.listen(PORT, () => {
    console.log(`Servidor API de MercaUP corriendo en http://localhost:${PORT}`);
});