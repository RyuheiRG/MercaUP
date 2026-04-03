import { cartEmptyComponent, cartFullComponent } from '../components/cart.js';

const API_URL = './scripts/productos.json'; 

const catalogContainer = document.getElementById('catalogo');
const searchBar = document.getElementById('search-bar');
const cartContainer = document.querySelector('.cart-container');

let todosLosProductos = [];
let carrito = JSON.parse(localStorage.getItem('carritoMercaUP')) || [];
let debounceTimer;

// estado de la aplicación
let monedaActual = sessionStorage.getItem('monedaMercaUP') || 'MXN';
let tasasDeCambio = { MXN: 1 }; // se inicia con un valor base, la API lo poblará.

async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Error de Red: ${response.status}`);
        const jsonPayload = await response.json();
        if (jsonPayload.metadata.status !== 200) throw new Error('Estado comprometido.');

        todosLosProductos = jsonPayload.data;
        
        carrito.forEach(idGuardado => {
            const prod = todosLosProductos.find(p => p.productId === idGuardado);
            if (prod && prod.stock > 0) prod.stock -= 1;
        });

    } catch (error) {
        console.error('[Zero Trust] Caída de conexión:', error);
        catalogContainer.innerHTML = '<p>Error de conexión con el Servidor Principal.</p>';
    }
}

async function fetchTasasCambio() {
    try {
        // apunta al servidor de Node.js en el puerto 3000
        const response = await fetch('http://localhost:3000/rates');
        if (!response.ok) throw new Error(`Error al conectar con la API local: ${response.status}`);
        const data = await response.json();

        tasasDeCambio = data.rates;
        console.log("Tasas de cambio actualizadas desde mi API local:", tasasDeCambio);
    } catch (error) {
        console.error('[Zero Trust] Caída de conexión con API de divisas. Usando valores de respaldo.', error);
        tasasDeCambio.USD = 0.058;
        tasasDeCambio.EUR = 0.049;
    }
}

function renderCatalog(productsArray) {
    catalogContainer.innerHTML = ''; 
    if (productsArray.length === 0) {
        catalogContainer.innerHTML = '<p style="grid-column: 1 / -1;">No se encontraron productos.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    productsArray.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        const imageFile = product.imagePath.replace('.png', '.jpg');
        const hayExistencias = product.stock > 0;
        
        const buttonClass = hayExistencias ? 'btn-agregar' : 'btn-agotado';
        const buttonText = hayExistencias ? 'Agregar al carrito' : 'Agotado';

        // conversión de moneda
        const tasa = tasasDeCambio[monedaActual] || 1;
        const precioConvertido = product.price * tasa;
        const precioFormateado = precioConvertido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // indicador dinámico para el stock
        const stockText = hayExistencias
            ? (product.stock <= 5 ? `<span style="color: #ff4d4d; font-weight: bold;">¡Solo quedan ${product.stock}!</span>` : `<strong>${product.stock}</strong>`)
            : '<span style="color: red; font-weight: bold;">Agotado</span>';

        productCard.innerHTML = `
            <img src="${imageFile}" alt="${product.name}" style="max-width: 100%; border-radius: 8px;">
            <h3>${product.name}</h3>
            <p><strong>Precio: $${precioFormateado} ${monedaActual}</strong></p>
            <p>Categoría: ${product.category}</p>
            <p>Stock Disponible: ${stockText}</p>
            <ul>
                ${Object.entries(product.specs).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
            </ul>
            <button class="${buttonClass}" data-id="${product.productId}" ${hayExistencias ? '' : 'disabled'}>
                ${buttonText}
            </button>
        `;
        fragment.appendChild(productCard);
    });
    catalogContainer.appendChild(fragment);
}

function agregarAlCarrito(productoId) {
    const productoIndex = todosLosProductos.findIndex(p => p.productId === productoId);
    
    if (productoIndex !== -1 && todosLosProductos[productoIndex].stock > 0) {
        todosLosProductos[productoIndex].stock -= 1;
        
        carrito.push(productoId); 
        localStorage.setItem('carritoMercaUP', JSON.stringify(carrito));
        
        renderCatalog(todosLosProductos);
        actualizarHUDCarrito();
    }
}

function eliminarDelCarrito(productoId) {
    const cantidadDevuelta = carrito.filter(id => id === productoId).length;
    
    carrito = carrito.filter(id => id !== productoId);
    localStorage.setItem('carritoMercaUP', JSON.stringify(carrito));
    
    const productoIndex = todosLosProductos.findIndex(p => p.productId === productoId);
    if (productoIndex !== -1) {
        todosLosProductos[productoIndex].stock += cantidadDevuelta;
    }
    
    renderCatalog(todosLosProductos);
    actualizarHUDCarrito();
}

function restarDelCarrito(productoId) {
    const cantidadActual = carrito.filter(id => id === productoId).length;
    
    if (cantidadActual <= 1) return;

    const indexEnCarrito = carrito.indexOf(productoId);
    if (indexEnCarrito !== -1) {
        carrito.splice(indexEnCarrito, 1);
        localStorage.setItem('carritoMercaUP', JSON.stringify(carrito));
        
        const productoIndex = todosLosProductos.findIndex(p => p.productId === productoId);
        if (productoIndex !== -1) {
            todosLosProductos[productoIndex].stock += 1;
        }
        
        renderCatalog(todosLosProductos);
        actualizarHUDCarrito();
    }
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    
    // devolver el stock de todos los productos en el carrito al catálogo
    carrito.forEach(productoId => {
        const productoIndex = todosLosProductos.findIndex(p => p.productId === productoId);
        if (productoIndex !== -1) {
            todosLosProductos[productoIndex].stock += 1;
        }
    });
    
    carrito = [];
    localStorage.setItem('carritoMercaUP', JSON.stringify(carrito));
    
    renderCatalog(todosLosProductos);
    actualizarHUDCarrito();
}

function procesarPago() {
    if (carrito.length === 0) return alert("No puedes proceder al pago porque tu carrito está vacío.");
    
    document.getElementById('cart-drawer').classList.remove('open');
    document.body.classList.remove('drawer-is-open');

    // modal de pago con tarjeta
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';

    modalOverlay.innerHTML = `
        <div class="payment-modal">
            <h2>Pago con Tarjeta</h2>
            <div id="payment-error" style="color: #ff4d4d; margin-bottom: 15px; font-size: 0.9rem; text-align: center; min-height: 1.2rem;"></div>
            <div class="payment-form-group">
                <label>Titular de la Tarjeta</label>
                <input type="text" id="card-name" placeholder="Ej. Juan Pérez">
            </div>
            <div class="payment-form-group">
                <label>Número de Tarjeta</label>
                <input type="text" id="card-number" placeholder="0000 0000 0000 0000" maxlength="19">
            </div>
            <div style="display: flex; gap: 15px;">
                <div class="payment-form-group" style="flex: 1;">
                    <label>Vencimiento</label>
                    <input type="text" id="card-expiry" placeholder="MM/AA" maxlength="5">
                </div>
                <div class="payment-form-group" style="flex: 1;">
                    <label>CVV</label>
                    <input type="password" id="card-cvv" placeholder="123" maxlength="4">
                </div>
            </div>
            <div class="payment-actions">
                <button class="btn-cancelar" id="btn-cancelar-pago">Cancelar</button>
                <button class="btn-pagar" id="btn-confirmar-pago">Pagar Ahora</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    document.getElementById('btn-cancelar-pago').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // dar formato automático al número de tarjeta (agregar espacios)
    document.getElementById('card-number').addEventListener('input', function (e) {
        this.value = this.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
    });

    // dar formato automático a la fecha de vencimiento (agregar diagonal)
    document.getElementById('card-expiry').addEventListener('input', function (e) {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length > 2) {
            this.value = this.value.substring(0, 2) + '/' + this.value.substring(2, 4);
        }
    });

    document.getElementById('btn-confirmar-pago').addEventListener('click', async () => {
        const nameInput = document.getElementById('card-name').value.trim();
        const numberInput = document.getElementById('card-number').value.replace(/\s+/g, '');
        const expiryInput = document.getElementById('card-expiry').value.trim();
        const cvvInput = document.getElementById('card-cvv').value.trim();
        const errorDiv = document.getElementById('payment-error');

        // valida que sean letras y espacios (mínimo 3 caracteres)
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,}$/;
        if (!nameRegex.test(nameInput)) return errorDiv.innerText = "Por favor, ingresa un nombre válido.";

        // valida que la tarjeta tenga 16 números
        const numberRegex = /^\d{16}$/;
        if (!numberRegex.test(numberInput)) return errorDiv.innerText = "El número de tarjeta debe tener 16 dígitos.";

        // valida el formato de fecha MM/AA
        const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        if (!expiryRegex.test(expiryInput)) return errorDiv.innerText = "El formato de vencimiento debe ser Mes/Año.";

        // extrae mes/año y valida que no haya caducado
        const [month, year] = expiryInput.split('/');
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = parseInt(now.getFullYear().toString().slice(-2));
        
        if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) return errorDiv.innerText = "La tarjeta ha expirado o la fecha es inválida.";

        // valida que el CVV tenga 3 o 4 números
        const cvvRegex = /^\d{3,4}$/;
        if (!cvvRegex.test(cvvInput)) return errorDiv.innerText = "El CVV debe tener 3 o 4 dígitos.";

        errorDiv.innerText = ""; // limpia los errores si todo está bien

        // prepara los datos del pedido para el servidor
        const datosPedido = {
            cliente: nameInput,
            tarjeta: numberInput.slice(-4), // Solo enviamos los últimos 4 dígitos por seguridad
            articulos: carrito
        };

        try {
            errorDiv.style.color = "var(--oxford-blue)";
            errorDiv.innerText = "Procesando pago con el servidor...";

            // envía el pedido a la API
            const response = await fetch('http://localhost:3000/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosPedido)
            });

            if (!response.ok) throw new Error('Error al procesar el pago.');
            const result = await response.json();

            // 3. Tarjeta de compra de éxito con el ID que nos dio el servidor
            modalOverlay.innerHTML = `
                <div style="background-color: #fff; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.3); max-width: 400px; width: 90%;">
                    <div style="font-size: 50px; margin-bottom: 15px;">✅</div>
                    <h2 style="margin: 0 0 10px; color: var(--oxford-blue); font-family: 'Playfair Display', serif;">¡Compra Exitosa!</h2>
                    <p style="margin: 0 0 20px; color: #666; font-size: 0.9rem;">Tu pedido <strong>#${result.orderId}</strong> ha sido procesado correctamente. ¡Gracias por elegirnos!</p>
                    <button id="btn-cerrar-exito" style="background-color: var(--yinmn-blue); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%;">Aceptar</button>
                </div>
            `;

            document.getElementById('btn-cerrar-exito').addEventListener('click', () => document.body.removeChild(modalOverlay));
            carrito = [];
            localStorage.setItem('carritoMercaUP', JSON.stringify(carrito));
            actualizarHUDCarrito(); 
        } catch (error) {
            errorDiv.style.color = "#ff4d4d";
            errorDiv.innerText = "Hubo un error de conexión. Intenta nuevamente.";
        }
    });
}

