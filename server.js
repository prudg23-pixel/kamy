
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

app.use(express.json({ limit: "2mb" }));

app.use(session({
    secret: process.env.SESSION_SECRET || "kamy-local-secret-change-before-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// ARCHIVOS Y USUARIOS
// ==========================================

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, "[]");
    }

    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function publicUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile || {}
    };
}

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Tenés que iniciar sesión."
        });
    }

    const user = readUsers().find(u => u.id === req.session.userId);

    if (!user) {
        return res.status(401).json({
            error: "Usuario no encontrado."
        });
    }

    req.user = user;
    next();
}

function requireOpenAI(req, res, next) {
    if (!openai) {
        return res.status(503).json({
            error: "KAMY AI no está configurada. Revisá tu archivo .env."
        });
    }

    next();
}

// Identificador privado y estable para las solicitudes a OpenAI.
function getSafetyIdentifier(userId) {
    return crypto
        .createHash("sha256")
        .update(String(userId))
        .digest("hex");
}

// ==========================================
// ESTADO DE KAMY
// ==========================================

app.get("/api/status", (req, res) => {
    res.json({
        name: "KAMY",
        status: "online",
        version: "1.2.0",
        aiConfigured: Boolean(openai)
    });
});

// ==========================================
// REGISTRO
// ==========================================

app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                error: "Completá todos los campos."
            });
        }

        if (username.trim().length < 3) {
            return res.status(400).json({
                error: "El usuario debe tener al menos 3 caracteres."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "La contraseña debe tener al menos 8 caracteres."
            });
        }

        const users = readUsers();

        const exists = users.some(user =>
            user.username.toLowerCase() === username.trim().toLowerCase() ||
            user.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (exists) {
            return res.status(409).json({
                error: "Ese usuario o correo ya está registrado."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = {
            id: crypto.randomUUID(),
            username: username.trim(),
            email: email.trim().toLowerCase(),
            passwordHash,
            createdAt: new Date().toISOString(),
            profile: {
                bio: "",
                rank: "",
                region: "",
                mode: "",
                platform: "",
                platforms: {
                    epic: "",
                    steam: "",
                    playstation: "",
                    xbox: "",
                    nintendo: ""
                },
                lookingForTeam: false
            }
        };

        users.push(newUser);
        saveUsers(users);

        req.session.userId = newUser.id;

        res.status(201).json({
            message: "¡Cuenta creada correctamente!",
            user: publicUser(newUser)
        });

    } catch (error) {
        console.error("Error de registro:", error.message);
        res.status(500).json({
            error: "Error al registrar la cuenta."
        });
    }
});

// ==========================================
// INICIAR SESIÓN
// ==========================================

app.post("/api/login", async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                error: "Completá todos los campos."
            });
        }

        const users = readUsers();

        const user = users.find(user =>
            user.username.toLowerCase() === login.trim().toLowerCase() ||
            user.email.toLowerCase() === login.trim().toLowerCase()
        );

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({
                error: "Usuario o contraseña incorrectos."
            });
        }

        req.session.regenerate(err => {
            if (err) {
                return res.status(500).json({
                    error: "No se pudo iniciar la sesión."
                });
            }

            req.session.userId = user.id;

            res.json({
                message: "Sesión iniciada correctamente.",
                user: publicUser(user)
            });
        });

    } catch (error) {
        console.error("Error de inicio de sesión:", error.message);
        res.status(500).json({
            error: "Error al iniciar sesión."
        });
    }
});

// ==========================================
// USUARIO CONECTADO
// ==========================================

app.get("/api/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "No hay ninguna sesión iniciada."
        });
    }

    const user = readUsers().find(u => u.id === req.session.userId);

    if (!user) {
        return res.status(401).json({
            error: "Usuario no encontrado."
        });
    }

    res.json({
        user: publicUser(user)
    });
});

// ==========================================
// CERRAR SESIÓN
// ==========================================

