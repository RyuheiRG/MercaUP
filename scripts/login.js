const usuarioValido = "admin";
const paswordValido = "123456";

// valida el login
function validarLogin(usuarioIngresado, passwordIngresado) {
    // valida campos vacíos
    if (!usuarioIngresado || !passwordIngresado) {
        alert("Por favor, ingresa tu usuario y contraseña.");
        return false;
    }

    // comprueba credenciales
    if (usuarioIngresado === usuarioValido && passwordIngresado === paswordValido) {
        console.log("Autenticación exitosa.");
        alert("¡Bienvenido, " + usuarioIngresado + "!");
        
        // redirigir al inicio
        return true;
    } else {
        alert("Usuario o contraseña incorrectos. Intenta de nuevo.");
        return false;
    }
}

// Función para leer los datos de los futuros inputs del HTML
function procesarLogin(event) {
    if (event) event.preventDefault(); // Evita que la página se recargue si usas un <form>

    // Lee los valores si los inputs ya existen en el HTML, de lo contrario devuelve vacío
    const usuarioText = document.getElementById("usuario") ? document.getElementById("usuario").value : "";
    const passwordText = document.getElementById("password") ? document.getElementById("password").value : "";

    validarLogin(usuarioText.trim(), passwordText.trim());
}

// función para cerrar la sesión
function cerrarSesion() {
    console.log("Sesión cerrada.");
    alert("Has cerrado sesión exitosamente.");
    // Si tuvieras una página de login, aquí podrías redirigir: window.location.href = "login.html";
}
