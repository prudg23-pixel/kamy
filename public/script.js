
// ==========================================
// KAMY - NAVEGACIÓN
// ==========================================

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

    if (selectedButton) selectedButton.classList.add("active");

    if (pageName === "players") loadPlayers();
}

navButtons.forEach(button => {
    button.addEventListener("click", () => openPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(element => {
    element.addEventListener("click", () => openPage(element.dataset.go));
});

// ==========================================
// KAMY - CONEXIÓN
// ==========================================

fetch("/api/status")
    .then(response => response.json())
    .then(data => console.log("Servidor conectado:", data))
    .catch(error => console.error("Error de conexión:", error));

console.log("KAMY iniciado correctamente");

// ==========================================
// KAMY - AUTENTICACIÓN
// ==========================================

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

openAuthButton.addEventListener("click", () => {
    if (currentUser) {
        showUserMenu();
        return;
    }

    authContainer.style.display = "flex";
});

authContainer.addEventListener("click", event => {
    if (event.target === authContainer) {
        authContainer.style.display = "none";
    }
});

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
registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
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
loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const login = document.getElementById("login-user").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
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
        const response = await fetch("/api/me", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            currentUser = null;
            openAuthButton.textContent = "Iniciar sesión / Registrarse";
            document.getElementById("sidebar-username").textContent = "Kamy User";
            return;
        }

        const data = await response.json();
        currentUser = data.user;

        openAuthButton.textContent = "Hola, " + currentUser.username;
        document.getElementById("sidebar-username").textContent =
            currentUser.username;

    } catch (error) {
        console.error("Error al consultar usuario:", error);
    }
}

// Menú del usuario
function showUserMenu() {
    const previousMenu = document.getElementById("kamy-user-menu");
    if (previousMenu) previousMenu.remove();

    const menu = document.createElement("div");
    menu.id = "kamy-user-menu";

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

    document.body.appendChild(menu);

    document.getElementById("kamy-logout").addEventListener("click", logoutKamy);

    setTimeout(() => {
        document.addEventListener("click", function closeMenu(event) {
            if (!menu.contains(event.target) && event.target !== openAuthButton) {
                menu.remove();
                document.removeEventListener("click", closeMenu);
            }
        });
    }, 0);
}

// Protección de texto
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
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
            method: "POST",
            credentials: "same-origin"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo cerrar sesión.");
        }

        currentUser = null;

        openAuthButton.textContent = "Iniciar sesión / Registrarse";
        document.getElementById("sidebar-username").textContent = "Kamy User";

        const menu = document.getElementById("kamy-user-menu");
        if (menu) menu.remove();

        playersList.innerHTML = `
            <div class="placeholder">
                <h2>Iniciá sesión</h2>
                <p>Necesitás una cuenta KAMY para buscar jugadores.</p>
            </div>
        `;

        alert("Cerraste sesión correctamente.");

    } catch (error) {
        alert(error.message);
    }
}

// ==========================================
// KAMY AI - CHAT
// ==========================================

const aiChatForm = document.getElementById("ai-chat-form");
const aiChatInput = document.getElementById("ai-chat-input");
const aiMessages = document.getElementById("ai-messages");
const aiSendButton = document.getElementById("ai-send-button");

let aiConversation = [];
let aiBusy = false;

function addAIMessage(role, content) {
    const message = document.createElement("div");
    message.className = "ai-message " + role;

    const label = document.createElement("strong");
    label.textContent = role === "user" ? "Vos" : "KAMY AI";

    const paragraph = document.createElement("p");
    paragraph.textContent = content;

    message.appendChild(label);
    message.appendChild(paragraph);
    aiMessages.appendChild(message);

    aiMessages.scrollTop = aiMessages.scrollHeight;

    return message;
}

function clearAIWelcome() {
    const welcome = aiMessages.querySelector(".ai-welcome");
    if (welcome) welcome.remove();
}

