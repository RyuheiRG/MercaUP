require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT ?? 3000;

const DATA_FILE = path.join(__dirname, 'data', 'productos.json');

// Configuración de CORS para producción
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*', // Cambiar en AWS a tu dominio real
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json()); 

// Health Check para AWS (Load Balancers / Elastic Beanstalk)
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/api/productos', async (req, res) => {
    try {
        const rawData = await fs.readFile(DATA_FILE, 'utf8');
        const productos = JSON.parse(rawData);
        res.status(200).json(productos);
    } catch (error) {
        console.error('[I/O Error] Fallo al leer la base de datos:', error);
        res.status(500).json({ metadata: { status: 500 }, message: 'Error interno del servidor.' });
    }
});

app.get('/api/rates', (req, res) => {
    res.json({
        base: "MXN",
        rates: { MXN: 1, USD: 0.056, EUR: 0.049 }
    });
});

app.post('/api/checkout', async (req, res) => {
    try {
        const { cliente, articulos } = req.body; 

        if (!articulos || !Array.isArray(articulos) || articulos.length === 0) {
            return res.status(400).json({ success: false, message: "Payload inválido o carrito vacío." });
        }

        // TODO: Migrar esta lógica a una Base de Datos real (DynamoDB, RDS, MongoDB)
        // para evitar condiciones de carrera y pérdida de datos en despliegues.
        const rawData = await fs.readFile(DATA_FILE, 'utf8');
        const database = JSON.parse(rawData);

        let errorStock = false;
        
        articulos.forEach(idComprado => {
            const producto = database.data.find(p => p.productId === idComprado);
            if (producto && producto.stock > 0) {
                producto.stock -= 1; 
            } else {
                errorStock = true; 
            }
        });

        if (errorStock) {
            console.warn('[Zero Trust] Intento de compra excedió el stock físico.');
            return res.status(409).json({ success: false, message: "Conflicto de inventario. Algunos productos ya no tienen stock." });
        }

        await fs.writeFile(DATA_FILE, JSON.stringify(database, null, 2));

        console.log(`\n[Transacción Exitosa] Pedido de ${cliente || 'Anónimo'} procesado. Stock actualizado.`);
        
        res.status(200).json({
            success: true,
            orderId: `ORD-${Math.floor(Math.random() * 1000000)}`,
            message: "Compra procesada y stock reducido en el servidor."
        });

    } catch (error) {
        console.error('[I/O Error] Fallo al procesar el checkout:', error);
        res.status(500).json({ success: false, message: 'Fallo al procesar la mutación de datos.' });
    }
});

const server = app.listen(PORT, () => {
    console.log(`[Servidor Principal] API Asíncrona iniciada y escuchando en el puerto ${PORT}`);
    console.log(`[Ruta Data] Utilizando: ${DATA_FILE}`);
});

// Graceful shutdown para proteger productos.json en reinicios de EC2/PM2
const gracefulShutdown = () => {
    console.log('\n[Sistema] Recibida señal de apagado. Cerrando servidor de forma segura...');
    server.close(() => {
        console.log('[Sistema] Servidor cerrado. Proceso terminado.');
        process.exit(0);
    });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);