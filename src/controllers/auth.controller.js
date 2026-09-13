import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const TOKEN_TTL = "30d";

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function toPublicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

export const register = async (req, res) => {
  try {
    const { name = "", email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
    });

    res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "No se pudo crear la cuenta" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    res.json({ token: signToken(user), user: toPublicUser(user) });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "No se pudo iniciar sesion" });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ error: "No se pudo obtener el usuario" });
  }
};
