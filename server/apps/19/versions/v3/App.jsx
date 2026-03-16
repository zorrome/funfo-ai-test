function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var API_BASE = "";
  var [users, setUsers] = useState([]);
  var [currentUser, setCurrentUser] = useState(null);
  var [stats, setStats] = useState({
    total: 0,
    male_count: 0,
    female_count: 0,
    other_count: 0,
    avg_age: 0,
    adults: 0,
    minors: 0
  });

  var [name, setName] = useState("");
  var [gender, setGender] = useState("male");
  var [age, setAge] = useState("");
  var [error, setError] = useState("");
  var [loading, setLoading] = useState(true);
  var [loginLoading, setLoginLoading] = useState(false);
  var [logoutLoading, setLogoutLoading] = useState(false);
  var [deleteUserId, setDeleteUserId] = useState("");
  var [refreshing, setRefreshing] = useState(false);

  function apiGet(path) {
    return fetch(API_BASE + path, {
      method: "GET",
      credentials: "include"
    }).then(function(res) {
      return res.json().catch(function() {
        return {};
      }).then(function(data) {
        if (!res.ok) {
          throw new Error(data && data.error ? data.error : "通信に失敗しました");
        }
        return data;
      });
    });
  }

  function apiSend(path, method, body) {
    return fetch(API_BASE + path, {
      method: method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function(res) {
      return res.json().catch(function() {
        return {};
      }).then(function(data) {
        if (!res.ok) {
          throw new Error(data && data.error ? data.error : "通信に失敗しました");
        }
        return data;
      });
    });
  }

  function apiDelete(path) {
    return fetch(API_BASE + path, {
      method: "DELETE",
      credentials: "include"
    }).then(function(res) {
      return res.json().catch(function() {
        return {};
      }).then(function(data) {
        if (!res.ok) {
          throw new Error(data && data.error ? data.error : "通信に失敗しました");
        }
        return data;
      });
    });
  }

  function resetForm() {
    setName("");
    setGender("male");
    setAge("");
    setError("");
  }

  function normalizeStats(data) {
    return {
      total: Number(data && data.total) || 0,
      male_count: Number(data && data.male_count) || 0,
      female_count: Number(data && data.female_count) || 0,
      other_count: Number(data && data.other_count) || 0,
      avg_age: Number(data && data.avg_age) || 0,
      adults: Number(data && data.adults) || 0,
      minors: Number(data && data.minors) || 0
    };
  }

  function loadUsers() {
    return apiGet("/api/users").then(function(data) {
      setUsers(asArray(data && data.users));
    });
  }

  function loadStats() {
    return apiGet("/api/users/stats").then(function(data) {
      setStats(normalizeStats(data && data.stats ? data.stats : data));
    });
  }

  function loadSession() {
    return apiGet("/api/session/current").then(function(data) {
      setCurrentUser(data && data.user ? data.user : null);
    }).catch(function(err) {
      var message = err && err.message ? err.message : "";
      if (
        message === "未ログインです" ||
        message === "セッションが見つかりません" ||
        message === "ログインが必要です"
      ) {
        setCurrentUser(null);
        return;
      }
      throw err;
    });
  }

  function loadAll(showSpinner) {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    return Promise.all([
      loadUsers(),
      loadStats(),
      loadSession()
    ]).catch(function(err) {
      setError(err && err.message ? err.message : "データの取得に失敗しました");
    }).finally(function() {
      setLoading(false);
      setRefreshing(false);
    });
  }

  useEffect(function() {
    loadAll(true);
  }, []);

  function handleLogin() {
    var cleanName = name.trim();
    var ageNumber = Number(age);

    if (!cleanName) {
      setError("名前を入力してください");
      return;
    }

    if (!age || isNaN(ageNumber) || ageNumber <= 0) {
      setError("正しい年齢を入力してください");
      return;
    }

    setLoginLoading(true);
    setError("");

    apiSend("/api/session/login", "POST", {
      name: cleanName,
      gender: gender,
      age: ageNumber
    }).then(function(data) {
      setCurrentUser(data && data.user ? data.user : null);
      resetForm();
      return Promise.all([
        loadUsers(),
        loadStats(),
        loadSession()
      ]);
    }).catch(function(err) {
      setError(err && err.message ? err.message : "ログインに失敗しました");
    }).finally(function() {
      setLoginLoading(false);
    });
  }

  function handleLogout() {
    setLogoutLoading(true);
    setError("");

    apiSend("/api/session/logout", "POST").then(function() {
      setCurrentUser(null);
      return loadSession().catch(function() {
        setCurrentUser(null);
      });
    }).catch(function(err) {
      setError(err && err.message ? err.message : "ログアウトに失敗しました");
    }).finally(function() {
      setLogoutLoading(false);
    });
  }

  function handleDeleteUser(id) {
    var ok = window.confirm("このユーザーを削除しますか？");
    if (!ok) return;

    setDeleteUserId(String(id));
    setError("");

    apiDelete("/api/users/" + id).then(function() {
      return Promise.all([
        loadUsers(),
        loadStats(),
        loadSession().catch(function() {
          setCurrentUser(null);
        })
      ]);
    }).catch(function(err) {
      setError(err && err.message ? err.message : "ユーザーの削除に失敗しました");
    }).finally(function() {
      setDeleteUserId("");
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
            <span>👤</span>
            <span>シンプルユーザーログインアプリ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">ユーザー情報ログイン</h1>
          <p className="text-sm text-slate-500 mt-1">
            名前・性別・年齢でログインし、登録ユーザーの簡単な統計を確認できます。
          </p>
        </div>

        {error && (
          <div className="mb-4 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-sm text-slate-500">
            読み込み中です...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🔐</span>
                <h2 className="text-sm font-semibold text-slate-900">ログイン / 新規登録</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">名前</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={name}
                    onChange={function(e) { setName(e.target.value); }}
                    placeholder="名前を入力"
                    disabled={loginLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">性別</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                    value={gender}
                    onChange={function(e) { setGender(e.target.value); }}
                    disabled={loginLoading}
                  >
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">年齢</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    value={age}
                    onChange={function(e) { setAge(e.target.value); }}
                    placeholder="年齢を入力"
                    disabled={loginLoading}
                  />
                </div>

                <button
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
                  onClick={handleLogin}
                  disabled={loginLoading}
                >
                  {loginLoading ? "処理中..." : "ログイン / 登録"}
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✅</span>
                  <h3 className="text-sm font-semibold text-slate-900">現在のログイン状態</h3>
                </div>

                {currentUser ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="text-sm font-semibold text-slate-900">{currentUser.name} さん</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">性別</div>
                        <div className="text-sm font-medium text-slate-900 mt-1">{genderLabel(currentUser.gender)}</div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">年齢</div>
                        <div className="text-sm font-medium text-slate-900 mt-1">{currentUser.age}歳</div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">状態</div>
                        <div className="text-sm font-medium text-emerald-600 mt-1">ログイン中</div>
                      </div>
                    </div>
                    <button
                      className="mt-4 w-full bg-white border border-slate-200 hover:bg-slate-100 rounded-xl px-4 py-2 text-sm disabled:opacity-60"
                      onClick={handleLogout}
                      disabled={logoutLoading}
                    >
                      {logoutLoading ? "ログアウト中..." : "ログアウト"}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
                    まだログインしていません。
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <h2 className="text-sm font-semibold text-slate-900">ユーザー統計</h2>
                  </div>
                  <button
                    className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    onClick={function() { loadAll(false); }}
                    disabled={refreshing}
                  >
                    {refreshing ? "更新中..." : "再読み込み"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">総ユーザー数</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">平均年齢</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.avg_age}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">成人</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.adults}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">未成年</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{stats.minors}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4">
                    <div className="text-xs text-slate-500">男性</div>
                    <div className="text-2xl font-bold text-sky-700 mt-1">{stats.male_count}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-pink-50 p-4">
                    <div className="text-xs text-slate-500">女性</div>
                    <div className="text-2xl font-bold text-pink-700 mt-1">{stats.female_count}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-violet-50 p-4">
                  <div className="text-xs text-slate-500">その他</div>
                  <div className="text-2xl font-bold text-violet-700 mt-1">{stats.other_count}</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🗂️</span>
                  <h2 className="text-sm font-semibold text-slate-900">登録ユーザー一覧</h2>
                </div>

                {asArray(users).length === 0 ? (
                  <div className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
                    まだユーザーが登録されていません。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {asArray(users).map(function(user) {
                      var active = currentUser && String(currentUser.id) === String(user.id);

                      return (
                        <div
                          key={user.id}
                          className={"rounded-2xl border p-4 " + (active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                                {active && (
                                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                    ログイン中
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-2">
                                {genderLabel(user.gender)} ・ {user.age}歳
                              </div>
                            </div>

                            <button
                              className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-60"
                              onClick={function() { handleDeleteUser(user.id); }}
                              disabled={deleteUserId === String(user.id)}
                            >
                              {deleteUserId === String(user.id) ? "削除中..." : "削除"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}