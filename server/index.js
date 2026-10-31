import express from "express";
import cors from "cors";
import { dbPromise } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/menu", async (req, res) => {
  try {
    const db = await dbPromise;
    const { category } = req.query;
    const items = category
      ? await db.all("SELECT * FROM menu_items WHERE available = 1 AND category = ? ORDER BY name", category)
      : await db.all("SELECT * FROM menu_items WHERE available = 1 ORDER BY category, name");
    res.json(items);
  } catch {
    res.status(500).json({ message: "Could not load menu." });
  }
});

app.post("/api/orders", async (req, res) => {
  const { customerName, phone, address, items } = req.body;
  if (!customerName?.trim() || !phone?.trim() || !address?.trim() || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Name, phone, address and at least one cart item are required." });
  }
  const db = await dbPromise;
  try {
    await db.exec("BEGIN");
    let total = 0;
    const normalized = [];
    for (const entry of items) {
      const quantity = Number(entry.quantity);
      const menuItem = await db.get("SELECT * FROM menu_items WHERE id = ? AND available = 1", Number(entry.menuItemId));
      if (!menuItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        throw new Error("One or more cart items are invalid.");
      }
      total += menuItem.price * quantity;
      normalized.push({ menuItem, quantity });
    }
    const result = await db.run(
      "INSERT INTO orders (customer_name, phone, address, total) VALUES (?, ?, ?, ?)",
      customerName.trim(), phone.trim(), address.trim(), total
    );
    for (const entry of normalized) {
      await db.run(
        "INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
        result.lastID, entry.menuItem.id, entry.menuItem.name, entry.quantity, entry.menuItem.price
      );
    }
    await db.exec("COMMIT");
    res.status(201).json({ message: "Order placed successfully.", orderId: result.lastID, total });
  } catch (error) {
    await db.exec("ROLLBACK");
    res.status(400).json({ message: error.message || "Could not place order." });
  }
});

app.get("/api/orders", async (_req, res) => {
  try {
    const db = await dbPromise;
    const orders = await db.all("SELECT * FROM orders ORDER BY created_at DESC, id DESC");
    for (const order of orders) {
      order.items = await db.all("SELECT item_name, quantity, unit_price FROM order_items WHERE order_id = ?", order.id);
    }
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Could not load orders." });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  const allowed = ["Pending", "Preparing", "Out for delivery", "Delivered", "Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
  const db = await dbPromise;
  const result = await db.run("UPDATE orders SET status = ? WHERE id = ?", req.body.status, Number(req.params.id));
  if (!result.changes) return res.status(404).json({ message: "Order not found." });
  res.json({ message: "Order status updated." });
});

app.post("/api/menu", async (req, res) => {
  const { name, description = "", category, price } = req.body;
  if (!name?.trim() || !category?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ message: "Name, category and a valid non-negative price are required." });
  }
  const db = await dbPromise;
  const result = await db.run(
    "INSERT INTO menu_items (name, description, category, price) VALUES (?, ?, ?, ?)",
    name.trim(), description.trim(), category.trim(), Number(price)
  );
  res.status(201).json({ id: result.lastID, message: "Menu item added." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Restaurant API running at http://localhost:${PORT}`));
