import Customer from "../models/Customer.js";

export const listCustomers = async (req, res) => {
  try {
    const items = await Customer.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (error) {
    console.error("Error listando clientes:", error);
    res.status(500).json({ error: "No se pudieron cargar los clientes" });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { companyName, contactEmail = "" } = req.body || {};

    if (!companyName || !String(companyName).trim()) {
      return res.status(400).json({ error: "El nombre del cliente es obligatorio" });
    }

    const customer = await Customer.create({
      ownerId: req.userId,
      companyName: String(companyName).trim(),
      contactEmail: String(contactEmail).trim(),
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error("Error creando cliente:", error);
    res.status(500).json({ error: "No se pudo crear el cliente" });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { companyName, contactEmail, status } = req.body || {};
    const update = {};
    if (companyName !== undefined) update.companyName = String(companyName).trim();
    if (contactEmail !== undefined) update.contactEmail = String(contactEmail).trim();
    if (status !== undefined) update.status = status;

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      update,
      { new: true },
    );

    if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(customer);
  } catch (error) {
    console.error("Error actualizando cliente:", error);
    res.status(500).json({ error: "No se pudo actualizar el cliente" });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error borrando cliente:", error);
    res.status(500).json({ error: "No se pudo borrar el cliente" });
  }
};

// Middleware para las rutas anidadas /customers/:customerId/... -- valida que
// el cliente exista Y pertenezca al usuario autenticado antes de dejar pasar
// cualquier lectura/escritura de su actividad o metricas.
export const loadOwnedCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.customerId, ownerId: req.userId });
    if (!customer) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    req.customer = customer;
    next();
  } catch (error) {
    res.status(400).json({ error: "Id de cliente invalido" });
  }
};