app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({
                error: "No se pudo cerrar la sesión."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Sesión cerrada correctamente."
        });
    });
});

// ==========================================
// PERFIL DE JUGADOR
// ==========================================

app.get("/api/profile", requireLogin, (req, res) => {
    res.json({
        profile: req.user.profile || {}
    });
});

app.put("/api/profile", requireLogin, (req, res) => {
    try {
        const {
            bio,
            rank,
            region,
            mode,
            platform,
            platforms,
            lookingForTeam
        } = req.body;

        const users = readUsers();
        const index = users.findIndex(u => u.id === req.user.id);

        if (index === -1) {
            return res.status(404).json({
                error: "Usuario no encontrado."
            });
        }

        const oldProfile = users[index].profile || {};

        const allowedRanks = [
            "Bronze", "Silver", "Gold", "Platinum",
            "Diamond", "Champion", "Grand Champion", "SSL"
        ];

        const allowedRegions = [
            "SAM", "EU", "NA", "MENA", "ASIA", "OCE"
        ];

        const allowedModes = ["1v1", "2v2", "3v3"];

        const allowedPlatforms = [
            "PC", "PlayStation", "Xbox", "Nintendo Switch"
        ];

        if (rank && !allowedRanks.includes(rank)) {
            return res.status(400).json({
                error: "Rango no válido."
            });
        }

        if (region && !allowedRegions.includes(region)) {
            return res.status(400).json({
                error: "Región no válida."
            });
        }

        if (mode && !allowedModes.includes(mode)) {
            return res.status(400).json({
                error: "Modo no válido."
            });
        }

        if (platform && !allowedPlatforms.includes(platform)) {
            return res.status(400).json({
                error: "Plataforma no válida."
            });
        }

        const oldPlatforms = oldProfile.platforms || {};

        const cleanPlatforms = {
            epic: String(platforms?.epic ?? oldPlatforms.epic ?? "").trim().slice(0, 50),
            steam: String(platforms?.steam ?? oldPlatforms.steam ?? "").trim().slice(0, 50),
            playstation: String(platforms?.playstation ?? oldPlatforms.playstation ?? "").trim().slice(0, 50),
            xbox: String(platforms?.xbox ?? oldPlatforms.xbox ?? "").trim().slice(0, 50),
            nintendo: String(platforms?.nintendo ?? oldPlatforms.nintendo ?? "").trim().slice(0, 50)
        };

        users[index].profile = {
            bio: String(bio ?? oldProfile.bio ?? "").trim().slice(0, 300),
            rank: rank ?? oldProfile.rank ?? "",
            region: region ?? oldProfile.region ?? "",
            mode: mode ?? oldProfile.mode ?? "",
            platform: platform ?? oldProfile.platform ?? "",
            platforms: cleanPlatforms,
            lookingForTeam: typeof lookingForTeam === "boolean"
                ? lookingForTeam
                : Boolean(oldProfile.lookingForTeam)
        };

        saveUsers(users);

        res.json({
            message: "Perfil actualizado correctamente.",
            profile: users[index].profile
        });

    } catch (error) {
        console.error("Error de perfil:", error.message);
        res.status(500).json({
            error: "No se pudo guardar el perfil."
        });
    }
});

// ==========================================
// BUSCADOR DE JUGADORES
// ==========================================

