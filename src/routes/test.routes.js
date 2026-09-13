import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    mensaje: "React conectado correctamente con Express 🚀",
  });
});

export default router;
