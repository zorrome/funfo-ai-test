CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  supplier TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT '',
  unit_price REAL NOT NULL DEFAULT 0,
  quantity_basis REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  selling_price REAL NOT NULL DEFAULT 0,
  recipe_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_records_ingredient_id ON price_records (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_price_records_recorded_at ON price_records (recorded_at);
CREATE INDEX IF NOT EXISTS idx_ingredients_updated_at ON ingredients (updated_at);
CREATE INDEX IF NOT EXISTS idx_menu_items_updated_at ON menu_items (updated_at);