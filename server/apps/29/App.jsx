function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var API_BASE = "";
  var [users, setUsers] = useState([]);
  var [currentUser, setCurrentUser] = useState(null);
  var [stats, setStats] = useState({
    total_users: 0,
    male_count: 0,
    female_count: 0,
    other_count: 0,
    average_age: "0.0"
  });
  var [form, setForm] = useState({
    name: "",
    gender: "male",
    age: ""
  });
  var [error, setError] = useState("");
  var [loadingUsers, setLoadingUsers] = useState(true);
  var [loadingSession, setLoadingSession] = useState(true);
  var [loadingStats, setLoadingStats] = useState(true);
  var [submitting, setSubmitting] = useState(false);
  var [sessionBusy, setSessionBusy] = useState(false);
  var [deletingId, setDeletingId] = useState("");
  var [pageMessage, setPageMessage] = useState("");
  var [darkMode, setDarkMode] = useState(false);

  function updateForm(key, value) {
    setForm(function(prev) {
      return Object.assign({}, prev, { [key]: value });
    });
  }

  function resetForm() {
    setForm({
      name: "",
      gender: "male",
      age: ""
    });
    setError("");
  }

  function apiGet(path) {
    return fetch(API_BASE + path, {
      method: "GET",
      credentials: "include"
    }).then(function(res) {
      return res.json().catch(function() {
        return null;
      }).then(function(data) {
        if (!res.ok) {
          var message = data && data.error ? data.error : "通信に失敗しました";
          throw new Error(message);
        }
        return data;
      });
    });
  }

  function apiSend(path, method, body) {
    return fetch(API_BASE + path, {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(body || {})
    }).then(function(res) {
      return res.json().catch(function() {
        return null;
      }).then(function(data) {
        if (!res.ok) {
          var message = data && data.error ? data.error : "通信に失敗しました";
          throw new Error(message);
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
        return null;
      }).then(function(data) {
        if (!res.ok) {
          var message = data && data.error ? data.error : "通信に失敗しました";
          throw new Error(message);
        }
        return data;
      });
    });
  }

  function loadUsers() {
    setLoadingUsers(true);
    return apiGet("/api/users")
      .then(function(data) {
        setUsers(asArray(data));
      })
      .catch(function(err) {
        setUsers([]);
        setError(err.message || "ユーザー一覧の取得に失敗しました");
      })
      .finally(function() {
        setLoadingUsers(false);
      });
  }

  function loadCurrentSession() {
    setLoadingSession(true);
    return apiGet("/api/session/current")
      .then(function(data) {
        setCurrentUser(data || null);
      })
      .catch(function(err) {
        setCurrentUser(null);
        setError(err.message || "ログイン状態の取得に失敗しました");
      })
      .finally(function() {
        setLoadingSession(false);
      });
  }

  function loadStats() {
    setLoadingStats(true);
    return apiGet("/api/users/stats")
      .then(function(data) {
        setStats({
          total_users: Number(data && data.total_users ? data.total_users : 0),
          male_count: Number(data && data.male_count ? data.male_count : 0),
          female_count: Number(data && data.female_count ? data.female_count : 0),
          other_count: Number(data && data.other_count ? data.other_count : 0),
          average_age: String(data && data.average_age != null ? data.average_age : "0.0")
        });
      })
      .catch(function(err) {
        setStats({
          total_users: 0,
          male_count: 0,
          female_count: 0,
          other_count: 0,
          average_age: "0.0"
        });
        setError(err.message || "統計の取得に失敗しました");
      })
      .finally(function() {
        setLoadingStats(false);
      });
  }

  function refreshAll() {
    setError("");
    return Promise.all([
      loadUsers(),
      loadCurrentSession(),
      loadStats()
    ]);
  }

  useEffect(function() {
    try {
      var savedMode = localStorage.getItem("user_app_dark_mode");
      if (savedMode === "true") {
        setDarkMode(true);
      } else if (savedMode === "false") {
        setDarkMode(false);
      }
    } catch (e) {}
    refreshAll();
  }, []);

  useEffect(function() {
    try {
      localStorage.setItem("user_app_dark_mode", darkMode ? "true" : "false");
    } catch (e) {}
  }, [darkMode]);

  function handleRegister() {
    var name = form.name.trim();
    var age_num = Number(form.age);

    setError("");
    setPageMessage("");

    if (!name) {
      setError("姓名を入力してください");
      return;
    }

    if (!form.age || isNaN(age_num) || age_num <= 0) {
      setError("正しい年齢を入力してください");
      return;
    }

    setSubmitting(true);

    apiSend("/api/users", "POST", {
      name: name,
      gender: form.gender,
      age: age_num
    })
      .then(function(createdUser) {
        setUsers(function(prev) {
          return asArray(prev).concat([createdUser]);
        });
        resetForm();
        return Promise.all([
          apiSend("/api/session/login", "POST", { user_id: createdUser.id }),
          loadStats()
        ]).then(function(results) {
          setCurrentUser(results[0] || null);
          setPageMessage("ユーザーを登録し、そのままログインしました");
        });
      })
      .catch(function(err) {
        setError(err.message || "登録に失敗しました");
      })
      .finally(function() {
        setSubmitting(false);
      });
  }

  function handleLogin(user_id) {
    setSessionBusy(true);
    setError("");
    setPageMessage("");

    apiSend("/api/session/login", "POST", { user_id: user_id })
      .then(function(data) {
        setCurrentUser(data || null);
        setPageMessage("ログインしました");
      })
      .catch(function(err) {
        setError(err.message || "ログインに失敗しました");
      })
      .finally(function() {
        setSessionBusy(false);
      });
  }

  function handleLogout() {
    setSessionBusy(true);
    setError("");
    setPageMessage("");

    apiSend("/api/session/logout", "POST", {})
      .then(function() {
        setCurrentUser(null);
        setPageMessage("ログアウトしました");
      })
      .catch(function(err) {
        setError(err.message || "ログアウトに失敗しました");
      })
      .finally(function() {
        setSessionBusy(false);
      });
  }

  function handleDelete(user_id) {
    setDeletingId(String(user_id));
    setError("");
    setPageMessage("");

    apiDelete("/api/users/" + user_id)
      .then(function() {
        setUsers(function(prev) {
          return asArray(prev).filter(function(user) {
            return String(user.id) !== String(user_id);
          });
        });
        return Promise.all([
          loadCurrentSession(),
          loadStats()
        ]);
      })
      .then(function() {
        setPageMessage("ユーザーを削除しました");
      })
      .catch(function(err) {
        setError(err.message || "削除に失敗しました");
      })
      .finally(function() {
        setDeletingId("");
      });
  }

  var total_users = Number(stats.total_users || 0);
  var male_count = Number(stats.male_count || 0);
  var female_count = Number(stats.female_count || 0);
  var other_count = Number(stats.other_count || 0);
  var average_age = String(stats.average_age || "0.0");
  var initialLoading = loadingUsers || loadingSession || loadingStats;

  var pageBg = darkMode ? "min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6" : "min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6";
  var cardClass = darkMode ? "bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm" : "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm";
  var mutedText = darkMode ? "text-slate-400" : "text-slate-500";
  var inputClass = darkMode ? "w-full border border-slate-700 bg-slate-950 text-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" : "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400";
  var panelSoft = darkMode ? "rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center" : "rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center";
  var statCard = darkMode ? "rounded-2xl border border-slate-800 p-4 bg-slate-950" : "rounded-2xl border border-slate-200 p-4 bg-slate-50";
  var surfaceSoft = darkMode ? "mt-3 rounded-2xl border border-slate-800 p-4 bg-slate-950" : "mt-3 rounded-2xl border border-slate-200 p-4 bg-slate-50";

  return (
    <div className={pageBg}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className={darkMode ? "inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-xs text-slate-400 mb-3" : "inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 mb-3"}>
              <span>👤</span>
              <span>シンプルなユーザー情報ログインアプリ</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">ユーザー情報ログイン</h1>
            <p className={"text-sm " + mutedText}>
              名前・性別・年齢で登録して、そのままログイン。下で簡単な統計も確認できます。
            </p>
          </div>

          <button
            className={darkMode ? "shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800" : "shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"}
            onClick={function() { setDarkMode(function(prev) { return !prev; }); }}
          >
            <span>{darkMode ? "🌙" : "☀️"}</span>
            <span>{darkMode ? "暗夜モード中" : "通常モード中"}</span>
          </button>
        </div>

        {error ? (
          <div className="mb-4 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            ❌ {error}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            ✅ {pageMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">📝</span>
              <h2 className="text-sm font-semibold">ユーザー登録</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={"block text-xs mb-1 " + mutedText}>姓名</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={function(e) { updateForm("name", e.target.value); }}
                  placeholder="例:田中 太郎"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={"block text-xs mb-1 " + mutedText}>性別</label>
                <select
                  className={inputClass + (darkMode ? " bg-slate-950" : " bg-white")}
                  value={form.gender}
                  onChange={function(e) { updateForm("gender", e.target.value); }}
                  disabled={submitting}
                >
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className={"block text-xs mb-1 " + mutedText}>年齢</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.age}
                  onChange={function(e) { updateForm("age", e.target.value); }}
                  placeholder="例:28"
                  disabled={submitting}
                />
              </div>

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
                onClick={handleRegister}
                disabled={submitting}
              >
                {submitting ? "登録中..." : "登録してログイン"}
              </button>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">🔐</span>
              <h2 className="text-sm font-semibold">現在のログイン状態</h2>
            </div>

            {loadingSession ? (
              <div className={panelSoft}>
                <div className="text-3xl mb-2">⏳</div>
                <div className="text-sm font-medium mb-1">ログイン状態を確認中です</div>
                <div className={"text-xs " + mutedText}>少し待つと最新の状態が表示されます。</div>
              </div>
            ) : currentUser ? (
              <div className="space-y-4">
                <div className={darkMode ? "rounded-2xl border border-emerald-900 bg-emerald-950/40 p-4" : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"}>
                  <div className={darkMode ? "text-xs text-emerald-400 mb-1" : "text-xs text-emerald-600 mb-1"}>ログイン中</div>
                  <div className="text-sm font-semibold mb-2">{currentUser.name}</div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className={darkMode ? "bg-slate-900 rounded-xl border border-slate-800 p-3" : "bg-white rounded-xl border border-slate-200 p-3"}>
                      <div className={mutedText + " mb-1"}>性別</div>
                      <div className="text-sm font-medium">
                        {currentUser.gender === "male" ? "男性" : currentUser.gender === "female" ? "女性" : "その他"}
                      </div>
                    </div>
                    <div className={darkMode ? "bg-slate-900 rounded-xl border border-slate-800 p-3" : "bg-white rounded-xl border border-slate-200 p-3"}>
                      <div className={mutedText + " mb-1"}>年齢</div>
                      <div className="text-sm font-medium">{currentUser.age}歳</div>
                    </div>
                    <div className={darkMode ? "bg-slate-900 rounded-xl border border-slate-800 p-3" : "bg-white rounded-xl border border-slate-200 p-3"}>
                      <div className={mutedText + " mb-1"}>状態</div>
                      <div className="text-sm font-medium">利用中</div>
                    </div>
                  </div>
                </div>

                <button
                  className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white rounded-xl px-4 py-2.5 text-sm"
                  onClick={handleLogout}
                  disabled={sessionBusy}
                >
                  {sessionBusy ? "処理中..." : "ログアウト"}
                </button>
              </div>
            ) : (
              <div className={panelSoft}>
                <div className="text-3xl mb-2">🙂</div>
                <div className="text-sm font-medium mb-1">まだログインしていません</div>
                <div className={"text-xs " + mutedText}>
                  左のフォームから登録するか、下の一覧からログインしてください。
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={cardClass + " mt-5"}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">📊</span>
            <h2 className="text-sm font-semibold">簡単な統計</h2>
          </div>

          {loadingStats ? (
            <div className={"text-sm py-8 text-center " + mutedText}>
              統計を読み込み中です
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={statCard}>
                  <div className={"text-xs mb-1 " + mutedText}>登録人数</div>
                  <div className="text-2xl font-bold">{total_users}</div>
                </div>
                <div className={statCard}>
                  <div className={"text-xs mb-1 " + mutedText}>男性</div>
                  <div className="text-2xl font-bold">{male_count}</div>
                </div>
                <div className={statCard}>
                  <div className={"text-xs mb-1 " + mutedText}>女性</div>
                  <div className="text-2xl font-bold">{female_count}</div>
                </div>
                <div className={statCard}>
                  <div className={"text-xs mb-1 " + mutedText}>平均年齢</div>
                  <div className="text-2xl font-bold">{average_age}</div>
                </div>
              </div>

              <div className={surfaceSoft}>
                <div className={"text-xs mb-2 " + mutedText}>性別内訳</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">男性 {male_count}人</div>
                  <div className="px-3 py-1.5 rounded-full bg-pink-100 text-pink-700">女性 {female_count}人</div>
                  <div className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700">その他 {other_count}人</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={cardClass + " mt-5"}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h2 className="text-sm font-semibold">登録ユーザー一覧</h2>
            </div>
            <button
              className={darkMode ? "text-xs rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800" : "text-xs rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50"}
              onClick={refreshAll}
            >
              更新
            </button>
          </div>

          {initialLoading ? (
            <div className={"py-10 text-center text-sm " + mutedText}>データを読み込み中です</div>
          ) : users.length === 0 ? (
            <div className={panelSoft}>
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm font-medium mb-1">登録ユーザーがまだいません</div>
              <div className={"text-xs " + mutedText}>左のフォームから最初のユーザーを登録してください。</div>
            </div>
          ) : (
            <div className="space-y-3">
              {asArray(users).map(function(user) {
                var isCurrent = currentUser && String(currentUser.id) === String(user.id);
                var genderLabel = user.gender === "male" ? "男性" : user.gender === "female" ? "女性" : "その他";

                return (
                  <div
                    key={user.id}
                    className={darkMode ? "rounded-2xl border border-slate-800 bg-slate-950 p-4" : "rounded-2xl border border-slate-200 bg-slate-50 p-4"}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <div className="text-sm font-semibold">{user.name}</div>
                          {isCurrent ? (
                            <span className={darkMode ? "text-[10px] px-2 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-900" : "text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200"}>
                              ログイン中
                            </span>
                          ) : null}
                        </div>
                        <div className={"flex flex-wrap gap-2 text-xs " + mutedText}>
                          <span className={darkMode ? "px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800" : "px-2.5 py-1 rounded-full bg-white border border-slate-200"}>{genderLabel}</span>
                          <span className={darkMode ? "px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800" : "px-2.5 py-1 rounded-full bg-white border border-slate-200"}>{user.age}歳</span>
                          <span className={darkMode ? "px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800" : "px-2.5 py-1 rounded-full bg-white border border-slate-200"}># {user.id}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isCurrent ? null : (
                          <button
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 disabled:bg-blue-300"
                            onClick={function() { handleLogin(user.id); }}
                            disabled={sessionBusy}
                          >
                            {sessionBusy ? "処理中..." : "ログイン"}
                          </button>
                        )}
                        <button
                          className={darkMode ? "rounded-xl bg-red-950 hover:bg-red-900 text-red-200 text-sm px-4 py-2 border border-red-900 disabled:opacity-60" : "rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm px-4 py-2 border border-red-200 disabled:opacity-60"}
                          onClick={function() { handleDelete(user.id); }}
                          disabled={deletingId === String(user.id)}
                        >
                          {deletingId === String(user.id) ? "削除中..." : "削除"}
                        </button>
                      </div>
                    </div>
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