function actualizarHUDCarrito() {
    if (cartContainer) {
        cartContainer.innerHTML = carrito.length > 0 ? cartFullComponent : cartEmptyComponent;
    }
    renderizarDrawerCarrito();
}

function filtrarCatalogo(termino){
    const terminoMinusculas = termino.toLowerCase().trim();
    const productosFiltrados = todosLosProductos.filter(producto => {
        return producto.name.toLowerCase().includes(terminoMinusculas) || 
               producto.category.toLowerCase().includes(terminoMinusculas);
    });
    renderCatalog(productosFiltrados);
}

function cambiarMoneda(nuevaMoneda) {
    if (tasasDeCambio[nuevaMoneda]) {
    }
}

function renderizarDrawerCarrito() {
    const drawer = document.getElementById('cart-drawer');
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total-price');
    
    if (!drawer || !container) return;

    if (carrito.length === 0) {
        container.innerHTML = '<p>Tu carrito está vacío.</p>';
        totalElement.innerText = `0.00 ${monedaActual}`;
        return;
    }

    const conteo = {};
    carrito.forEach(id => conteo[id] = (conteo[id] || 0) + 1);

    let html = '';
    let total = 0;
    const tasa = tasasDeCambio[monedaActual] || 1;

    for (const [id, cantidad] of Object.entries(conteo)) {
        const p = todosLosProductos.find(prod => prod.productId === id);
        if (p) {
            const subtotal = (p.price * tasa) * cantidad;
            const subtotalFormateado = subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            total += subtotal;
            html += `
                <div class="cart-item-row" style="align-items: center;">
                    <span style="flex-grow: 1;">${p.name}</span>
                    <div style="display: flex; align-items: center; gap: 5px; margin-right: 15px;">
                        <button class="btn-restar" data-id="${id}" ${cantidad <= 1 ? 'disabled' : ''} style="padding: 2px 6px; cursor: ${cantidad <= 1 ? 'not-allowed' : 'pointer'}; border: 1px solid #ccc; background: ${cantidad <= 1 ? '#eee' : '#fff'}; color: ${cantidad <= 1 ? '#aaa' : '#000'};">-</button>
                        <strong>${cantidad}</strong>
                        <button class="btn-sumar" data-id="${id}" ${p.stock <= 0 ? 'disabled' : ''} style="padding: 2px 6px; cursor: ${p.stock <= 0 ? 'not-allowed' : 'pointer'}; border: 1px solid #ccc; background: ${p.stock <= 0 ? '#eee' : '#fff'}; color: ${p.stock <= 0 ? '#aaa' : '#000'};">+</button>
                    </div>
                    <span style="margin-right: 15px;">$${subtotalFormateado}</span>
                    <button class="btn-eliminar" data-id="${id}" style="background: none; border: none; cursor: pointer; color: red; font-size: 1.2rem;">🗑️</button>
                </div>
            `;
        }
    }

    container.innerHTML = html;
    // muestra el total convertido.
    const totalFormateado = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalElement.innerText = `${totalFormateado} ${monedaActual}`;
}

