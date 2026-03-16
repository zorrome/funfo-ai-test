function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var API_BASE = "";
  var [users, setUsers] = useState([]);
  var [stats, setStats] = useState({
    total_count: 0,
    male_count: 0,
    female_count: 0,
    other_count: 0,
    average_age: 0,
    min_age: 0,
    max_age: 0,
    under_20_count: 0,
    adult_count: 0,
    top_gender: ""
  });
  var [form, setForm] = useState({
    name: "",
    gender: "male",
    age: ""
  });
  var [editingId, setEditingId] = useState(null);
  var [error, setError] = useState("");
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [deletingId, setDeletingId] = useState(null);
  var [fetchError, setFetchError] = useState("");

  function apiGet(path) {
    return fetch(API_BASE + path, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          throw new Error(data.error || "データの取得に失敗しました");
        });
      }
      return res.json();
    });
  }

  function apiSend(path, method, body) {
    return fetch(API_BASE + path, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          throw new Error(data.error || "保存に失敗しました");
        });
      }
      return res.json();
    });
  }

  function apiDelete(path) {
    return fetch(API_BASE + path, {
      method: "DELETE",
      headers: {
        "Accept": "application/json"
      }
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          throw new Error(data.error || "削除に失敗しました");
        });
      }
      return res.json();
    });
  }

  function updateForm(key, value) {
    setForm(function (prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = value;
      return next;
    });
  }

  function resetForm() {
    setForm({
      name: "",
      gender: "male",
      age: ""
    });
    setEditingId(null);
    setError("");
  }

  function validate() {
    if (!form.name.trim()) return "名前を入力してください";
    if (!form.age || isNaN(Number(form.age))) return "年齢を正しく入力してください";
    if (Number(form.age) <= 0) return "年齢は1以上で入力してください";
    return "";
  }

  function genderLabel(gender) {
    if (gender === "male") return "男性";
    if (gender === "female") return "女性";
    return "その他";
  }

  function topGenderLabel(value) {
    if (!value) return "-";
    return genderLabel(value);
  }

  function loadUsers() {
    return apiGet("/api/users").then(function (data) {
      setUsers(asArray(data.users));
    });
  }

  function loadStats() {
    return apiGet("/api/users/stats").then(function (data) {
      setStats({
        total_count: Number(data.total_count || 0),
        male_count: Number(data.male_count || 0),
        female_count: Number(data.female_count || 0),
        other_count: Number(data.other_count || 0),
        average_age: Number(data.average_age || 0),
        min_age: Number(data.min_age || 0),
        max_age: Number(data.max_age || 0),
        under_20_count: Number(data.under_20_count || 0),
        adult_count: Number(data.adult_count || 0),
        top_gender: data.top_gender || ""
      });
    });
  }

  function loadData() {
    setLoading(true);
    setFetchError("");
    return Promise.all([loadUsers(), loadStats()])
      .catch(function (e) {
        setFetchError(e && e.message ? e.message : "データの読み込みに失敗しました");
        setUsers([]);
        setStats({
          total_count: 0,
          male_count: 0,
          female_count: 0,
          other_count: 0,
          average_age: 0,
          min_age: 0,
          max_age: 0,
          under_20_count: 0,
          adult_count: 0,
          top_gender: ""
        });
      })
      .finally(function () {
        setLoading(false);
      });
  }

  useEffect(function () {
    loadData();
  }, []);

  function handleSubmit() {
    var msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    setError("");

    var payload = {
      name: form.name.trim(),
      gender: form.gender,
      age: Number(form.age)
    };

    var request = editingId
      ? apiSend("/api/users/" + editingId, "PUT", payload)
      : apiSend("/api/users", "POST", payload);

    request
      .then(function () {
        resetForm();
        return Promise.all([loadUsers(), loadStats()]);
      })
      .catch(function (e) {
        setError(e && e.message ? e.message : (editingId ? "更新に失敗しました" : "登録に失敗しました"));
      })
      .finally(function () {
        setSaving(false);
      });
  }

  function handleEdit(user) {
    setForm({
      name: user.name || "",
      gender: user.gender || "male",
      age: String(user.age || "")
    });
    setEditingId(user.id);
    setError("");
  }

  function handleDelete(id) {
    setDeletingId(id);
    setError("");

    apiDelete("/api/users/" + id)
      .then(function () {
        if (editingId === id) resetForm();
        return Promise.all([loadUsers(), loadStats()]);
      })
      .catch(function (e) {
        setError(e && e.message ? e.message : "削除に失敗しました");
      })
      .finally(function () {
        setDeletingId(null);
      });
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">👤 ユーザー情報ログインアプリ</h1>
          <p className="text-sm text-slate-500 mt-2">
            名前・性別・年齢を登録して、簡単な統計を確認できます。
          </p>
        </div>

        {fetchError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <span>❌ {fetchError}</span>
            <button
              className="text-xs px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-100"
              onClick={loadData}
            >
              再読み込み
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800">
                {editingId ? "✏️ ユーザー編集" : "🔐 ユーザー登録"}
              </h2>
              {editingId && (
                <button
                  className="text-xs text-slate-500 hover:text-slate-800"
                  onClick={resetForm}
                  disabled={saving}
                >
                  キャンセル
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">名前</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="名前を入力"
                  value={form.name}
                  onChange={function (e) { updateForm("name", e.target.value); }}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">性別</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                  value={form.gender}
                  onChange={function (e) { updateForm("gender", e.target.value); }}
                  disabled={saving}
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">年齢</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="年齢を入力"
                  type="number"
                  min="1"
                  value={form.age}
                  onChange={function (e) { updateForm("age", e.target.value); }}
                  disabled={saving}
                />
              </div>

              {error && (
                <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  ❌ {error}
                </div>
              )}

              <button
                className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-sm hover:bg-slate-800 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "保存中..." : (editingId ? "更新する" : "登録する")}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">📊 総人数</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {loading ? "-" : stats.total_count}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">👨 男性</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {loading ? "-" : stats.male_count}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">👩 女性</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {loading ? "-" : stats.female_count}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">🧮 平均年齢</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {loading ? "-" : stats.average_age}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">🎯 年齢範囲</div>
                <div className="text-sm font-semibold text-slate-900 mt-3">
                  {loading ? "-" : (stats.total_count ? stats.min_age + "〜" + stats.max_age : "-")}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">📋 登録ユーザー一覧</h2>
                <span className="text-xs text-slate-400">サーバー保存対応</span>
              </div>

              {loading ? (
                <div className="text-sm text-slate-400 py-10 text-center">
                  読み込み中です...
                </div>
              ) : users.length === 0 ? (
                <div className="text-sm text-slate-400 py-10 text-center">
                  まだユーザーが登録されていません。
                </div>
              ) : (
                <div className="space-y-3">
                  {asArray(users).map(function (user, index) {
                    return (
                      <div
                        key={user.id}
                        className="border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {index + 1}. {user.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            性別: {genderLabel(user.gender)} ・ 年齢: {user.age}歳
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="px-3 py-2 text-xs rounded-xl border border-slate-200 hover:bg-slate-50"
                            onClick={function () { handleEdit(user); }}
                            disabled={saving || deletingId === user.id}
                          >
                            編集
                          </button>
                          <button
                            className="px-3 py-2 text-xs rounded-xl border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-60"
                            onClick={function () { handleDelete(user.id); }}
                            disabled={saving || deletingId === user.id}
                          >
                            {deletingId === user.id ? "削除中..." : "削除"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">📈 統計サマリー</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  最も多い性別:
                  <span className="font-semibold text-slate-900 ml-1">
                    {loading ? "-" : topGenderLabel(stats.top_gender)}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  20歳未満:
                  <span className="font-semibold text-slate-900 ml-1">
                    {loading ? "-" : stats.under_20_count + "人"}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  20歳以上:
                  <span className="font-semibold text-slate-900 ml-1">
                    {loading ? "-" : stats.adult_count + "人"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}