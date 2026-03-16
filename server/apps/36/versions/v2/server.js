function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

function getIngredientById(id) {
  return db.prepare("SELECT id, name, category, unit, supplier, created_at, updated_at FROM ingredients WHERE id = ?").get(id);
}

function getPriceRecordById(id) {
  return db.prepare("SELECT id, ingredient_id, recorded_at, unit_price, quantity_basis, created_at FROM price_records WHERE id = ?").get(id);
}

function getMenuItemById(id) {
  return db.prepare("SELECT id, name, selling_price, recipe_text, created_at, updated_at FROM menu_items WHERE id = ?").get(id);
}

function parseId(value) {
  var id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

app.get('/api/dashboard', function(req, res) {
  try {
    var ingredients = db.prepare("SELECT id, name, category, unit, supplier, created_at, updated_at FROM ingredients ORDER BY updated_at DESC, id DESC").all();
    var priceRecords = db.prepare("SELECT id, ingredient_id, recorded_at, unit_price, quantity_basis, created_at FROM price_records ORDER BY recorded_at DESC, id DESC").all();
    var menuItems = db.prepare("SELECT id, name, selling_price, recipe_text, created_at, updated_at FROM menu_items ORDER BY updated_at DESC, id DESC").all();

    var latestPriceRows = db.prepare("\n      SELECT pr.ingredient_id, pr.unit_price, pr.quantity_basis, pr.recorded_at\n      FROM price_records pr\n      INNER JOIN (\n        SELECT ingredient_id, MAX(recorded_at) AS max_recorded_at, MAX(id) AS max_id\n        FROM price_records\n        GROUP BY ingredient_id\n      ) latest\n        ON latest.ingredient_id = pr.ingredient_id\n       AND latest.max_recorded_at = pr.recorded_at\n      ORDER BY pr.ingredient_id ASC, pr.id DESC\n    ").all();

    var latestPriceMap = {};
    latestPriceRows.forEach(function(row) {
      var key = String(row.ingredient_id);
      if (!latestPriceMap[key]) latestPriceMap[key] = row;
    });

    function estimateCostRate(recipeText, sellingPrice) {
      var lines = String(recipeText || '').split('\n');
      var totalCost = 0;
      for (var i = 0; i < lines.length; i += 1) {
        var line = String(lines[i] || '').trim();
        if (!line) continue;
        var parts = line.split(',');
        var ingredientId = String((parts[0] || '').trim());
        var quantity = Number((parts[1] || '0').trim() || 0);
        if (!ingredientId) continue;
        var latest = latestPriceMap[ingredientId];
        if (!latest) continue;
        var basis = Number(latest.quantity_basis || 1) || 1;
        var unitPrice = Number(latest.unit_price || 0);
        totalCost += (unitPrice / basis) * quantity;
      }
      var selling = Number(sellingPrice || 0);
      return selling > 0 ? (totalCost / selling) * 100 : 0;
    }

    var totalCostRate = 0;
    var highRiskMenuCount = 0;
    for (var j = 0; j < menuItems.length; j += 1) {
      var costRate = estimateCostRate(menuItems[j].recipe_text, menuItems[j].selling_price);
      totalCostRate += costRate;
      if (costRate >= 40) highRiskMenuCount += 1;
    }

    var recentPriceChangeCountRow = db.prepare("\n      SELECT COUNT(*) AS count\n      FROM price_records\n      WHERE date(recorded_at) >= date('now', '-30 day')\n    ").get();

    res.json({
      ingredients: ingredients,
      price_records: priceRecords,
      menu_items: menuItems,
      ingredient_count: ingredients.length,
      price_record_count: priceRecords.length,
      menu_item_count: menuItems.length,
      avg_cost_rate: menuItems.length > 0 ? totalCostRate / menuItems.length : 0,
      high_risk_menu_count: highRiskMenuCount,
      recent_price_change_count: Number(recentPriceChangeCountRow ? recentPriceChangeCountRow.count : 0)
    });
  } catch (err) {
    sendError(res, 500, 'ダッシュボードの取得に失敗しました');
  }
});

app.get('/api/ingredients', function(req, res) {
  try {
    var rows = db.prepare("SELECT id, name, category, unit, supplier, created_at, updated_at FROM ingredients ORDER BY updated_at DESC, id DESC").all();
    res.json(rows);
  } catch (err) {
    sendError(res, 500, '原料一覧の取得に失敗しました');
  }
});

app.post('/api/ingredients', function(req, res) {
  try {
    var name = String((req.body && req.body.name) || '').trim();
    var category = String((req.body && req.body.category) || '').trim();
    var unit = String((req.body && req.body.unit) || '').trim();
    var supplier = String((req.body && req.body.supplier) || '').trim();

    if (!name) {
      return sendError(res, 400, '原料名は必須です');
    }

    var info = db.prepare("\n      INSERT INTO ingredients (name, category, unit, supplier)\n      VALUES (?, ?, ?, ?)\n    ").run(name, category, unit, supplier);

    var created = getIngredientById(info.lastInsertRowid);
    res.json(created);
  } catch (err) {
    sendError(res, 500, '原料の作成に失敗しました');
  }
});

app.put('/api/ingredients/:id', function(req, res) {
  try {
    var id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, '不正なIDです');
    }

    var existing = getIngredientById(id);
    if (!existing) {
      return sendError(res, 404, '原料が見つかりません');
    }

    var name = String((req.body && req.body.name) || '').trim();
    var category = String((req.body && req.body.category) || '').trim();
    var unit = String((req.body && req.body.unit) || '').trim();
    var supplier = String((req.body && req.body.supplier) || '').trim();

    if (!name) {
      return sendError(res, 400, '原料名は必須です');
    }

    db.prepare("\n      UPDATE ingredients\n      SET name = ?, category = ?, unit = ?, supplier = ?, updated_at = CURRENT_TIMESTAMP\n      WHERE id = ?\n    ").run(name, category, unit, supplier, id);

    var updated = getIngredientById(id);
    res.json(updated);
  } catch (err) {
    sendError(res, 500, '原料の更新に失敗しました');
  }
});

