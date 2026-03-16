function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var API_BASE = "";
  var [users, setUsers] = useState([]);
  var [stats, setStats] = useState({
    totalCount: 0,
    averageAge: "0.0",
    maleCount: 0,
    femaleCount: 0,
    otherCount: 0,
    adultCount: 0
  });
  var [name, setName] = useState("");
  var [gender, setGender] = useState("male");
  var [age, setAge] = useState("");
  var [message, setMessage] = useState("");
  var [error, setError] = useState("");
  var [loading, setLoading] = useState(true);
  var [submitting, setSubmitting] = useState(false);
  var [deletingId, setDeletingId] = useState(null);

  function apiGet(path) {
    return fetch(API_BASE + path, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    }).then(function (res) {
      return res.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!res.ok) {
          throw new Error(data.error || "通信に失敗しました");
        }
        return data;
      });
    });
  }

  function apiSend(path, method, body) {
    return fetch(API_BASE + path, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!res.ok) {
          throw new Error(data.error || "通信に失敗しました");
        }
        return data;
      });
    });
  }

  function resetForm() {
    setName("");
    setGender("male");
    setAge("");
  }

  function normalizeStats(data) {
    return {
      totalCount: Number(data && data.totalCount ? data.totalCount : 0),
      averageAge: String(data && data.averageAge ? data.averageAge : "0.0"),
      maleCount: Number(data && data.maleCount ? data.maleCount : 0),
      femaleCount: Number(data && data.femaleCount ? data.femaleCount : 0),
      otherCount: Number(data && data.otherCount ? data.otherCount : 0),
      adultCount: Number(data && data.adultCount ? data.adultCount : 0)
    };
  }

  function loadUsers() {
    return apiGet("/api/users").then(function (data) {
      setUsers(asArray(data.users));
    });
  }

  function loadStats() {
    return apiGet("/api/users/stats").then(function (data) {
      setStats(normalizeStats(data));
    });
  }

  function loadAll() {
    setLoading(true);
    setError("");
    return Promise.all([loadUsers(), loadStats()]).catch(function (err) {
      setError(err && err.message ? err.message : "データの取得に失敗しました");
      setUsers([]);
      setStats(normalizeStats({}));
    }).finally(function () {
      setLoading(false);
    });
  }

  useEffect(function () {
    loadAll();
  }, []);

  function handleLogin() {
    var trimmedName = name.trim();
    var ageNumber = Number(age);

    setMessage("");
    setError("");

    if (!trimmedName) {
      setMessage("⚠️ 名前を入力してください");
      return;
    }

    if (!age || isNaN(ageNumber) || ageNumber <= 0) {
      setMessage("⚠️ 正しい年齢を入力してください");
      return;
    }

    setSubmitting(true);

    apiSend("/api/users", "POST", {
      name: trimmedName,
      gender: gender,
      age: ageNumber
    }).then(function () {
      setMessage("✅ ログイン情報を登録しました");
      resetForm();
      return Promise.all([loadUsers(), loadStats()]);
    }).catch(function (err) {
      setError(err && err.message ? err.message : "登録に失敗しました");
    }).finally(function () {
      setSubmitting(false);
    });
  }

  function handleDelete(id) {
    setMessage("");
    setError("");
    setDeletingId(id);

    apiSend("/api/users/" + id, "DELETE").then(function () {
      setMessage("🗑️ ユーザーを削除しました");
      return Promise.all([loadUsers(), loadStats()]);
    }).catch(function (err) {
      setError(err && err.message ? err.message : "削除に失敗しました");
    }).finally(function () {
      setDeletingId(null);
    });
  }

  function genderLabel(value) {
    if (value === "male") return "男性";
    if (value === "female") return "女性";
    return "その他";
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">👤 ユーザー情報ログインアプリ</h1>
          <p className="text-sm text-slate-500 mt-2">
            名前・性別・年齢を登録して、かんたんな統計を確認できます。
          </p>
        </div>

        {error ? (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-3">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-3">
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-800">📝 ログイン情報入力</h2>
              <p className="text-xs text-slate-500 mt-1">
                ユーザー情報を入力して登録してください。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">名前</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={name}
                  onChange={function (e) { setName(e.target.value); }}
                  placeholder="例: 山田 太郎"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">性別</label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  value={gender}
                  onChange={function (e) { setGender(e.target.value); }}
                  disabled={submitting}
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">年齢</label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={age}
                  onChange={function (e) { setAge(e.target.value); }}
                  placeholder="例: 28"
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleLogin}
                  disabled={submitting}
                  className={"text-white text-sm font-medium px-4 py-2 rounded-xl " + (submitting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700")}
                >
                  {submitting ? "送信中..." : "✅ ログイン登録"}
                </button>
                <button
                  onClick={resetForm}
                  disabled={submitting}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl"
                >
                  リセット
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-800">📊 統計表示</h2>
              <p className="text-xs text-slate-500 mt-1">
                登録されたユーザー情報の集計です。
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">登録人数</div>
                  <div className="text-sm text-slate-400 mt-2">読み込み中...</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">平均年齢</div>
                  <div className="text-sm text-slate-400 mt-2">読み込み中...</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">男性</div>
                  <div className="text-sm text-slate-400 mt-2">読み込み中...</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">女性</div>
                  <div className="text-sm text-slate-400 mt-2">読み込み中...</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 col-span-2">
                  <div className="text-sm text-slate-400">集計を取得しています...</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">登録人数</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCount}</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">平均年齢</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.averageAge}</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">男性</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{stats.maleCount}</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="text-xs text-slate-500">女性</div>
                  <div className="text-2xl font-bold text-pink-600 mt-1">{stats.femaleCount}</div>
                </div>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">その他 / 成人数</div>
                      <div className="text-sm text-slate-700 mt-1">
                        その他: <span className="font-semibold">{stats.otherCount}</span> / 18歳以上: <span className="font-semibold">{stats.adultCount}</span>
                      </div>
                    </div>
                    <div className="text-2xl">📈</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">📋 登録ユーザー一覧</h2>
              <p className="text-xs text-slate-500 mt-1">
                登録済みユーザーの情報を一覧で確認できます。
              </p>
            </div>
            <button
              onClick={loadAll}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl"
            >
              再読み込み
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl p-6 text-center">
              ユーザー一覧を読み込み中です。
            </div>
          ) : asArray(users).length === 0 ? (
            <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl p-6 text-center">
              まだユーザーが登録されていません。
            </div>
          ) : (
            <div className="space-y-3">
              {asArray(users).map(function (user) {
                return (
                  <div
                    key={user.id}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        性別: {genderLabel(user.gender)} ・ 年齢: {user.age}歳
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        登録日時: {user.created_at ? String(user.created_at) : "-"}
                      </div>
                    </div>
                    <button
                      onClick={function () { handleDelete(user.id); }}
                      disabled={deletingId === user.id}
                      className={"text-sm px-3 py-2 rounded-xl " + (deletingId === user.id ? "bg-red-100 text-red-300" : "bg-red-50 hover:bg-red-100 text-red-600")}
                    >
                      {deletingId === user.id ? "削除中..." : "🗑️ 削除"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}