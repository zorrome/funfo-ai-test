function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var OPEN_HOUR = 10;
  var CLOSE_HOUR = 22;
  var SLOT_MINUTES = 30;

  var [selected_date, setSelectedDate] = useState(formatDateInput(new Date()));
  var [tables, setTables] = useState(loadJson("tables", []));
  var [customers, setCustomers] = useState(loadJson("customers", []));
  var [reservations, setReservations] = useState(loadJson("reservations", []));
  var [view, setView] = useState("calendar");

  var [table_form, setTableForm] = useState({ name: "", capacity: "4" });
  var [reservation_modal, setReservationModal] = useState({
    open: false,
    mode: "create",
    reservation_id: null,
    table_id: "",
    date: selected_date,
    start_time: "18:00",
    duration_minutes: 90,
    customer_name: "",
    phone: "",
    party_size: "2",
    note: ""
  });

  useEffect(function() {
    saveJson("tables", tables);
  }, [tables]);

  useEffect(function() {
    saveJson("customers", customers);
  }, [customers]);

  useEffect(function() {
    saveJson("reservations", reservations);
  }, [reservations]);

  useEffect(function() {
    setReservationModal(function(prev) {
      return Object.assign({}, prev, { date: selected_date });
    });
  }, [selected_date]);

  var time_slots = useMemo(function() {
    return buildTimeSlots(OPEN_HOUR, CLOSE_HOUR, SLOT_MINUTES);
  }, []);

  var tables_sorted = useMemo(function() {
    return asArray(tables).slice().sort(function(a, b) {
      return String(a.name).localeCompare(String(b.name), "ja");
    });
  }, [tables]);

  var daily_reservations = useMemo(function() {
    return asArray(reservations)
      .filter(function(item) { return item.date === selected_date; })
      .slice()
      .sort(function(a, b) {
        if (a.start_minutes !== b.start_minutes) return a.start_minutes - b.start_minutes;
        return String(a.table_name).localeCompare(String(b.table_name), "ja");
      });
  }, [reservations, selected_date]);

  var customer_map = useMemo(function() {
    var map = {};
    asArray(customers).forEach(function(customer) {
      map[customer.phone] = customer;
    });
    return map;
  }, [customers]);

  var reservation_count_today = daily_reservations.length;
  var customer_count = customers.length;
  var table_count = tables.length;

  function formatDateInput(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function parseDateLabel(date_str) {
    var date = new Date(date_str + "T12:00:00");
    return date.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short"
    });
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

  function buildTimeSlots(start_hour, end_hour, interval_minutes) {
    var result = [];
    for (var minutes = start_hour * 60; minutes < end_hour * 60; minutes += interval_minutes) {
      result.push({
        label: minutesToTime(minutes),
        minutes: minutes
      });
    }
    return result;
  }

  function minutesToTime(total_minutes) {
    var h = Math.floor(total_minutes / 60);
    var m = total_minutes % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  function timeToMinutes(text) {
    var parts = String(text || "").split(":");
    if (parts.length !== 2) return 0;
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function addDays(date_str, diff) {
    var date = new Date(date_str + "T12:00:00");
    date.setDate(date.getDate() + diff);
    return formatDateInput(date);
  }

  function makeId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  }

  function getTableById(table_id) {
    return asArray(tables).find(function(item) { return item.id === table_id; });
  }

  function getCustomerByPhone(phone) {
    return customer_map[phone] || null;
  }

  function upsertCustomerFromReservation(form) {
    var cleaned_phone = String(form.phone || "").trim();
    if (!cleaned_phone) return;
    var existing = getCustomerByPhone(cleaned_phone);
    var now_iso = new Date().toISOString();
    if (existing) {
      setCustomers(function(prev) {
        return asArray(prev).map(function(item) {
          if (item.phone !== cleaned_phone) return item;
          return Object.assign({}, item, {
            name: String(form.customer_name || "").trim() || item.name,
            last_visit_date: form.date || item.last_visit_date,
            updated_at: now_iso
          });
        });
      });
    } else {
      setCustomers(function(prev) {
        return asArray(prev).concat([{
          id: makeId("customer"),
          name: String(form.customer_name || "").trim(),
          phone: cleaned_phone,
          memo: "",
          last_visit_date: form.date,
          created_at: now_iso,
          updated_at: now_iso
        }]);
      });
    }
  }

  function hasConflict(form, ignore_reservation_id) {
    var target_table = getTableById(form.table_id);
    if (!target_table) {
      return "対象のテーブルが見つかりません。";
    }

    var start_minutes = timeToMinutes(form.start_time);
    var end_minutes = start_minutes + Number(form.duration_minutes || 90);

    if (Number(form.party_size || 0) > Number(target_table.capacity || 0)) {
      return "予約人数がテーブル定員を超えています。別のテーブルを選んでください。";
    }

    var overlap = asArray(reservations).find(function(item) {
      if (item.id === ignore_reservation_id) return false;
      if (item.date !== form.date) return false;
      if (item.table_id !== form.table_id) return false;
      var item_start = Number(item.start_minutes || 0);
      var item_end = Number(item.end_minutes || 0);
      return start_minutes < item_end && end_minutes > item_start;
    });

    if (overlap) {
      return "同じ時間帯にこのテーブルはすでに予約されています。";
    }

    return "";
  }

  function openReservationCreate(table_id, start_minutes) {
    var default_time = minutesToTime(start_minutes);
    setReservationModal({
      open: true,
      mode: "create",
      reservation_id: null,
      table_id: table_id,
      date: selected_date,
      start_time: default_time,
      duration_minutes: 90,
      customer_name: "",
      phone: "",
      party_size: "2",
      note: ""
    });
  }

  function openReservationEdit(reservation) {
    setReservationModal({
      open: true,
      mode: "edit",
      reservation_id: reservation.id,
      table_id: reservation.table_id,
      date: reservation.date,
      start_time: reservation.start_time,
      duration_minutes: reservation.duration_minutes,
      customer_name: reservation.customer_name,
      phone: reservation.phone,
      party_size: String(reservation.party_size),
      note: reservation.note || ""
    });
  }

  function closeReservationModal() {
    setReservationModal(function(prev) {
      return Object.assign({}, prev, { open: false });
    });
  }

  function handlePhoneAutoFill(phone) {
    var customer = getCustomerByPhone(phone.trim());
    if (!customer) return;
    setReservationModal(function(prev) {
      return Object.assign({}, prev, {
        customer_name: customer.name || prev.customer_name
      });
    });
  }

  function handleSaveReservation() {
    var form = reservation_modal;
    var selected_table = getTableById(form.table_id);
    if (!selected_table) {
      alert("テーブルを選択してください。");
      return;
    }
    if (!String(form.customer_name || "").trim()) {
      alert("顧客名を入力してください。");
      return;
    }
    if (!String(form.phone || "").trim()) {
      alert("電話番号を入力してください。");
      return;
    }
    if (!String(form.start_time || "").trim()) {
      alert("予約時間を入力してください。");
      return;
    }
    if (Number(form.party_size || 0) <= 0) {
      alert("予約人数を入力してください。");
      return;
    }

    var conflict_message = hasConflict(form, form.mode === "edit" ? form.reservation_id : "");
    if (conflict_message) {
      alert(conflict_message);
      return;
    }

    var start_minutes = timeToMinutes(form.start_time);
    var end_minutes = start_minutes + Number(form.duration_minutes || 90);
    var now_iso = new Date().toISOString();

    var payload = {
      id: form.mode === "edit" ? form.reservation_id : makeId("reservation"),
      table_id: selected_table.id,
      table_name: selected_table.name,
      date: form.date,
      start_time: form.start_time,
      start_minutes: start_minutes,
      end_minutes: end_minutes,
      duration_minutes: Number(form.duration_minutes || 90),
      customer_name: String(form.customer_name || "").trim(),
      phone: String(form.phone || "").trim(),
      party_size: Number(form.party_size || 0),
      note: String(form.note || "").trim(),
      updated_at: now_iso,
      created_at: form.mode === "edit" ? now_iso : now_iso
    };

    if (form.mode === "edit") {
      setReservations(function(prev) {
        return asArray(prev).map(function(item) {
          return item.id === payload.id ? Object.assign({}, item, payload) : item;
        });
      });
    } else {
      setReservations(function(prev) {
        return asArray(prev).concat([payload]);
      });
    }

    upsertCustomerFromReservation(form);
    closeReservationModal();
  }

  function handleDeleteReservation(reservation_id) {
    var ok = confirm("この予約を削除しますか？");
    if (!ok) return;
    setReservations(function(prev) {
      return asArray(prev).filter(function(item) { return item.id !== reservation_id; });
    });
  }

  function handleAddTable() {
    if (!String(table_form.name || "").trim()) {
      alert("テーブル名または番号を入力してください。");
      return;
    }
    if (Number(table_form.capacity || 0) <= 0) {
      alert("定員を入力してください。");
      return;
    }

    var exists = asArray(tables).some(function(item) {
      return String(item.name).trim() === String(table_form.name).trim();
    });

    if (exists) {
      alert("同じ名前のテーブルがすでに存在します。");
      return;
    }

    setTables(function(prev) {
      return asArray(prev).concat([{
        id: makeId("table"),
        name: String(table_form.name || "").trim(),
        capacity: Number(table_form.capacity || 0),
        created_at: new Date().toISOString()
      }]);
    });

    setTableForm({ name: "", capacity: "4" });
  }

  function handleDeleteTable(table_id) {
    var linked = asArray(reservations).some(function(item) { return item.table_id === table_id; });
    if (linked) {
      alert("このテーブルには予約履歴があります。先に関連予約を整理してください。");
      return;
    }
    var ok = confirm("このテーブルを削除しますか？");
    if (!ok) return;
    setTables(function(prev) {
      return asArray(prev).filter(function(item) { return item.id !== table_id; });
    });
  }

  function renderReservationBar(table_id, slot_minutes) {
    var reservation = daily_reservations.find(function(item) {
      return item.table_id === table_id && slot_minutes >= item.start_minutes && slot_minutes < item.end_minutes;
    });

    if (!reservation) return null;
    if (slot_minutes !== reservation.start_minutes) return null;

    var span = Math.max(1, Math.round(reservation.duration_minutes / SLOT_MINUTES));

    return (
      <div
        className="absolute inset-y-1 left-1 right-1 z-20 rounded-xl border border-emerald-300 bg-emerald-100 p-2 shadow-sm cursor-pointer hover:bg-emerald-200"
        style={{ width: "calc(" + span + "00% - 8px)" }}
        onClick={function(e) {
          e.stopPropagation();
          openReservationEdit(reservation);
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-emerald-900">{reservation.customer_name}</div>
            <div className="text-[11px] text-emerald-800">{reservation.start_time}〜 {minutesToTime(reservation.end_minutes)}</div>
          </div>
          <div className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            👥 {reservation.party_size}
          </div>
        </div>
        <div className="mt-1 text-[11px] text-emerald-800">{reservation.phone}</div>
        {reservation.note ? (
          <div className="mt-1 line-clamp-1 text-[10px] text-emerald-700">📝 {reservation.note}</div>
        ) : null}
      </div>
    );
  }

  function renderCalendarView() {
    if (tables_sorted.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="text-4xl mb-3">🪑</div>
          <div className="text-lg font-semibold text-slate-800">まずはテーブルを作成してください</div>
          <div className="mt-2 text-sm text-slate-500">
            予約カレンダーを使う前に、テーブル名と定員を登録します。
          </div>
          <button
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={function() { setView("tables"); }}
          >
            テーブル管理へ
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50">
          <div
            className="grid"
            style={{ gridTemplateColumns: "140px repeat(" + time_slots.length + ", minmax(72px, 1fr))" }}
          >
            <div className="sticky left-0 z-30 border-r border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
              テーブル
            </div>
            {asArray(time_slots).map(function(slot) {
              return (
                <div key={slot.minutes} className="border-r border-slate-200 px-2 py-3 text-center text-xs font-semibold text-slate-500">
                  {slot.label}
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-auto">
          {asArray(tables_sorted).map(function(table) {
            return (
              <div
                key={table.id}
                className="grid min-h-[88px] border-b border-slate-200"
                style={{ gridTemplateColumns: "140px repeat(" + time_slots.length + ", minmax(72px, 1fr))" }}
              >
                <div className="sticky left-0 z-20 flex flex-col justify-center border-r border-slate-200 bg-white px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{table.name}</div>
                  <div className="text-xs text-slate-500">定員 {table.capacity} 名</div>
                </div>

                {asArray(time_slots).map(function(slot) {
                  return (
                    <div
                      key={table.id + "_" + slot.minutes}
                      className="relative border-r border-slate-100 bg-white hover:bg-amber-50 cursor-pointer"
                      onClick={function() { openReservationCreate(table.id, slot.minutes); }}
                      title={"クリックで " + table.name + " の " + slot.label + " に予約追加"}
                    >
                      <div className="absolute inset-0">
                        {renderReservationBar(table.id, slot.minutes)}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderReservationModal() {
    if (!reservation_modal.open) return null;

    var selected_table = getTableById(reservation_modal.table_id);
    var capacity_warning = "";
    if (selected_table && Number(reservation_modal.party_size || 0) > Number(selected_table.capacity || 0)) {
      capacity_warning = "⚠️ この人数はテーブル定員を超えています。";
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                {reservation_modal.mode === "edit" ? "予約を編集" : "予約を追加"}
              </div>
              <div className="text-xs text-slate-500">📅 {parseDateLabel(reservation_modal.date)} の予約</div>
            </div>
            <button className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600" onClick={closeReservationModal}>
              閉じる
            </button>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">テーブル</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={reservation_modal.table_id}
                onChange={function(e) {
                  setReservationModal(function(prev) {
                    return Object.assign({}, prev, { table_id: e.target.value });
                  });
                }}
              >
                <option value="">テーブルを選択</option>
                {asArray(tables_sorted).map(function(table) {
                  return (
                    <option key={table.id} value={table.id}>
                      {table.name}（定員 {table.capacity} 名）
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">予約日</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                type="date"
                value={reservation_modal.date}
                onChange={function(e) {
                  setReservationModal(function(prev) {
                    return Object.assign({}, prev, { date: e.target.value });
                  });
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">予約時間</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                type="time"
                step="1800"
                value={reservation_modal.start_time}
                onChange={function(e) {
                  setReservationModal(function(prev) {
                    return Object.assign({}, prev, { start_time: e.target.value });
                  });
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">利用時間</label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={reservation_modal.duration_minutes}
                onChange={function(e) {
                  setReservationModal(function(prev) {
                    return Object.assign({}, prev, { duration_minutes: Number(e.target.value) });
                  });
                }}
              >
                <option value="60">60分</option>
                <option value="90">90分</option>
                <option value="120">120分</option>
                <option value="150">150分</option>
                <option value="180">180分</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">顧客名</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={reservation_modal.customer_name}
                onChange={function(e) {
                  setReservationModal(function(prev) {
                    return Object.assign({}, prev, { customer_name: e.target.value });
                  });
                }}
                placeholder="例:山田 花子"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">電話番号</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={reservation_modal.phone}
                onChange={function(e) {
                  var next_phone = e.target.value;
                  setReservationModal(function(prev) {
                    return Object.assign({}, prev, { phone: next_phone });
                  });
                  handlePhoneAutoFill(next_phone);
                }}
                placeholder="例:090-1234-5678"
              />
              {getCustomerByPhone(reservation_modal.phone.trim()) ? (
                <div className="mt-1 text-xs text-emerald-600">
                  ✅ 既存顧客を検出しました。名前を自動補完しています。
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">
                  電話番号が一致すると既存顧客情報を再利用します。
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">予約人数</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                type="number"
                min="1"
                value={reservation_modal.party_size}
                onChange={function(e) {
                  setReservationModal(function(prev) {
                    return Object.assign({}, prev, { party_size: e.target.value });
                  });
                }}
              />
              {capacity_warning ? (
                <div className="mt-1 text-xs font-medium text-rose-600">{capacity_warning}</div>
              ) : selected_table ? (
                <div className="mt-1 text-xs text-slate-400">このテーブルの定員は {selected_table.capacity} 名です。</div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">備考</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={reservation_modal.note}
                onChange={function(e) {
                  setReservationModal(function(prev) {
                    return Object.assign({}, prev, { note: e.target.value });
                  });
                }}
                placeholder="例:窓側希望、誕生日利用"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <div className="text-xs text-slate-500">
              同時間帯の重複予約と定員超過は自動で防止されます。
            </div>
            <div className="flex gap-2">
              {reservation_modal.mode === "edit" ? (
                <button
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700"
                  onClick={function() {
                    handleDeleteReservation(reservation_modal.reservation_id);
                    closeReservationModal();
                  }}
                >
                  削除
                </button>
              ) : null}
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                onClick={handleSaveReservation}
              >
                {reservation_modal.mode === "edit" ? "更新する" : "予約を保存"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderTablesView() {
    return (
      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">🪑 テーブル追加</div>
          <div className="mt-1 text-xs text-slate-500">営業開始前にテーブル構成を登録しておくと、カレンダー運用が楽になります。</div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">テーブル名 / 番号</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={table_form.name}
                onChange={function(e) {
                  setTableForm(function(prev) {
                    return Object.assign({}, prev, { name: e.target.value });
                  });
                }}
                placeholder="例:テーブルA / 1番席"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">定員</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                type="number"
                min="1"
                value={table_form.capacity}
                onChange={function(e) {
                  setTableForm(function(prev) {
                    return Object.assign({}, prev, { capacity: e.target.value });
                  });
                }}
              />
            </div>
            <button
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={handleAddTable}
            >
              テーブルを追加
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">テーブル一覧</div>
              <div className="text-xs text-slate-500">登録済みの席構成を確認・整理できます。</div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              合計 {tables_sorted.length} 卓
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {tables_sorted.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                まだテーブルが登録されていません。
              </div>
            ) : (
              asArray(tables_sorted).map(function(table) {
                return (
                  <div key={table.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{table.name}</div>
                      <div className="text-xs text-slate-500">定員 {table.capacity} 名</div>
                    </div>
                    <button
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      onClick={function() { handleDeleteTable(table.id); }}
                    >
                      削除
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderCustomersView() {
    var customers_sorted = asArray(customers).slice().sort(function(a, b) {
      return String(a.name).localeCompare(String(b.name), "ja");
    });

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">👥 顧客一覧</div>
            <div className="text-xs text-slate-500">電話番号ベースで再来店顧客をすぐ確認できます。</div>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {customers_sorted.length} 名
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {customers_sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 md:col-span-2 xl:col-span-3">
              まだ顧客データはありません。予約を登録すると自動で蓄積されます。
            </div>
          ) : (
            asArray(customers_sorted).map(function(customer) {
              var history = asArray(reservations).filter(function(r) { return r.phone === customer.phone; });
              return (
                <div key={customer.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{customer.name || "名称未設定"}</div>
                      <div className="text-xs text-slate-500">{customer.phone}</div>
                    </div>
                    <div className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                      来店 {history.length} 回
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div>最終予約日: {customer.last_visit_date || "未登録"}</div>
                    <div>顧客ID: {customer.id}</div>
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    この電話番号を予約入力すると、既存顧客として自動補完されます。
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderReservationsListView() {
    var reservations_sorted = asArray(reservations).slice().sort(function(a, b) {
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
      return a.start_minutes - b.start_minutes;
    });

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">📋 予約一覧</div>
            <div className="text-xs text-slate-500">全予約を日付順で確認し、詳細編集もできます。</div>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {reservations_sorted.length} 件
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {reservations_sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
              まだ予約がありません。
            </div>
          ) : (
            asArray(reservations_sorted).map(function(item) {
              return (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.date} / {item.start_time} / {item.table_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {item.customer_name} ・ {item.phone} ・ {item.party_size}名
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      利用時間 {item.duration_minutes}分 {item.note ? "・ 備考: " + item.note : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                      onClick={function() { openReservationEdit(item); }}
                    >
                      詳細 / 編集
                    </button>
                    <button
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700"
                      onClick={function() { handleDeleteReservation(item.id); }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 md:p-6">
        <div className="mb-6 rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Restaurant Booking</div>
              <h1 className="mt-2 text-2xl font-bold">🍽️ 単日予約カレンダー</h1>
              <div className="mt-2 text-sm text-slate-200">
                日付ごとに、テーブル × 時間で予約状況をひと目で管理できます。
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-[11px] text-slate-300">本日の予約</div>
                <div className="mt-1 text-xl font-semibold">{reservation_count_today}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-[11px] text-slate-300">登録顧客</div>
                <div className="mt-1 text-xl font-semibold">{customer_count}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-[11px] text-slate-300">テーブル数</div>
                <div className="mt-1 text-xl font-semibold">{table_count}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "calendar", label: "📅 カレンダー" },
              { key: "tables", label: "🪑 テーブル管理" },
              { key: "customers", label: "👥 顧客一覧" },
              { key: "reservations", label: "📋 予約一覧" }
            ].map(function(tab) {
              return (
                <button
                  key={tab.key}
                  className={
                    "rounded-2xl px-4 py-2 text-sm font-medium " +
                    (view === tab.key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                  }
                  onClick={function() { setView(tab.key); }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              onClick={function() { setSelectedDate(addDays(selected_date, -1)); }}
            >
              ← 前日
            </button>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              type="date"
              value={selected_date}
              onChange={function(e) { setSelectedDate(e.target.value); }}
            />
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              onClick={function() { setSelectedDate(formatDateInput(new Date())); }}
            >
              今日
            </button>
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              onClick={function() { setSelectedDate(addDays(selected_date, 1)); }}
            >
              翌日 →
            </button>
            <div className="ml-1 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              {parseDateLabel(selected_date)}
            </div>
          </div>
        </div>

        {view === "calendar" ? renderCalendarView() : null}
        {view === "tables" ? renderTablesView() : null}
        {view === "customers" ? renderCustomersView() : null}
        {view === "reservations" ? renderReservationsListView() : null}

        {renderReservationModal()}
      </div>
    </div>
  );
}