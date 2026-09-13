import express from "express";
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller.js";

// requireAuth ya se aplica al montar este router en server.js.
const router = express.Router();

router.get("/", listCustomers);
router.post("/", createCustomer);
router.patch("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;