catalogContainer.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON' && !event.target.disabled) {
        agregarAlCarrito(event.target.getAttribute('data-id'));
    }
});

searchBar.addEventListener('input', (event) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => filtrarCatalogo(event.target.value), 300);
});

cartContainer.addEventListener('click', () => {
    document.getElementById('cart-drawer').classList.add('open');
    document.body.classList.add('drawer-is-open');
});

async function inicializarApp() {
    // ejecuta ambas cargas de datos en paralelo para mejorar el tiempo de carga
    await Promise.all([
        fetchProducts(),
        fetchTasasCambio()
    ]);

    // cuando todos los datos están listos, renderiza la vista inicial
    renderCatalog(todosLosProductos);
    actualizarHUDCarrito();

    // creación del Drawer del Carrito (se hace después para asegurar que todo esté cargado)
    const monedaGuardada = sessionStorage.getItem('monedaMercaUP') || 'MXN';
    const drawerHTML = `
        <div id="cart-drawer" class="cart-drawer">
            <div class="cart-header">
                <h3>Resumen de Compra</h3>
                <!-- elector para que el usuario elija la moneda. -->
                <select id="currency-selector" style="margin-left: auto; margin-right: 15px; padding: 2px;">
                    <option value="MXN" ${monedaGuardada === 'MXN' ? 'selected' : ''}>MXN</option>
                    <option value="USD" ${monedaGuardada === 'USD' ? 'selected' : ''}>USD</option>
                    <option value="EUR" ${monedaGuardada === 'EUR' ? 'selected' : ''}>EUR</option>
                </select>
                <button class="close-cart-btn" id="close-drawer">✕</button>
            </div>
            <div id="cart-items-container" class="cart-items-container"></div>
            <div class="cart-footer">
                <p>Total: <strong id="cart-total-price">0.00 ${monedaGuardada}</strong></p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="btn-vaciar" style="background-color: #ff4d4d; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; flex: 1; font-weight: bold;">Vaciar</button>
                    <button class="btn-checkout" id="btn-checkout" style="flex: 2;">Proceder al Pago</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', drawerHTML);

    document.getElementById('close-drawer').addEventListener('click', () => {
        document.getElementById('cart-drawer').classList.remove('open');
        document.body.classList.remove('drawer-is-open');
    });

    document.getElementById('cart-items-container')?.addEventListener('click', (event) => {
        const target = event.target;
        const id = target.getAttribute('data-id') || target.closest('button')?.getAttribute('data-id');
        
        if (target.closest('.btn-eliminar')) {
            eliminarDelCarrito(id);
        } else if (target.closest('.btn-sumar')) {
            agregarAlCarrito(id); // se llama una función ya existente
        } else if (target.closest('.btn-restar')) {
            restarDelCarrito(id);
        }
    });

    document.getElementById('currency-selector')?.addEventListener('change', (event) => {
        cambiarMoneda(event.target.value);
    });

    // agrega los eventos a los nuevos botones
    document.getElementById('btn-vaciar')?.addEventListener('click', vaciarCarrito);
    document.getElementById('btn-checkout')?.addEventListener('click', procesarPago);
}

document.addEventListener('DOMContentLoaded', inicializarApp);