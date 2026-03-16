function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_TABLES = "tables";
  var STORAGE_CUSTOMERS = "customers";
  var STORAGE_RESERVATIONS = "reservations";

  var OPEN_HOUR = 10;
  var CLOSE_HOUR = 22;
  var SLOT_MINUTES = 30;
  var SLOT_WIDTH = 72;
  var ROW_HEIGHT = 74;
  var DEFAULT_DURATION = 60;

  function todayString() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function buildTimeSlots() {
    var list = [];
    var minutes = OPEN_HOUR * 60;
    var end = CLOSE_HOUR * 60;
    while (minutes < end) {
      list.push(minutes);
      minutes += SLOT_MINUTES;
    }
    return list;
  }

  function formatTime(totalMinutes) {
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  function parseTimeToMinutes(time) {
    if (!time || time.indexOf(":") === -1) return OPEN_HOUR * 60;
    var parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function addDays(dateStr, diff) {
    var d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + diff);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function formatDateJP(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var week = ["日", "月", "火", "水", "木", "金", "土"];
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日（" + week[d.getDay()] + "）";
  }

  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  function getCustomerNameByPhone(customers, phone) {
    var match = asArray(customers).find(function(c) { return c.phone === phone; });
    return match ? match.name : "";
  }

  var [current_date, setCurrentDate] = useState(todayString());
  var [active_view, setActiveView] = useState("calendar");
  var [tables, setTables] = useState(function() { return loadJson(STORAGE_TABLES, []); });
  var [customers, setCustomers] = useState(function() { return loadJson(STORAGE_CUSTOMERS, []); });
  var [reservations, setReservations] = useState(function() { return loadJson(STORAGE_RESERVATIONS, []); });

  var [table_form, setTableForm] = useState({ name: "", capacity: "" });
  var [show_reservation_modal, setShowReservationModal] = useState(false);
  var [reservation_form, setReservationForm] = useState({
    id: null,
    table_id: "",
    customer_name: "",
    phone: "",
    party_size: "",
    date: todayString(),
    start_time: "18:00",
    duration_min: DEFAULT_DURATION,
    note: ""
  });
  var [reservation_error, setReservationError] = useState("");
  var [customer_suggestions, setCustomerSuggestions] = useState([]);
  var [selected_customer_id, setSelectedCustomerId] = useState(null);
  var [selected_reservation_id, setSelectedReservationId] = useState(null);

  useEffect(function() { saveJson(STORAGE_TABLES, tables); }, [tables]);
  useEffect(function() { saveJson(STORAGE_CUSTOMERS, customers); }, [customers]);
  useEffect(function() { saveJson(STORAGE_RESERVATIONS, reservations); }, [reservations]);

  var time_slots = useMemo(function() { return buildTimeSlots(); }, []);
  var reservations_for_day = useMemo(function() {
    return asArray(reservations)
      .filter(function(r) { return r.date === current_date; })
      .sort(function(a, b) {
        return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
      });
  }, [reservations, current_date]);

  function resetReservationForm(dateStr, tableId, startTime) {
    setReservationForm({
      id: null,
      table_id: tableId || "",
      customer_name: "",
      phone: "",
      party_size: "",
      date: dateStr || current_date,
      start_time: startTime || "18:00",
      duration_min: DEFAULT_DURATION,
      note: ""
    });
    setReservationError("");
    setCustomerSuggestions([]);
  }

  function handleOpenNewReservation(tableId, slotMinutes) {
    resetReservationForm(current_date, tableId, formatTime(slotMinutes));
    setShowReservationModal(true);
  }

  function handleEditReservation(reservation) {
    setReservationForm({
      id: reservation.id,
      table_id: reservation.table_id,
      customer_name: reservation.customer_name,
      phone: reservation.phone,
      party_size: String(reservation.party_size),
      date: reservation.date,
      start_time: reservation.start_time,
      duration_min: reservation.duration_min,
      note: reservation.note || ""
    });
    setReservationError("");
    setCustomerSuggestions([]);
    setShowReservationModal(true);
  }

  function handleAddTable(e) {
    e.preventDefault();
    if (!table_form.name.trim() || !String(table_form.capacity).trim()) return;
    var newTable = {
      id: Date.now(),
      name: table_form.name.trim(),
      capacity: Number(table_form.capacity)
    };
    setTables(function(prev) {
      return prev.concat([newTable]);
    });
    setTableForm({ name: "", capacity: "" });
  }

  function deleteTable(id) {
    var hasReservation = asArray(reservations).some(function(r) { return r.table_id === id; });
    if (hasReservation) {
      alert("このテーブルには予約履歴があるため削除できません。");
      return;
    }
    setTables(function(prev) {
      return prev.filter(function(t) { return t.id !== id; });
    });
  }

  function upsertCustomerFromReservation(data) {
    var phone = data.phone.trim();
    var name = data.customer_name.trim();
    var note = "";
    setCustomers(function(prev) {
      var found = asArray(prev).find(function(c) { return c.phone === phone; });
      if (found) {
        return prev.map(function(c) {
          if (c.phone !== phone) return c;
          return {
            id: c.id,
            name: name || c.name,
            phone: phone,
            last_note: data.note || c.last_note || "",
            updated_at: Date.now()
          };
        });
      }
      return prev.concat([{
        id: Date.now() + 1,
        name: name,
        phone: phone,
        last_note: data.note || note,
        updated_at: Date.now()
      }]);
    });
  }

  function validateReservation(payload) {
    var table = asArray(tables).find(function(t) { return t.id === Number(payload.table_id); });
    if (!table) return "テーブルを選択してください。";
    if (!payload.customer_name.trim()) return "お客様名を入力してください。";
    if (!payload.phone.trim()) return "電話番号を入力してください。";
    if (!payload.party_size || Number(payload.party_size) <= 0) return "予約人数を入力してください。";
    if (Number(payload.party_size) > Number(table.capacity)) {
      return "予約人数がテーブル定員を超えています。定員 " + table.capacity + " 名までです。";
    }

    var start = parseTimeToMinutes(payload.start_time);
    var end = start + Number(payload.duration_min || DEFAULT_DURATION);
    if (end > CLOSE_HOUR * 60) {
      return "営業時間内に収まる予約時間を選択してください。";
    }

    var conflict = asArray(reservations).some(function(r) {
      if (payload.id && r.id === payload.id) return false;
      if (r.date !== payload.date) return false;
      if (Number(r.table_id) !== Number(payload.table_id)) return false;
      var otherStart = parseTimeToMinutes(r.start_time);
      var otherEnd = otherStart + Number(r.duration_min || DEFAULT_DURATION);
      return overlaps(start, end, otherStart, otherEnd);
    });

    if (conflict) return "同じ時間帯にこのテーブルはすでに予約されています。";
    return "";
  }

  function handlePhoneChange(value) {
    var matches = asArray(customers).filter(function(c) {
      return c.phone.indexOf(value) !== -1;
    }).slice(0, 5);
    setCustomerSuggestions(matches);
    var exact = asArray(customers).find(function(c) { return c.phone === value; });
    setReservationForm(function(prev) {
      return {
        id: prev.id,
        table_id: prev.table_id,
        customer_name: exact ? exact.name : prev.customer_name,
        phone: value,
        party_size: prev.party_size,
        date: prev.date,
        start_time: prev.start_time,
        duration_min: prev.duration_min,
        note: prev.note
      };
    });
  }

  function applyCustomerSuggestion(customer) {
    setReservationForm(function(prev) {
      return {
        id: prev.id,
        table_id: prev.table_id,
        customer_name: customer.name,
        phone: customer.phone,
        party_size: prev.party_size,
        date: prev.date,
        start_time: prev.start_time,
        duration_min: prev.duration_min,
        note: prev.note
      };
    });
    setCustomerSuggestions([]);
  }

  function handleSaveReservation(e) {
    e.preventDefault();
    var payload = {
      id: reservation_form.id,
      table_id: Number(reservation_form.table_id),
      customer_name: reservation_form.customer_name,
      phone: reservation_form.phone,
      party_size: Number(reservation_form.party_size),
      date: reservation_form.date,
      start_time: reservation_form.start_time,
      duration_min: Number(reservation_form.duration_min),
      note: reservation_form.note
    };
    var err = validateReservation(payload);
    if (err) {
      setReservationError(err);
      return;
    }

    upsertCustomerFromReservation(payload);

    if (payload.id) {
      setReservations(function(prev) {
        return prev.map(function(r) {
          return r.id === payload.id ? payload : r;
        });
      });
    } else {
      payload.id = Date.now();
      setReservations(function(prev) {
        return prev.concat([payload]);
      });
    }

    setShowReservationModal(false);
    setReservationError("");
    setCustomerSuggestions([]);
  }

  function deleteReservation(id) {
    setReservations(function(prev) {
      return prev.filter(function(r) { return r.id !== id; });
    });
    if (selected_reservation_id === id) setSelectedReservationId(null);
  }

  function reservationsForCustomer(customer) {
    return asArray(reservations).filter(function(r) { return r.phone === customer.phone; })
      .sort(function(a, b) {
        if (a.date === b.date) return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
        return a.date > b.date ? -1 : 1;
      });
  }

  function getTableName(id) {
    var found = asArray(tables).find(function(t) { return t.id === id; });
    return found ? found.name : "未設定テーブル";
  }

  function renderReservationBlocks(table) {
    var items = reservations_for_day.filter(function(r) { return Number(r.table_id) === Number(table.id); });
    return items.map(function(r) {
      var start = parseTimeToMinutes(r.start_time);
      var offset = ((start - OPEN_HOUR * 60) / SLOT_MINUTES) * SLOT_WIDTH;
      var width = (Number(r.duration_min) / SLOT_MINUTES) * SLOT_WIDTH;
      return (
        <button
          key={r.id}
          onClick={function() { handleEditReservation(r); }}
          className="absolute top-2 h-14 rounded-xl border border-emerald-300 bg-emerald-100 px-2 text-left shadow-sm hover:bg-emerald-200"
          style={{ left: offset + 4, width: Math.max(width - 8, 52) }}
        >
          <div className="truncate text-xs font-semibold text-emerald-900">{r.customer_name}</div>
          <div className="truncate text-[11px] text-emerald-800">{r.start_time}〜 / {r.party_size}名</div>
          <div className="truncate text-[11px] text-emerald-700">{r.phone}</div>
        </button>
      );
    });
  }

  var selected_customer = asArray(customers).find(function(c) { return c.id === selected_customer_id; }) || null;
  var selected_reservation = asArray(reservations).find(function(r) { return r.id === selected_reservation_id; }) || null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-[1600px] p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">📅 レストラン予約システム</div>
            <h1 className="mt-1 text-2xl font-bold">単日カレンダーで見える予約管理</h1>
            <p className="mt-1 text-sm text-slate-500">時間 × テーブルで当日の空き状況と予約をすばやく確認できます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "calendar", label: "📆 カレンダー" },
              { key: "tables", label: "🍽 テーブル管理" },
              { key: "customers", label: "👥 顧客一覧" },
              { key: "reservations", label: "📝 予約一覧" }
            ].map(function(tab) {
              return (
                <button
                  key={tab.key}
                  onClick={function() { setActiveView(tab.key); }}
                  className={"rounded-full px-4 py-2 text-sm font-medium " + (active_view === tab.key ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {active_view === "calendar" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">表示日</div>
                  <div className="mt-1 text-lg font-bold">{formatDateJP(current_date)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={function(){ setCurrentDate(addDays(current_date, -1)); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100">← 前日</button>
                  <input type="date" value={current_date} onChange={function(e){ setCurrentDate(e.target.value); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <button onClick={function(){ setCurrentDate(addDays(current_date, 1)); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100">翌日 →</button>
                  <button onClick={function(){ setCurrentDate(todayString()); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">今日</button>
                </div>
              </div>
            </div>

            {tables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <div className="text-lg font-semibold">まずはテーブルを登録してください</div>
                <p className="mt-2 text-sm text-slate-500">予約を作成する前に、テーブル名と定員を設定します。</p>
                <button onClick={function(){ setActiveView("tables"); }} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">🍽 テーブル管理へ</button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-auto">
                  <div style={{ minWidth: 180 + (time_slots.length * SLOT_WIDTH) }}>
                    <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-slate-100">
                      <div className="sticky left-0 z-30 flex w-44 shrink-0 items-center border-r border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold">テーブル</div>
                      <div className="flex">
                        {time_slots.map(function(minutes) {
                          return (
                            <div key={minutes} className="flex items-center justify-center border-r border-slate-200 py-3 text-xs font-semibold text-slate-500" style={{ width: SLOT_WIDTH }}>
                              {formatTime(minutes)}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {asArray(tables).map(function(table) {
                      return (
                        <div key={table.id} className="flex border-b border-slate-100 last:border-b-0">
                          <div className="sticky left-0 z-10 flex h-[74px] w-44 shrink-0 flex-col justify-center border-r border-slate-200 bg-white px-4">
                            <div className="text-sm font-semibold">{table.name}</div>
                            <div className="text-xs text-slate-500">定員 {table.capacity} 名</div>
                          </div>

                          <div className="relative" style={{ width: time_slots.length * SLOT_WIDTH, height: ROW_HEIGHT }}>
                            <div className="absolute inset-0 flex">
                              {time_slots.map(function(minutes) {
                                return (
                                  <button
                                    key={table.id + "-" + minutes}
                                    onClick={function(){ handleOpenNewReservation(table.id, minutes); }}
                                    className="h-full border-r border-slate-100 hover:bg-amber-50"
                                    style={{ width: SLOT_WIDTH }}
                                    title="この時間に予約を追加"
                                  />
                                );
                              })}
                            </div>
                            {renderReservationBlocks(table)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
                <div className="mb-3 text-sm font-semibold">📌 当日の予約一覧</div>
                {reservations_for_day.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">この日の予約はまだありません。カレンダーの空き枠をクリックして追加できます。</div>
                ) : (
                  <div className="space-y-2">
                    {reservations_for_day.map(function(r) {
                      return (
                        <button
                          key={r.id}
                          onClick={function(){ setSelected_reservation_id(r.id); setActiveView("reservations"); }}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <div>
                            <div className="text-sm font-semibold">{r.start_time}〜 {r.customer_name}</div>
                            <div className="text-xs text-slate-500">{getTableName(r.table_id)} / {r.party_size}名 / {r.phone}</div>
                          </div>
                          <div className="text-xs text-slate-400">詳細 →</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-semibold">📊 本日のサマリー</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">テーブル数</div>
                    <div className="mt-1 text-xl font-bold">{tables.length}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">予約件数</div>
                    <div className="mt-1 text-xl font-bold">{reservations_for_day.length}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">顧客数</div>
                    <div className="mt-1 text-xl font-bold">{customers.length}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">予約人数合計</div>
                    <div className="mt-1 text-xl font-bold">
                      {reservations_for_day.reduce(function(sum, r) { return sum + Number(r.party_size || 0); }, 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {active_view === "tables" && (
          <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <form onSubmit={handleAddTable} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold">🍽 テーブルを追加</div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">テーブル名 / 番号</label>
                  <input value={table_form.name} onChange={function(e){ setTableForm({ name: e.target.value, capacity: table_form.capacity }); }} placeholder="例:テーブルA / 1番" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">定員</label>
                  <input type="number" min="1" value={table_form.capacity} onChange={function(e){ setTableForm({ name: table_form.name, capacity: e.target.value }); }} placeholder="4" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <button className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">テーブルを登録</button>
              </div>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold">テーブル一覧</div>
              {tables.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">まだテーブルが登録されていません。</div>
              ) : (
                <div className="space-y-2">
                  {asArray(tables).map(function(table) {
                    var count = asArray(reservations).filter(function(r) { return r.table_id === table.id; }).length;
                    return (
                      <div key={table.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                        <div>
                          <div className="text-sm font-semibold">{table.name}</div>
                          <div className="text-xs text-slate-500">定員 {table.capacity} 名 / 予約履歴 {count} 件</div>
                        </div>
                        <button onClick={function(){ deleteTable(table.id); }} className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50">削除</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {active_view === "customers" && (
          <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold">👥 顧客一覧</div>
              {customers.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">予約が登録されると顧客情報が自動保存されます。</div>
              ) : (
                <div className="space-y-2">
                  {asArray(customers).sort(function(a, b) { return (b.updated_at || 0) - (a.updated_at || 0); }).map(function(customer) {
                    return (
                      <button key={customer.id} onClick={function(){ setSelectedCustomerId(customer.id); }} className={"w-full rounded-xl border px-3 py-3 text-left " + (selected_customer_id === customer.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50")}>
                        <div className="text-sm font-semibold">{customer.name || "名前未設定"}</div>
                        <div className="text-xs text-slate-500">{customer.phone}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold">顧客詳細</div>
              {!selected_customer ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">左の一覧から顧客を選択してください。</div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-lg font-bold">{selected_customer.name || "名前未設定"}</div>
                    <div className="mt-1 text-sm text-slate-500">📞 {selected_customer.phone}</div>
                    {selected_customer.last_note ? <div className="mt-2 text-sm text-slate-600">メモ:{selected_customer.last_note}</div> : <div className="mt-2 text-sm text-slate-400">メモはありません。</div>}
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold">この顧客の予約履歴</div>
                    <div className="space-y-2">
                      {reservationsForCustomer(selected_customer).length === 0 ? (
                        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">予約履歴はありません。</div>
                      ) : (
                        reservationsForCustomer(selected_customer).map(function(r) {
                          return (
                            <button key={r.id} onClick={function(){ setSelected_reservation_id(r.id); setActiveView("reservations"); }} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50">
                              <div>
                                <div className="text-sm font-semibold">{r.date} {r.start_time}</div>
                                <div className="text-xs text-slate-500">{getTableName(r.table_id)} / {r.party_size}名</div>
                              </div>
                              <div className="text-xs text-slate-400">詳細 →</div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {active_view === "reservations" && (
          <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">📝 予約一覧</div>
                <button onClick={function(){ resetReservationForm(current_date, tables[0] ? tables[0].id : "", "18:00"); setShowReservationModal(true); }} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white">新規予約</button>
              </div>
              {reservations.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">まだ予約がありません。</div>
              ) : (
                <div className="space-y-2">
                  {asArray(reservations).sort(function(a, b) {
                    if (a.date === b.date) return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
                    return a.date > b.date ? -1 : 1;
                  }).map(function(r) {
                    return (
                      <button key={r.id} onClick={function(){ setSelectedReservationId(r.id); }} className={"w-full rounded-xl border px-3 py-3 text-left " + (selected_reservation_id === r.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50")}>
                        <div className="text-sm font-semibold">{r.date} {r.start_time} / {r.customer_name}</div>
                        <div className="text-xs text-slate-500">{getTableName(r.table_id)} / {r.party_size}名 / {r.phone}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold">予約詳細</div>
              {!selected_reservation ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">左の一覧から予約を選択してください。</div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-lg font-bold">{selected_reservation.customer_name}</div>
                    <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <div>📞 {selected_reservation.phone}</div>
                      <div>🍽 {getTableName(selected_reservation.table_id)}</div>
                      <div>👥 {selected_reservation.party_size}名</div>
                      <div>🕒 {selected_reservation.date} {selected_reservation.start_time}〜 {formatTime(parseTimeToMinutes(selected_reservation.start_time) + Number(selected_reservation.duration_min || DEFAULT_DURATION))}</div>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {selected_reservation.note ? selected_reservation.note : "備考はありません。"}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={function(){ handleEditReservation(selected_reservation); }} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">編集</button>
                    <button onClick={function(){ deleteReservation(selected_reservation.id); }} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">削除</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {show_reservation_modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">{reservation_form.id ? "予約を編集" : "新規予約を追加"}</div>
                  <div className="text-xs text-slate-500">電話番号入力で既存顧客を自動補完します。</div>
                </div>
                <button onClick={function(){ setShowReservationModal(false); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">閉じる</button>
              </div>

              <form onSubmit={handleSaveReservation} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">テーブル</label>
                    <select value={reservation_form.table_id} onChange={function(e){ setReservationForm({ id: reservation_form.id, table_id: e.target.value, customer_name: reservation_form.customer_name, phone: reservation_form.phone, party_size: reservation_form.party_size, date: reservation_form.date, start_time: reservation_form.start_time, duration_min: reservation_form.duration_min, note: reservation_form.note }); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">選択してください</option>
                      {asArray(tables).map(function(table) {
                        return <option key={table.id} value={table.id}>{table.name}（定員 {table.capacity} 名）</option>;
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">予約人数</label>
                    <input type="number" min="1" value={reservation_form.party_size} onChange={function(e){ setReservationForm({ id: reservation_form.id, table_id: reservation_form.table_id, customer_name: reservation_form.customer_name, phone: reservation_form.phone, party_size: e.target.value, date: reservation_form.date, start_time: reservation_form.start_time, duration_min: reservation_form.duration_min, note: reservation_form.note }); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">お客様名</label>
                    <input value={reservation_form.customer_name} onChange={function(e){ setReservationForm({ id: reservation_form.id, table_id: reservation_form.table_id, customer_name: e.target.value, phone: reservation_form.phone, party_size: reservation_form.party_size, date: reservation_form.date, start_time: reservation_form.start_time, duration_min: reservation_form.duration_min, note: reservation_form.note }); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>

                  <div className="relative">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">電話番号</label>
                    <input value={reservation_form.phone} onChange={function(e){ handlePhoneChange(e.target.value); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="09012345678" />
                    {customer_suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[68px] z-10 rounded-xl border border-slate-200 bg-white shadow-lg">
                        {customer_suggestions.map(function(customer) {
                          return (
                            <button type="button" key={customer.id} onClick={function(){ applyCustomerSuggestion(customer); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 last:border-b-0">
                              <div className="font-medium">{customer.name || "名前未設定"}</div>
                              <div className="text-xs text-slate-500">{customer.phone}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">日付</label>
                    <input type="date" value={reservation_form.date} onChange={function(e){ setReservationForm({ id: reservation_form.id, table_id: reservation_form.table_id, customer_name: reservation_form.customer_name, phone: reservation_form.phone, party_size: reservation_form.party_size, date: e.target.value, start_time: reservation_form.start_time, duration_min: reservation_form.duration_min, note: reservation_form.note }); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">開始時間</label>
                    <select value={reservation_form.start_time} onChange={function(e){ setReservationForm({ id: reservation_form.id, table_id: reservation_form.table_id, customer_name: reservation_form.customer_name, phone: reservation_form.phone, party_size: reservation_form.party_size, date: reservation_form.date, start_time: e.target.value, duration_min: reservation_form.duration_min, note: reservation_form.note }); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {time_slots.map(function(minutes) {
                        return <option key={minutes} value={formatTime(minutes)}>{formatTime(minutes)}</option>;
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">利用時間</label>
                    <select value={reservation_form.duration_min} onChange={function(e){ setReservationForm({ id: reservation_form.id, table_id: reservation_form.table_id, customer_name: reservation_form.customer_name, phone: reservation_form.phone, party_size: reservation_form.party_size, date: reservation_form.date, start_time: reservation_form.start_time, duration_min: Number(e.target.value), note: reservation_form.note }); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {[30, 60, 90, 120, 150, 180].map(function(v) {
                        return <option key={v} value={v}>{v}分</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">備考</label>
                  <textarea value={reservation_form.note} onChange={function(e){ setReservationForm({ id: reservation_form.id, table_id: reservation_form.table_id, customer_name: reservation_form.customer_name, phone: reservation_form.phone, party_size: reservation_form.party_size, date: reservation_form.date, start_time: reservation_form.start_time, duration_min: reservation_form.duration_min, note: e.target.value }); }} rows="3" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="アレルギー、記念日、希望席など" />
                </div>

                {reservation_error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    ❌ {reservation_error}
                  </div>
                )}

                {reservation_form.phone && getCustomerNameByPhone(customers, reservation_form.phone) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    👤 既存顧客を検出しました:{getCustomerNameByPhone(customers, reservation_form.phone)}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={function(){ setShowReservationModal(false); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">キャンセル</button>
                  <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">保存する</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}