async function sendAIMessage(messageText) {
    const text = messageText.trim();

    if (!text || aiBusy) return;

    clearAIWelcome();

    aiConversation.push({
        role: "user",
        content: text
    });

    addAIMessage("user", text);

    aiChatInput.value = "";
    aiBusy = true;
    aiSendButton.disabled = true;
    aiSendButton.textContent = "Pensando...";

    const loadingMessage = addAIMessage("assistant", "KAMY AI está pensando...");

    try {
        const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                messages: aiConversation
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo obtener una respuesta.");
        }

        const answer =
            data.reply ||
            data.response ||
            data.message ||
            data.output_text ||
            data.text;

        if (!answer) {
            throw new Error("El servidor no devolvió una respuesta válida.");
        }

        loadingMessage.querySelector("p").textContent = answer;

        aiConversation.push({
            role: "assistant",
            content: answer
        });

    } catch (error) {
        loadingMessage.querySelector("p").textContent =
            "Error: " + error.message;

        console.error("Error de KAMY AI:", error);

    } finally {
        aiBusy = false;
        aiSendButton.disabled = false;
        aiSendButton.textContent = "Enviar ↑";
        aiChatInput.focus();
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }
}

aiChatForm.addEventListener("submit", event => {
    event.preventDefault();
    sendAIMessage(aiChatInput.value);
});

// Sugerencias del chat
document.querySelectorAll("[data-ai-prompt]").forEach(button => {
    button.addEventListener("click", () => {
        sendAIMessage(button.dataset.aiPrompt);
    });
});

// Enter envía el mensaje; Shift + Enter agrega una línea
aiChatInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        aiChatForm.requestSubmit();
    }
});

// ==========================================
// KAMY AI - CAMBIAR ENTRE CHAT E IMÁGENES
// ==========================================

const aiModeButtons = document.querySelectorAll("[data-ai-mode]");
const aiChatPanel = document.getElementById("ai-chat-panel");
const aiImagePanel = document.getElementById("ai-image-panel");

aiModeButtons.forEach(button => {
    button.addEventListener("click", () => {
        const mode = button.dataset.aiMode;

        aiModeButtons.forEach(item => item.classList.remove("active"));
        button.classList.add("active");

        aiChatPanel.hidden = mode !== "chat";
        aiImagePanel.hidden = mode !== "image";
    });
});

// ==========================================
// KAMY AI - GENERADOR DE IMÁGENES
// ==========================================

const aiImageForm = document.getElementById("ai-image-form");
const aiImagePrompt = document.getElementById("ai-image-prompt");
const aiImageButton = document.getElementById("ai-image-button");
const aiImageLoading = document.getElementById("ai-image-loading");
const aiImageResult = document.getElementById("ai-image-result");
const aiImageError = document.getElementById("ai-image-error");

aiImageForm.addEventListener("submit", async event => {
    event.preventDefault();

    const prompt = aiImagePrompt.value.trim();

    if (!prompt) return;

    aiImageButton.disabled = true;
    aiImageButton.textContent = "Generando...";
    aiImageLoading.hidden = false;
    aiImageError.textContent = "";
    aiImageResult.innerHTML = "";

    try {
        const response = await fetch("/api/ai/image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo generar la imagen.");
        }

        const imageUrl =
            data.image ||
            data.url ||
            data.imageUrl ||
            data.data?.[0]?.url ||
            (data.data?.[0]?.b64_json
                ? "data:image/png;base64," + data.data[0].b64_json
                : null);

        if (!imageUrl) {
            throw new Error("El servidor no devolvió una imagen.");
        }

        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = prompt;
        image.className = "generated-ai-image";

        aiImageResult.appendChild(image);

        const downloadLink = document.createElement("a");
        downloadLink.href = imageUrl;
        downloadLink.download = "kamy-ai-image.png";
        downloadLink.textContent = "Descargar imagen";
        downloadLink.className = "ai-download-button";

        aiImageResult.appendChild(downloadLink);

    } catch (error) {
        aiImageError.textContent = error.message;
        console.error("Error generando imagen:", error);

    } finally {
        aiImageLoading.hidden = true;
        aiImageButton.disabled = false;
        aiImageButton.textContent = "✦ Generar imagen";
    }
});

