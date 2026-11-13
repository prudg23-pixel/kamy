
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

const USERS_FILE = path.join(__dirname, "users.json");

app.use(express.json());
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

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, "[]");
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Estado de KAMY
app.get("/api/status", (req, res) => {
    res.json({
        name: "KAMY",
        status: "online",
        version: "1.0.0"
    });
});

// Registrar usuario
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
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);

        req.session.userId = newUser.id;

        res.status(201).json({
            message: "¡Cuenta creada correctamente!",
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar la cuenta." });
    }
});

// Iniciar sesión
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

        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).json({
                    error: "No se pudo iniciar la sesión."
                });
            }

            req.session.userId = user.id;

            res.json({
                message: "Sesión iniciada correctamente.",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al iniciar sesión." });
    }
});

// Consultar usuario conectado
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
        user: {
            id: user.id,
            username: user.username,
            email: user.email
        }
    });
});

// Cerrar sesión
app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({
                error: "No se pudo cerrar la sesión."
            });
        }

        res.clearCookie("connect.sid");
        res.json({ message: "Sesión cerrada correctamente." });
    });
});

app.listen(PORT, () => {
    console.log(`KAMY funcionando en http://localhost:${PORT}`);
});
