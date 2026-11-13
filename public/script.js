
const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

function openPage(pageName) {
    pages.forEach(page => page.classList.remove("active"));
    navButtons.forEach(button => button.classList.remove("active"));

    const selectedPage = document.getElementById(pageName);
    if (!selectedPage) return;

    selectedPage.classList.add("active");

    const selectedButton = document.querySelector(
        `.nav-btn[data-page="${pageName}"]`
    );

    if (selectedButton) {
        selectedButton.classList.add("active");
    }
}

// Navegación lateral
navButtons.forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

// Botones y tarjetas de inicio
document.querySelectorAll("[data-go]").forEach(element => {
    element.addEventListener("click", () => {
        openPage(element.dataset.go);
    });
});

// Estado del servidor
fetch("/api/status")
    .then(response => response.json())
    .then(data => {
        console.log("Servidor conectado:", data);
    })
    .catch(error => {
        console.error("Error de conexión:", error);
    });

console.log("KAMY iniciado correctamente");

// =================================
// KAMY - SISTEMA DE AUTENTICACIÓN
// =================================

const authContainer = document.getElementById("auth-container");
const openAuthButton = document.getElementById("open-auth");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const switchAuthButton = document.getElementById("switch-auth");
const authTitle = document.getElementById("auth-title");
const authDescription = document.getElementById("auth-description");
const authMessage = document.getElementById("auth-message");

let showingRegister = false;
let currentUser = null;

// Abrir acceso o menú de usuario
openAuthButton.addEventListener("click", async () => {
    if (currentUser) {
        showUserMenu();
        return;
    }

    authContainer.style.display = "flex";
});

// Cerrar ventana al hacer clic fuera del formulario
authContainer.addEventListener("click", (event) => {
    if (event.target === authContainer) {
        authContainer.style.display = "none";
    }
});

// Cambiar entre login y registro
switchAuthButton.addEventListener("click", () => {
    showingRegister = !showingRegister;

    loginForm.style.display = showingRegister ? "none" : "block";
    registerForm.style.display = showingRegister ? "block" : "none";

    authTitle.textContent = showingRegister
        ? "Crear cuenta en KAMY"
        : "Bienvenido a KAMY";

    authDescription.textContent = showingRegister
        ? "Registrate para comenzar"
        : "Iniciá sesión para continuar";

    switchAuthButton.textContent = showingRegister
        ? "¿Ya tenés cuenta? Iniciá sesión"
        : "¿No tenés cuenta? Registrate";

    authMessage.textContent = "";
});

// Registro
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo crear la cuenta.");
        }

        authMessage.textContent = "¡Cuenta creada correctamente!";
        authMessage.style.color = "#39d353";

        registerForm.reset();
        await updateKamyUser();

    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.style.color = "red";
    }
});

// Inicio de sesión
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const login = document.getElementById("login-user").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo iniciar sesión.");
        }

        authMessage.textContent = "¡Bienvenido a KAMY!";
        authMessage.style.color = "#39d353";

        loginForm.reset();
        await updateKamyUser();

    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.style.color = "red";
    }
});

// Actualizar usuario conectado
async function updateKamyUser() {
    try {
        const response = await fetch("/api/me");

        if (!response.ok) {
            currentUser = null;
            openAuthButton.textContent = "Iniciar sesión / Registrarse";
            return;
        }

        const data = await response.json();

        currentUser = data.user;
        openAuthButton.textContent = "Hola, " + currentUser.username;

    } catch (error) {
        console.error("Error al consultar usuario:", error);
    }
}

// Menú del usuario
function showUserMenu() {
    const menu = document.createElement("div");

    menu.style.cssText = `
        position: fixed;
        top: 75px;
        right: 25px;
        z-index: 10001;
        background: #171717;
        color: white;
        padding: 20px;
        border: 1px solid #333;
        border-radius: 12px;
        min-width: 200px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.5);
    `;

    menu.innerHTML = `
        <h3 style="margin:0 0 8px;">${escapeHTML(currentUser.username)}</h3>
        <p style="color:#aaa;font-size:13px;">${escapeHTML(currentUser.email)}</p>
        <button id="kamy-logout" style="
            width:100%;
            padding:10px;
            margin-top:10px;
            background:#e04444;
            color:white;
            border:0;
            border-radius:8px;
            cursor:pointer;
        ">Cerrar sesión</button>
    `;

    const previousMenu = document.getElementById("kamy-user-menu");
    if (previousMenu) previousMenu.remove();

    menu.id = "kamy-user-menu";
    document.body.appendChild(menu);

    document.getElementById("kamy-logout").addEventListener("click", logoutKamy);

    document.addEventListener("click", function closeMenu(event) {
        if (!menu.contains(event.target) && event.target !== openAuthButton) {
            menu.remove();
            document.removeEventListener("click", closeMenu);
        }
    });
}

// Evitar insertar texto del usuario como HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// Cerrar sesión
async function logoutKamy() {
    try {
        const response = await fetch("/api/logout", {
            method: "POST"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo cerrar sesión.");
        }

        currentUser = null;
        openAuthButton.textContent = "Iniciar sesión / Registrarse";

        const menu = document.getElementById("kamy-user-menu");
        if (menu) menu.remove();

        alert("Cerraste sesión correctamente.");

    } catch (error) {
        alert(error.message);
    }
}

// Comprobar sesión al cargar
updateKamyUser();
