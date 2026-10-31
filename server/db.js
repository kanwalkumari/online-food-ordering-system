import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "data");
fs.mkdirSync(dataDir, { recursive: true });

export const dbPromise = open({
  filename: path.join(dataDir, "restaurant.db"),
  driver: sqlite3.Database
}).then(async (db) => {
  await db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      available INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );
  `);
  const count = await db.get("SELECT COUNT(*) AS count FROM menu_items");
  if (count.count === 0) {
    const samples = [
      ["Chicken Burger","Grilled chicken, lettuce and house sauce","Burgers",650],
      ["Beef Burger","Beef patty with cheese","Burgers",800],
      ["Chicken Biryani","Spiced rice served with raita","Rice",350],
      ["Zinger Roll","Crispy chicken with garlic sauce","Rolls",300],
      ["French Fries","Golden crispy potato fries","Sides",220],
      ["Club Sandwich","Triple-layer chicken sandwich","Sandwiches",550]
    ];
    for (const item of samples) {
      await db.run(
        "INSERT INTO menu_items (name, description, category, price) VALUES (?, ?, ?, ?)",
        item
      );
    }
  }
  return db;
});