app.delete('/api/ingredients', function(req, res) {
  try {
    db.prepare("DELETE FROM price_records").run();
    db.prepare("DELETE FROM ingredients").run();
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, '原料の一括削除に失敗しました');
  }
});

app.delete('/api/ingredients/:id', function(req, res) {
  try {
    var id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, '不正なIDです');
    }

    var existing = getIngredientById(id);
    if (!existing) {
      return sendError(res, 404, '原料が見つかりません');
    }

    db.prepare("DELETE FROM price_records WHERE ingredient_id = ?").run(id);
    db.prepare("DELETE FROM ingredients WHERE id = ?").run(id);

    res.json({ success: true, id: id });
  } catch (err) {
    sendError(res, 500, '原料の削除に失敗しました');
  }
});

app.get('/api/price-records', function(req, res) {
  try {
    var rows = db.prepare("SELECT id, ingredient_id, recorded_at, unit_price, quantity_basis, created_at FROM price_records ORDER BY recorded_at DESC, id DESC").all();
    res.json(rows);
  } catch (err) {
    sendError(res, 500, '価格履歴一覧の取得に失敗しました');
  }
});

app.post('/api/price-records', function(req, res) {
  try {
    var ingredientId = Number(req.body && req.body.ingredient_id);
    var recordedAt = String((req.body && req.body.recorded_at) || '').trim();
    var unitPrice = Number(req.body && req.body.unit_price);
    var quantityBasis = Number(req.body && req.body.quantity_basis);

    if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
      return sendError(res, 400, 'ingredient_id は必須です');
    }
    if (!recordedAt) {
      return sendError(res, 400, 'recorded_at は必須です');
    }
    if (!Number.isFinite(unitPrice)) {
      return sendError(res, 400, 'unit_price は数値で入力してください');
    }
    if (!Number.isFinite(quantityBasis) || quantityBasis <= 0) {
      return sendError(res, 400, 'quantity_basis は1以上で入力してください');
    }

    var ingredient = getIngredientById(ingredientId);
    if (!ingredient) {
      return sendError(res, 400, '対象原料が存在しません');
    }

    var info = db.prepare("\n      INSERT INTO price_records (ingredient_id, recorded_at, unit_price, quantity_basis)\n      VALUES (?, ?, ?, ?)\n    ").run(ingredientId, recordedAt, unitPrice, quantityBasis);

    var created = getPriceRecordById(info.lastInsertRowid);
    res.json(created);
  } catch (err) {
    sendError(res, 500, '価格記録の作成に失敗しました');
  }
});

