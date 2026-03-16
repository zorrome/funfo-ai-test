function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var API_BASE = "";
  var [profiles, setProfiles] = useState([]);
  var [current_user, setCurrentUser] = useState(null);
  var [stats, setStats] = useState({
    total_users: 0,
    avg_age: "0.0",
    male_count: 0,
    female_count: 0,
    other_count: 0
  });
  var [form, setForm] = useState({
    name: "",
    gender: "男性",
    age: ""
  });
  var [error, setError] = useState("");
  var [loading, setLoading] = useState(true);
  var [submitting, setSubmitting] = useState(false);
  var [session_loading, setSessionLoading] = useState(true);

  function resetForm() {
    setForm({
      name: "",
      gender: "男性",
      age: ""
    });
    setError("");
  }

  function handleChange(key, value) {
    setForm(function(prev) {
      return Object.assign({}, prev, { [key]: value });
    });
  }

  function apiGet(path) {
    return fetch(API_BASE + path, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    }).then(function(res) {
      if (!res.ok) {
        return res.json().catch(function() {
          return {};
        }).then(function(data) {
          throw new Error(data.error || "通信に失敗しました");
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
      body: JSON.stringify(body || {})
    }).then(function(res) {
      if (!res.ok) {
        return res.json().catch(function() {
          return {};
        }).then(function(data) {
          throw new Error(data.error || "通信に失敗しました");
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
    }).then(function(res) {
      if (!res.ok) {
        return res.json().catch(function() {
          return {};
        }).then(function(data) {
          throw new Error(data.error || "通信に失敗しました");
        });
      }
      return res.json();
    });
  }

  function loadUsers() {
    return apiGet("/api/users").then(function(data) {
      setProfiles(asArray(data));
      return asArray(data);
    });
  }

  function loadStats() {
    return apiGet("/api/users/stats").then(function(data) {
      setStats({
        total_users: Number(data && data.total_users ? data.total_users : 0),
        avg_age: String(data && data.avg_age != null ? data.avg_age : "0.0"),
        male_count: Number(data && data.male_count ? data.male_count : 0),
        female_count: Number(data && data.female_count ? data.female_count : 0),
        other_count: Number(data && data.other_count ? data.other_count : 0)
      });
      return data;
    });
  }

  function loadCurrentSession() {
    setSessionLoading(true);
    return apiGet("/api/session/current").then(function(data) {
      setCurrentUser(data || null);
      return data;
    }).catch(function(err) {
      setCurrentUser(null);
      throw err;
    }).finally(function() {
      setSessionLoading(false);
    });
  }

  function loadInitialData() {
    setLoading(true);
    setError("");
    Promise.all([
      loadUsers(),
      loadStats(),
      loadCurrentSession()
    ]).catch(function(err) {
      setError(err.message || "データの取得に失敗しました");
    }).finally(function() {
      setLoading(false);
    });
  }

  useEffect(function() {
    loadInitialData();
  }, []);

  function handleRegister() {
    var name = form.name.trim();
    var age_num = Number(form.age);

    if (!name) {
      setError("姓名を入力してください");
      return;
    }
    if (!form.gender) {
      setError("性別を選択してください");
      return;
    }
    if (!form.age || isNaN(age_num) || age_num <= 0) {
      setError("正しい年齢を入力してください");
      return;
    }

    setSubmitting(true);
    setError("");

    apiSend("/api/users", "POST", {
      name: name,
      gender: form.gender,
      age: age_num
    }).then(function(createdUser) {
      setProfiles(function(prev) {
        return [createdUser].concat(asArray(prev));
      });
      resetForm();
      return apiSend("/api/session/login", "POST", {
        user_id: createdUser.id
      });
    }).then(function(loggedInUser) {
      setCurrentUser(loggedInUser || null);
      return loadStats();
    }).catch(function(err) {
      setError(err.message || "ユーザー登録に失敗しました");
    }).finally(function() {
      setSubmitting(false);
    });
  }

  function handleLogin(id) {
    setError("");
    setSessionLoading(true);

    apiSend("/api/session/login", "POST", {
      user_id: id
    }).then(function(data) {
      setCurrentUser(data || null);
    }).catch(function(err) {
      setError(err.message || "ログインに失敗しました");
    }).finally(function() {
      setSessionLoading(false);
    });
  }

  function handleLogout() {
    setError("");
    setSessionLoading(true);

    apiSend("/api/session/logout", "POST", {}).then(function() {
      setCurrentUser(null);
    }).catch(function(err) {
      setError(err.message || "ログアウトに失敗しました");
    }).finally(function() {
      setSessionLoading(false);
    });
  }

  function handleDelete(id) {
    setError("");

    apiDelete("/api/users/" + id).then(function(data) {
      var deleted_id = data && data.id != null ? data.id : id;

      setProfiles(function(prev) {
        return asArray(prev).filter(function(item) {
          return item.id !== deleted_id;
        });
      });

      if (current_user && current_user.id === deleted_id) {
        setCurrentUser(null);
        return loadCurrentSession().catch(function() {
          return null;
        }).then(function() {
          return loadStats();
        });
      }

      return loadStats();
    }).catch(function(err) {
      setError(err.message || "削除に失敗しました");
    });
  }

  var current_user_id = current_user ? current_user.id : null;
  var total_users = Number(stats.total_users || 0);
  var avg_age = stats.avg_age != null ? stats.avg_age : "0.0";
  var male_count = Number(stats.male_count || 0);
  var female_count = Number(stats.female_count || 0);
  var other_count = Number(stats.other_count || 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">👤 ユーザー情報ログインアプリ</h1>
          <p className="text-sm text-slate-500 mt-2">
            名前・性別・年齢を登録して、簡単なログインと統計表示ができます。
          </p>
        </div>

        {error && (
          <div className="mb-6 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            ❌ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">📝 ユーザー登録</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">姓名</label>
                <input
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={form.name}
                  onChange={function(e) { handleChange("name", e.target.value); }}
                  placeholder="例: 田中 太郎"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">性別</label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  value={form.gender}
                  onChange={function(e) { handleChange("gender", e.target.value); }}
                  disabled={submitting}
                >
                  <option value="男性">男性</option>
                  <option value="女性">女性</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">年齢</label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={form.age}
                  onChange={function(e) { handleChange("age", e.target.value); }}
                  placeholder="例: 28"
                  disabled={submitting}
                />
              </div>

              <button
                className={"w-full text-white rounded-xl px-4 py-2 text-sm font-medium " + (submitting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700")}
                onClick={handleRegister}
                disabled={submitting}
              >
                {submitting ? "登録中..." : "登録してログイン"}
              </button>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">🔐 ログイン中のユーザー</h2>

            {session_loading ? (
              <div className="text-sm text-slate-400">セッション情報を読み込み中です...</div>
            ) : current_user ? (
              <div className="space-y-3">
                <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4">
                  <div className="text-sm font-semibold mb-2">✅ ログイン成功</div>
                  <div className="text-sm">姓名: {current_user.name}</div>
                  <div className="text-sm">性別: {current_user.gender}</div>
                  <div className="text-sm">年齢: {current_user.age}歳</div>
                  <div className="text-xs text-slate-500 mt-2">登録日時: {current_user.created_at}</div>
                </div>
                <button
                  className="px-3 py-2 text-xs rounded-xl bg-slate-700 text-white hover:bg-slate-800"
                  onClick={handleLogout}
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-400">まだログイン中のユーザーはいません</div>
            )}
          </section>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold">📊 統計情報</h2>
            <button
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white hover:bg-slate-50"
              onClick={loadInitialData}
              disabled={loading}
            >
              再読み込み
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400">統計情報を読み込み中です...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">登録人数</div>
                <div className="text-2xl font-bold mt-1">{total_users}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">平均年齢</div>
                <div className="text-2xl font-bold mt-1">{avg_age}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">男性</div>
                <div className="text-2xl font-bold mt-1">{male_count}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500">女性・その他</div>
                <div className="text-2xl font-bold mt-1">{female_count + other_count}</div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-6">
          <h2 className="text-sm font-semibold mb-4">👥 ユーザー一覧</h2>

          {loading ? (
            <div className="text-sm text-slate-400">ユーザー一覧を読み込み中です...</div>
          ) : total_users === 0 ? (
            <div className="text-sm text-slate-400">ユーザーがまだ登録されていません</div>
          ) : (
            <div className="space-y-3">
              {asArray(profiles).map(function(user) {
                var is_active = current_user_id === user.id;
                return (
                  <div
                    key={user.id}
                    className={"border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 " + (is_active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white")}
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {user.name} {is_active ? "（ログイン中）" : ""}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        性別: {user.gender} / 年齢: {user.age}歳
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        登録日時: {user.created_at}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className={"px-3 py-2 text-xs rounded-xl text-white " + (is_active ? "bg-slate-300" : "bg-emerald-600 hover:bg-emerald-700")}
                        onClick={function() { handleLogin(user.id); }}
                        disabled={is_active}
                      >
                        {is_active ? "ログイン中" : "このユーザーでログイン"}
                      </button>
                      <button
                        className="px-3 py-2 text-xs rounded-xl bg-red-500 text-white hover:bg-red-600"
                        onClick={function() { handleDelete(user.id); }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}