app.get("/api/players", requireLogin, (req, res) => {
    try {
        const users = readUsers();

        const q = String(req.query.q || "").trim().toLowerCase();
        const rank = String(req.query.rank || "");
        const region = String(req.query.region || "");
        const mode = String(req.query.mode || "");
        const platform = String(req.query.platform || "");
        const lookingForTeam = req.query.lookingForTeam === "true";

        const players = users
            .filter(user => user.id !== req.user.id)
            .map(user => ({
                ...publicUser(user),
                profile: user.profile || {}
            }))
            .filter(user => {
                const p = user.profile;

                const matchesSearch =
                    !q ||
                    user.username.toLowerCase().includes(q) ||
                    (p.bio || "").toLowerCase().includes(q) ||
                    (p.platforms?.epic || "").toLowerCase().includes(q) ||
                    (p.platforms?.steam || "").toLowerCase().includes(q) ||
                    (p.platforms?.playstation || "").toLowerCase().includes(q) ||
                    (p.platforms?.xbox || "").toLowerCase().includes(q) ||
                    (p.platforms?.nintendo || "").toLowerCase().includes(q);

                return matchesSearch &&
                    (!rank || p.rank === rank) &&
                    (!region || p.region === region) &&
                    (!mode || p.mode === mode) &&
                    (!platform || p.platform === platform) &&
                    (!lookingForTeam || p.lookingForTeam === true);
            });

        res.json({
            total: players.length,
            players
        });

    } catch (error) {
        console.error("Error buscando jugadores:", error.message);
        res.status(500).json({
            error: "No se pudieron buscar jugadores."
        });
    }
});

// ==========================================
// KAMY AI - CHAT
// ==========================================

app.post("/api/ai/chat", requireLogin, requireOpenAI, async (req, res) => {
    try {
        const messages = req.body.messages;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "Escribí un mensaje para KAMY AI."
            });
        }

        const safeMessages = messages
            .slice(-20)
            .filter(message =>
                message &&
                ["user", "assistant"].includes(message.role) &&
                typeof message.content === "string"
            )
            .map(message => ({
                role: message.role,
                content: message.content.slice(0, 8000)
            }));

        if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
            return res.status(400).json({
                error: "El último mensaje debe ser tuyo."
            });
        }

        const response = await openai.responses.create({
            model: process.env.OPENAI_MODEL || "gpt-5.6",
            instructions: `
Sos KAMY AI, el asistente inteligente de la plataforma KAMY.

Tu idioma principal es español.
Tu estilo es amigable, claro y directo.
Ayudás con Rocket League, gaming, tecnología, comunidades,
organización de equipos, entrenamiento y temas generales.

No afirmes que podés acceder a datos privados de KAMY
si no fueron incluidos en la conversación.
No inventes estadísticas, resultados ni información.
            `.trim(),
            input: safeMessages,
            safety_identifier: getSafetyIdentifier(req.user.id)
        });

        res.json({
            reply: response.output_text || "No pude generar una respuesta. Probá nuevamente."
        });

    } catch (error) {
        console.error("Error de KAMY AI:", error.message);

        res.status(500).json({
            error: "KAMY AI tuvo un problema al responder. Revisá tu conexión y la configuración de la API."
        });
    }
});

// ==========================================
// KAMY AI - GENERAR IMÁGENES
// ==========================================

app.post("/api/ai/image", requireLogin, requireOpenAI, async (req, res) => {
    try {
        const prompt = String(req.body.prompt || "").trim();

        if (!prompt) {
            return res.status(400).json({
                error: "Escribí qué imagen querés crear."
            });
        }

        if (prompt.length > 3000) {
            return res.status(400).json({
                error: "La descripción no puede superar los 3000 caracteres."
            });
        }

        const result = await openai.images.generate({
            model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare",
            prompt,
            size: "1024x1024",
            quality: "medium",
            n: 1
        });

        const imageData = result.data?.[0]?.b64_json;

        if (!imageData) {
            throw new Error("La API no devolvió una imagen.");
        }

        res.json({
            image: `data:image/png;base64,${imageData}`
        });

    } catch (error) {
        console.error("Error generando imagen:", error.message);

        res.status(500).json({
            error: "No se pudo generar la imagen. Puede que la API requiera verificación o que haya un problema de facturación o disponibilidad."
        });
    }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
    console.log(`KAMY funcionando en http://localhost:${PORT}`);
    console.log(`KAMY AI: ${openai ? "CONFIGURADA" : "SIN API KEY"}`);
});