app.delete('/api/price-records', function(req, res) {
  try {
    db.prepare("DELETE FROM price_records").run();
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, '価格履歴の一括削除に失敗しました');
  }
});

app.delete('/api/price-records/:id', function(req, res) {
  try {
    var id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, '不正なIDです');
    }

    var existing = getPriceRecordById(id);
    if (!existing) {
      return sendError(res, 404, '価格記録が見つかりません');
    }

    db.prepare("DELETE FROM price_records WHERE id = ?").run(id);
    res.json({ success: true, id: id });
  } catch (err) {
    sendError(res, 500, '価格記録の削除に失敗しました');
  }
});

app.get('/api/menu-items', function(req, res) {
  try {
    var rows = db.prepare("SELECT id, name, selling_price, recipe_text, created_at, updated_at FROM menu_items ORDER BY updated_at DESC, id DESC").all();
    res.json(rows);
  } catch (err) {
    sendError(res, 500, 'メニュー一覧の取得に失敗しました');
  }
});

app.post('/api/menu-items', function(req, res) {
  try {
    var name = String((req.body && req.body.name) || '').trim();
    var sellingPrice = Number(req.body && req.body.selling_price);
    var recipeText = String((req.body && req.body.recipe_text) || '');

    if (!name) {
      return sendError(res, 400, 'メニュー名は必須です');
    }
    if (!Number.isFinite(sellingPrice)) {
      return sendError(res, 400, 'selling_price は数値で入力してください');
    }

    var info = db.prepare("\n      INSERT INTO menu_items (name, selling_price, recipe_text)\n      VALUES (?, ?, ?)\n    ").run(name, sellingPrice, recipeText);

    var created = getMenuItemById(info.lastInsertRowid);
    res.json(created);
  } catch (err) {
    sendError(res, 500, 'メニューの作成に失敗しました');
  }
});

app.put('/api/menu-items/:id', function(req, res) {
  try {
    var id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, '不正なIDです');
    }

    var existing = getMenuItemById(id);
    if (!existing) {
      return sendError(res, 404, 'メニューが見つかりません');
    }

    var name = String((req.body && req.body.name) || '').trim();
    var sellingPrice = Number(req.body && req.body.selling_price);
    var recipeText = String((req.body && req.body.recipe_text) || '');

    if (!name) {
      return sendError(res, 400, 'メニュー名は必須です');
    }
    if (!Number.isFinite(sellingPrice)) {
      return sendError(res, 400, 'selling_price は数値で入力してください');
    }

    db.prepare("\n      UPDATE menu_items\n      SET name = ?, selling_price = ?, recipe_text = ?, updated_at = CURRENT_TIMESTAMP\n      WHERE id = ?\n    ").run(name, sellingPrice, recipeText, id);

    var updated = getMenuItemById(id);
    res.json(updated);
  } catch (err) {
    sendError(res, 500, 'メニューの更新に失敗しました');
  }
});

app.delete('/api/menu-items', function(req, res) {
  try {
    db.prepare("DELETE FROM menu_items").run();
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, 'メニューの一括削除に失敗しました');
  }
});

app.delete('/api/menu-items/:id', function(req, res) {
  try {
    var id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, '不正なIDです');
    }

    var existing = getMenuItemById(id);
    if (!existing) {
      return sendError(res, 404, 'メニューが見つかりません');
    }

    db.prepare("DELETE FROM menu_items WHERE id = ?").run(id);
    res.json({ success: true, id: id });
  } catch (err) {
    sendError(res, 500, 'メニューの削除に失敗しました');
  }
});