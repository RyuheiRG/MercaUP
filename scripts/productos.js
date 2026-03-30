const API_URL = './scripts/productos.JSON';
const catalogContainer = document.getElementById('catalogo');

// persistencia de datos
let carrito = JSON.parse(localStorage.getItem('carritoMercaUP')) || [];
let todosLosProductos = [];

// para cuando muestre el carrito y se agregue un producto
window.agregarAlCarrito = function(productoId){
    carrito.push(productoId); 
    localStorage.setItem('carritoMercaUP', JSON.stringify(carrito));

    console.log("Producto agregado: ", productoId);

    alert("¡Producto añadido al carrito!")
}

async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Error de Red: ${response.status}`);
        }

        const jsonPayload = await response.json();

        if (jsonPayload.metadata.status !== 200) {
            throw new Error('La API retornó un estado comprometido.');
        }

        todosLosProductos = jsonPayload.data;
        renderCatalog(todosLosProductos);

    } catch (error) {
        console.error('[Zero Trust] Caída de conexión:', error);
        catalogContainer.innerHTML = '<p>Error de conexión con el Servidor Principal.</p>';
    }
}

function renderCatalog(productsArray) {
    catalogContainer.innerHTML = ''; 
    
    const fragment = document.createDocumentFragment();

    productsArray.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const imageFile = product.imagePath.replace('.png', '.jpg');
        
        //para el botón cuando hay o no producto en stock
        const hayExistencias = product.stock > 0;
        const buttonColor = hayExistencias ? 'gray' : 'black';
        const buttonState = hayExistencias ? '' : 'disabled';
        const buttonText = hayExistencias ? 'Agregar al carrito' : 'Agotado';

        productCard.innerHTML = `
            <img src="${imageFile}" alt="${product.name}" style="max-width: 100%; border-radius: 8px;">
            <h3>${product.name}</h3>
            <p>Categoría: ${product.category}</p>
            <p><strong>Precio: $${product.price.toFixed(2)} ${product.currency}</strong></p>
            <button style="background-color: ${buttonColor}; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: ${hayExistencias ? 'pointer' : 'not-allowed'};" onclick="agregarAlCarrito('${product.productId}')" ${buttonState}>${buttonText}</button>
        `;
        
        fragment.appendChild(productCard);
    });

    catalogContainer.appendChild(fragment);
}

document.addEventListener('DOMContentLoaded', fetchProducts);

function filtrarCatalogo(termino){
    const terminoMinusculas = termino.toLowerCase();
    const productosFiltrados = todosLosProductos.filter(producto => {
        return producto.name.toLowerCase().includes(terminoMinusculas) || 
               producto.category.toLowerCase().includes(terminoMinusculas);
    });
    renderCatalog(productosFiltrados);
}