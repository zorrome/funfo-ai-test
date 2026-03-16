app.get('/api/health', function(req, res) {
  try {
    var tablesCount = db.prepare("SELECT COUNT(*) AS count FROM tables").get();
    var reservationsCount = db.prepare("SELECT COUNT(*) AS count FROM reservations").get();
    var customersCount = db.prepare("SELECT COUNT(*) AS count FROM customers").get();

    res.json({
      ok: true,
      status: "ok",
      db_mode: "sqlite",
      counts: {
        tables: Number(tablesCount.count || 0),
        reservations: Number(reservationsCount.count || 0),
        customers: Number(customersCount.count || 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      status: "error",
      error: "health check failed"
    });
  }
});

app.get('/api/tables', function(req, res) {
  try {
    var rows = db.prepare(
      "SELECT id, name, capacity, created_at, updated_at FROM tables ORDER BY name COLLATE NOCASE ASC, id ASC"
    ).all();

    res.json({ tables: rows });
  } catch (error) {
    res.status(500).json({ error: "テーブル一覧の取得に失敗しました。" });
  }
});

app.post('/api/tables', function(req, res) {
  try {
    var name = String((req.body && req.body.name) || "").trim();
    var capacity = Number(req.body && req.body.capacity);

    if (!name) {
      return res.status(400).json({ error: "テーブル名を入力してください。" });
    }
    if (!capacity || capacity <= 0) {
      return res.status(400).json({ error: "定員を正しく入力してください。" });
    }

    var exists = db.prepare("SELECT id FROM tables WHERE name = ?").get(name);
    if (exists) {
      return res.status(400).json({ error: "同じ名前のテーブルがすでに存在します。" });
    }

    var now = new Date().toISOString();
    var result = db.prepare(
      "INSERT INTO tables (name, capacity, created_at, updated_at) VALUES (?, ?, ?, ?)"
    ).run(name, capacity, now, now);

    var table = db.prepare(
      "SELECT id, name, capacity, created_at, updated_at FROM tables WHERE id = ?"
    ).get(result.lastInsertRowid);

    res.json({ table: table });
  } catch (error) {
    res.status(500).json({ error: "テーブルの作成に失敗しました。" });
  }
});

app.delete('/api/tables/:id', function(req, res) {
  try {
    var id = Number(req.params.id);
    var linked = db.prepare("SELECT id FROM reservations WHERE table_id = ? LIMIT 1").get(id);
    if (linked) {
      return res.status(400).json({ error: "このテーブルには予約履歴があります。先に関連予約を削除してください。" });
    }

    var result = db.prepare("DELETE FROM tables WHERE id = ?").run(id);
    if (!result.changes) {
      return res.status(404).json({ error: "対象のテーブルが見つかりません。" });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "テーブルの削除に失敗しました。" });
  }
});

app.get('/api/customers', function(req, res) {
  try {
    var rows = db.prepare(
      "SELECT c.id, c.name, c.phone, c.memo, c.last_visit_date, c.created_at, c.updated_at, " +
      "COUNT(r.id) AS visit_count " +
      "FROM customers c " +
      "LEFT JOIN reservations r ON r.phone = c.phone " +
      "GROUP BY c.id, c.name, c.phone, c.memo, c.last_visit_date, c.created_at, c.updated_at " +
      "ORDER BY c.name COLLATE NOCASE ASC, c.id ASC"
    ).all();

    res.json({ customers: rows });
  } catch (error) {
    res.status(500).json({ error: "顧客一覧の取得に失敗しました。" });
  }
});

app.get('/api/reservations', function(req, res) {
  try {
    var rows = db.prepare(
      "SELECT r.id, r.table_id, t.name AS table_name, r.date, r.start_time, r.start_minutes, r.end_minutes, " +
      "r.duration_minutes, r.customer_name, r.phone, r.party_size, r.note, r.created_at, r.updated_at " +
      "FROM reservations r " +
      "JOIN tables t ON t.id = r.table_id " +
      "ORDER BY r.date ASC, r.start_minutes ASC, t.name COLLATE NOCASE ASC"
    ).all();

    res.json({ reservations: rows });
  } catch (error) {
    res.status(500).json({ error: "予約一覧の取得に失敗しました。" });
  }
});

app.post('/api/reservations', function(req, res) {
  try {
    var tableId = Number(req.body && req.body.table_id);
    var date = String((req.body && req.body.date) || "").trim();
    var startTime = String((req.body && req.body.start_time) || "").trim();
    var durationMinutes = Number(req.body && req.body.duration_minutes) || 90;
    var customerName = String((req.body && req.body.customer_name) || "").trim();
    var phone = String((req.body && req.body.phone) || "").trim();
    var partySize = Number(req.body && req.body.party_size);
    var note = String((req.body && req.body.note) || "").trim();

    if (!tableId) return res.status(400).json({ error: "テーブルを選択してください。" });
    if (!date) return res.status(400).json({ error: "予約日を入力してください。" });
    if (!startTime) return res.status(400).json({ error: "予約時間を入力してください。" });
    if (!customerName) return res.status(400).json({ error: "顧客名を入力してください。" });
    if (!phone) return res.status(400).json({ error: "電話番号を入力してください。" });
    if (!partySize || partySize <= 0) return res.status(400).json({ error: "予約人数を入力してください。" });

    var table = db.prepare("SELECT id, name, capacity FROM tables WHERE id = ?").get(tableId);
    if (!table) return res.status(404).json({ error: "対象のテーブルが見つかりません。" });
    if (partySize > Number(table.capacity || 0)) {
      return res.status(400).json({ error: "予約人数がテーブル定員を超えています。" });
    }

    var parts = startTime.split(":");
    var startMinutes = Number(parts[0] || 0) * 60 + Number(parts[1] || 0);
    var endMinutes = startMinutes + durationMinutes;

    var overlap = db.prepare(
      "SELECT id FROM reservations " +
      "WHERE table_id = ? AND date = ? AND ? < end_minutes AND ? > start_minutes " +
      "LIMIT 1"
    ).get(tableId, date, startMinutes, endMinutes);

    if (overlap) {
      return res.status(400).json({ error: "同じ時間帯にこのテーブルはすでに予約されています。" });
    }

    var now = new Date().toISOString();

    var result = db.prepare(
      "INSERT INTO reservations (table_id, date, start_time, start_minutes, end_minutes, duration_minutes, customer_name, phone, party_size, note, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(tableId, date, startTime, startMinutes, endMinutes, durationMinutes, customerName, phone, partySize, note, now, now);

    var existingCustomer = db.prepare("SELECT id FROM customers WHERE phone = ?").get(phone);
    if (existingCustomer) {
      db.prepare(
        "UPDATE customers SET name = ?, last_visit_date = ?, updated_at = ? WHERE id = ?"
      ).run(customerName, date, now, existingCustomer.id);
    } else {
      db.prepare(
        "INSERT INTO customers (name, phone, memo, last_visit_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(customerName, phone, "", date, now, now);
    }

    var reservation = db.prepare(
      "SELECT r.id, r.table_id, t.name AS table_name, r.date, r.start_time, r.start_minutes, r.end_minutes, " +
      "r.duration_minutes, r.customer_name, r.phone, r.party_size, r.note, r.created_at, r.updated_at " +
      "FROM reservations r JOIN tables t ON t.id = r.table_id WHERE r.id = ?"
    ).get(result.lastInsertRowid);

    res.json({ reservation: reservation });
  } catch (error) {
    res.status(500).json({ error: "予約の作成に失敗しました。" });
  }
});

app.put('/api/reservations/:id', function(req, res) {
  try {
    var reservationId = Number(req.params.id);
    var tableId = Number(req.body && req.body.table_id);
    var date = String((req.body && req.body.date) || "").trim();
    var startTime = String((req.body && req.body.start_time) || "").trim();
    var durationMinutes = Number(req.body && req.body.duration_minutes) || 90;
    var customerName = String((req.body && req.body.customer_name) || "").trim();
    var phone = String((req.body && req.body.phone) || "").trim();
    var partySize = Number(req.body && req.body.party_size);
    var note = String((req.body && req.body.note) || "").trim();

    var current = db.prepare("SELECT id FROM reservations WHERE id = ?").get(reservationId);
    if (!current) return res.status(404).json({ error: "対象の予約が見つかりません。" });

    if (!tableId) return res.status(400).json({ error: "テーブルを選択してください。" });
    if (!date) return res.status(400).json({ error: "予約日を入力してください。" });
    if (!startTime) return res.status(400).json({ error: "予約時間を入力してください。" });
    if (!customerName) return res.status(400).json({ error: "顧客名を入力してください。" });
    if (!phone) return res.status(400).json({ error: "電話番号を入力してください。" });
    if (!partySize || partySize <= 0) return res.status(400).json({ error: "予約人数を入力してください。" });

    var table = db.prepare("SELECT id, name, capacity FROM tables WHERE id = ?").get(tableId);
    if (!table) return res.status(404).json({ error: "対象のテーブルが見つかりません。" });
    if (partySize > Number(table.capacity || 0)) {
      return res.status(400).json({ error: "予約人数がテーブル定員を超えています。" });
    }

    var parts = startTime.split(":");
    var startMinutes = Number(parts[0] || 0) * 60 + Number(parts[1] || 0);
    var endMinutes = startMinutes + durationMinutes;

    var overlap = db.prepare(
      "SELECT id FROM reservations " +
      "WHERE table_id = ? AND date = ? AND id <> ? AND ? < end_minutes AND ? > start_minutes " +
      "LIMIT 1"
    ).get(tableId, date, reservationId, startMinutes, endMinutes);

    if (overlap) {
      return res.status(400).json({ error: "同じ時間帯にこのテーブルはすでに予約されています。" });
    }

    var now = new Date().toISOString();

    db.prepare(
      "UPDATE reservations SET table_id = ?, date = ?, start_time = ?, start_minutes = ?, end_minutes = ?, duration_minutes = ?, customer_name = ?, phone = ?, party_size = ?, note = ?, updated_at = ? " +
      "WHERE id = ?"
    ).run(tableId, date, startTime, startMinutes, endMinutes, durationMinutes, customerName, phone, partySize, note, now, reservationId);

    var existingCustomer = db.prepare("SELECT id FROM customers WHERE phone = ?").get(phone);
    if (existingCustomer) {
      db.prepare(
        "UPDATE customers SET name = ?, last_visit_date = ?, updated_at = ? WHERE id = ?"
      ).run(customerName, date, now, existingCustomer.id);
    } else {
      db.prepare(
        "INSERT INTO customers (name, phone, memo, last_visit_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(customerName, phone, "", date, now, now);
    }

    var reservation = db.prepare(
      "SELECT r.id, r.table_id, t.name AS table_name, r.date, r.start_time, r.start_minutes, r.end_minutes, " +
      "r.duration_minutes, r.customer_name, r.phone, r.party_size, r.note, r.created_at, r.updated_at " +
      "FROM reservations r JOIN tables t ON t.id = r.table_id WHERE r.id = ?"
    ).get(reservationId);

    res.json({ reservation: reservation });
  } catch (error) {
    res.status(500).json({ error: "予約の更新に失敗しました。" });
  }
});

app.delete('/api/reservations/:id', function(req, res) {
  try {
    var id = Number(req.params.id);
    var result = db.prepare("DELETE FROM reservations WHERE id = ?").run(id);

    if (!result.changes) {
      return res.status(404).json({ error: "対象の予約が見つかりません。" });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "予約の削除に失敗しました。" });
  }
});