import { cartEmptyComponent, cartFullComponent } from '../components/cart.js';

const API_URL = './scripts/productos.json'; 
const catalogContainer = document.getElementById('catalogo');
const searchBar = document.getElementById('search-bar');
const cartContainer = document.querySelector('.cart-container');

let todosLosProductos = [];
let carrito = JSON.parse(localStorage.getItem('carritoMercaUP')) || [];
let debounceTimer;

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

        renderCatalog(todosLosProductos);
        actualizarHUDCarrito();

    } catch (error) {
        console.error('[Zero Trust] Caída de conexión:', error);
        catalogContainer.innerHTML = '<p>Error de conexión con el Servidor Principal.</p>';
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

        productCard.innerHTML = `
            <img src="${imageFile}" alt="${product.name}" style="max-width: 100%; border-radius: 8px;">
            <h3>${product.name}</h3>
            <p>Categoría: ${product.category}</p>
            <p>Stock Disponible: <strong>${product.stock}</strong></p>
            <ul>
                ${Object.entries(product.specs).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
            </ul>
            <p><strong>Precio: $${product.price.toFixed(2)} ${product.currency}</strong></p>
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

function renderizarDrawerCarrito() {
    const drawer = document.getElementById('cart-drawer');
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total-price');
    
    if (!drawer || !container) return;

    if (carrito.length === 0) {
        container.innerHTML = '<p>Tu carrito está vacío.</p>';
        totalElement.innerText = '0.00 MXN';
        return;
    }

    const conteo = {};
    carrito.forEach(id => conteo[id] = (conteo[id] || 0) + 1);

    let html = '';
    let total = 0;

    for (const [id, cantidad] of Object.entries(conteo)) {
        const p = todosLosProductos.find(prod => prod.productId === id);
        if (p) {
            const subtotal = p.price * cantidad;
            total += subtotal;
            html += `
                <div class="cart-item-row">
                    <span>${p.name} <strong>(x${cantidad})</strong></span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
            `;
        }
    }

    container.innerHTML = html;
    totalElement.innerText = `${total.toFixed(2)} MXN`;
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
});

document.addEventListener('DOMContentLoaded', () => {
    const drawerHTML = `
        <div id="cart-drawer" class="cart-drawer">
            <div class="cart-header">
                <h3>Resumen de Compra</h3>
                <button class="close-cart-btn" id="close-drawer">✕</button>
            </div>
            <div id="cart-items-container" class="cart-items-container"></div>
            <div class="cart-footer">
                <p>Total: <strong id="cart-total-price">0.00 MXN</strong></p>
                <button class="btn-checkout">Proceder al Pago</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', drawerHTML);

    document.getElementById('close-drawer').addEventListener('click', () => {
        document.getElementById('cart-drawer').classList.remove('open');
    });

    fetchProducts();
});