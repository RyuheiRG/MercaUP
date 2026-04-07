const API_BASE_URL = '/api';

export async function obtenerProductos() {
    const response = await fetch(`${API_BASE_URL}/productos`);
    if (!response.ok) throw new Error(`[Red] Error: ${response.status}`);
    const jsonPayload = await response.json();
    if (jsonPayload.metadata.status !== 200) throw new Error('[Zero Trust] Payload comprometido.');
    
    return jsonPayload.data; // Retorno puro, sin mutar variables globales
}

export async function obtenerTasasCambio() {
    const response = await fetch(`${API_BASE_URL}/rates`);
    if (!response.ok) throw new Error(`[Red] Error: ${response.status}`);
    const data = await response.json();
    
    return data.rates;
}

export async function enviarCheckout(datosPedido) {
    const response = await fetch(`${API_BASE_URL}/checkout`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPedido)
    });

    if (!response.ok) throw new Error('El servidor rechazó la transacción.');
    return await response.json();
}