// ==========================================
// KAMY PLAYERS - BUSCADOR
// ==========================================

const playersList = document.getElementById("players-list");
const playersCount = document.getElementById("players-count");

const playerSearch = document.getElementById("player-search");
const searchButton = document.getElementById("search-players");

const filterRank = document.getElementById("filter-rank");
const filterRegion = document.getElementById("filter-region");
const filterMode = document.getElementById("filter-mode");
const filterPlatform = document.getElementById("filter-platform");
const filterTeam = document.getElementById("filter-team");

async function loadPlayers() {
    if (!currentUser) {
        playersCount.textContent = "Iniciá sesión para continuar.";

        playersList.innerHTML = `
            <div class="placeholder">
                <h2>♙ Bienvenido a Players</h2>
                <p>Iniciá sesión para descubrir jugadores de Rocket League.</p>
                <button class="primary-btn" id="players-login">
                    Iniciar sesión
                </button>
            </div>
        `;

        document.getElementById("players-login").addEventListener("click", () => {
            authContainer.style.display = "flex";
        });

        return;
    }

    playersCount.textContent = "Buscando jugadores...";
    playersList.innerHTML = "<p>Cargando jugadores...</p>";

    const params = new URLSearchParams();

    if (playerSearch.value.trim()) {
        params.set("q", playerSearch.value.trim());
    }

    if (filterRank.value) params.set("rank", filterRank.value);
    if (filterRegion.value) params.set("region", filterRegion.value);
    if (filterMode.value) params.set("mode", filterMode.value);
    if (filterPlatform.value) params.set("platform", filterPlatform.value);

    if (filterTeam.checked) {
        params.set("lookingForTeam", "true");
    }

    try {
        const response = await fetch("/api/players?" + params.toString(), {
            credentials: "same-origin"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudieron cargar los jugadores.");
        }

        renderPlayers(data.players || []);

    } catch (error) {
        playersCount.textContent = "Error";

        playersList.innerHTML = `
            <div class="placeholder">
                <h2>No se pudieron cargar los jugadores</h2>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

// Dibujar tarjetas de jugadores
function renderPlayers(players) {
    playersCount.textContent =
        players.length + (players.length === 1
            ? " jugador encontrado"
            : " jugadores encontrados");

    if (players.length === 0) {
        playersList.innerHTML = `
            <div class="placeholder">
                <h2>♙ Todavía no hay jugadores</h2>
                <p>No encontramos jugadores con esos filtros.</p>
                <p>¡Completá tu perfil para aparecer en el buscador!</p>
            </div>
        `;
        return;
    }

    playersList.innerHTML = players.map(player => {
        const profile = player.profile || {};
        const firstLetter = (player.username || "K").charAt(0).toUpperCase();

        const connectedPlatforms = Object.entries(profile.platforms || {})
            .filter(([, value]) => value)
            .map(([name]) => ({
                epic: "Epic Games",
                steam: "Steam",
                playstation: "PlayStation",
                xbox: "Xbox",
                nintendo: "Nintendo"
            }[name]))
            .join(" · ");

        return `
            <article class="player-card">
                <div class="player-card-top">
                    <div class="player-avatar">${escapeHTML(firstLetter)}</div>

                    <div class="player-info">
                        <h3>${escapeHTML(player.username)}</h3>
                        <span>${escapeHTML(profile.rank || "Rango no indicado")}</span>
                    </div>

                    ${profile.lookingForTeam
                        ? '<span class="looking-badge">Buscando equipo</span>'
                        : ""}
                </div>

                <p class="player-bio">
                    ${escapeHTML(profile.bio || "Este jugador todavía no agregó una descripción.")}
                </p>

                <div class="player-details">
                    <span>🌎 ${escapeHTML(profile.region || "Sin región")}</span>
                    <span>🎮 ${escapeHTML(profile.mode || "Sin modo")}</span>
                    <span>🖥️ ${escapeHTML(profile.platform || "Sin plataforma")}</span>
                </div>

                <div class="player-platforms">
                    ${connectedPlatforms
                        ? "Cuentas: " + escapeHTML(connectedPlatforms)
                        : "Sin cuentas adicionales"}
                </div>
            </article>
        `;
    }).join("");
}

// Buscar con botón o Enter
searchButton.addEventListener("click", loadPlayers);

playerSearch.addEventListener("keydown", event => {
    if (event.key === "Enter") loadPlayers();
});

// Actualizar resultados cuando cambian los filtros
[
    filterRank,
    filterRegion,
    filterMode,
    filterPlatform,
    filterTeam
].forEach(filter => {
    filter.addEventListener("change", loadPlayers);
});

// ==========================================
// KAMY PLAYERS - MI PERFIL
// ==========================================

const profilePanel = document.getElementById("player-profile-panel");
const profileForm = document.getElementById("player-profile-form");
const profileMessage = document.getElementById("profile-message");

const editProfileButton = document.getElementById("edit-player-profile");
const closeProfileButton = document.getElementById("close-player-profile");

function showProfilePanel() {
    if (!currentUser) {
        authContainer.style.display = "flex";
        return;
    }

    profilePanel.style.display = "block";
    loadMyProfile();

    profilePanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

editProfileButton.addEventListener("click", showProfilePanel);

document.getElementById("open-my-profile").addEventListener("click", () => {
    openPage("players");
    showProfilePanel();
});

closeProfileButton.addEventListener("click", () => {
    profilePanel.style.display = "none";
});

// Cargar mi perfil
async function loadMyProfile() {
    if (!currentUser) return;

    try {
        const response = await fetch("/api/profile", {
            credentials: "same-origin"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo cargar el perfil.");
        }

        const profile = data.profile || {};

        document.getElementById("profile-bio").value = profile.bio || "";
        document.getElementById("profile-rank").value = profile.rank || "";
        document.getElementById("profile-region").value = profile.region || "";
        document.getElementById("profile-mode").value = profile.mode || "";
        document.getElementById("profile-platform").value = profile.platform || "";

        const platforms = profile.platforms || {};

        document.getElementById("platform-epic").value = platforms.epic || "";
        document.getElementById("platform-steam").value = platforms.steam || "";
        document.getElementById("platform-playstation").value = platforms.playstation || "";
        document.getElementById("platform-xbox").value = platforms.xbox || "";
        document.getElementById("platform-nintendo").value = platforms.nintendo || "";

        document.getElementById("profile-looking-team").checked =
            Boolean(profile.lookingForTeam);

    } catch (error) {
        profileMessage.textContent = error.message;
        profileMessage.style.color = "red";
    }
}

// Guardar mi perfil
profileForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) {
        authContainer.style.display = "flex";
        return;
    }

    const profile = {
        bio: document.getElementById("profile-bio").value,
        rank: document.getElementById("profile-rank").value,
        region: document.getElementById("profile-region").value,
        mode: document.getElementById("profile-mode").value,
        platform: document.getElementById("profile-platform").value,

        platforms: {
            epic: document.getElementById("platform-epic").value,
            steam: document.getElementById("platform-steam").value,
            playstation: document.getElementById("platform-playstation").value,
            xbox: document.getElementById("platform-xbox").value,
            nintendo: document.getElementById("platform-nintendo").value
        },

        lookingForTeam: document.getElementById("profile-looking-team").checked
    };

    profileMessage.textContent = "Guardando perfil...";
    profileMessage.style.color = "#aaa";

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify(profile)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo guardar el perfil.");
        }

        profileMessage.textContent = "¡Tu perfil se guardó correctamente!";
        profileMessage.style.color = "#39d353";

        await loadPlayers();

    } catch (error) {
        profileMessage.textContent = error.message;
        profileMessage.style.color = "red";
    }
});

// ==========================================
// KAMY - INICIALIZACIÓN
// ==========================================

async function initializeKamy() {
    await updateKamyUser();
}

initializeKamy();
