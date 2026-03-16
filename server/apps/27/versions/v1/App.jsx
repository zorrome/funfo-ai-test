function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "user_profiles_app_v1";

  var [profiles, setProfiles] = useState(function() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  var [current_user_id, setCurrentUserId] = useState(function() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return list.length ? list[0].id : null;
    } catch (e) {
      return null;
    }
  });

  var [form, setForm] = useState({
    name: "",
    gender: "男性",
    age: ""
  });

  var [error, setError] = useState("");

  useEffect(function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

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

    var new_user = {
      id: Date.now(),
      name: name,
      gender: form.gender,
      age: age_num,
      created_at: new Date().toLocaleString("ja-JP")
    };

    setProfiles(function(prev) {
      return [new_user].concat(prev);
    });
    setCurrentUserId(new_user.id);
    resetForm();
  }

  function handleLogin(id) {
    setCurrentUserId(id);
  }

  function handleDelete(id) {
    setProfiles(function(prev) {
      var next = prev.filter(function(item) {
        return item.id !== id;
      });
      if (current_user_id === id) {
        setCurrentUserId(next.length ? next[0].id : null);
      }
      return next;
    });
  }

  var current_user = asArray(profiles).find(function(item) {
    return item.id === current_user_id;
  }) || null;

  var total_users = asArray(profiles).length;
  var male_count = asArray(profiles).filter(function(item) {
    return item.gender === "男性";
  }).length;
  var female_count = asArray(profiles).filter(function(item) {
    return item.gender === "女性";
  }).length;
  var other_count = asArray(profiles).filter(function(item) {
    return item.gender === "その他";
  }).length;
  var avg_age = total_users
    ? (asArray(profiles).reduce(function(sum, item) {
        return sum + Number(item.age || 0);
      }, 0) / total_users).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">👤 ユーザー情報ログインアプリ</h1>
          <p className="text-sm text-slate-500 mt-2">
            名前・性別・年齢を登録して、簡単なログインと統計表示ができます。
          </p>
        </div>

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
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">性別</label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  value={form.gender}
                  onChange={function(e) { handleChange("gender", e.target.value); }}
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
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  ❌ {error}
                </div>
              )}

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium"
                onClick={handleRegister}
              >
                登録してログイン
              </button>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-4">🔐 ログイン中のユーザー</h2>

            {current_user ? (
              <div className="space-y-3">
                <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4">
                  <div className="text-sm font-semibold mb-2">✅ ログイン成功</div>
                  <div className="text-sm">姓名: {current_user.name}</div>
                  <div className="text-sm">性別: {current_user.gender}</div>
                  <div className="text-sm">年齢: {current_user.age}歳</div>
                  <div className="text-xs text-slate-500 mt-2">登録日時: {current_user.created_at}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">まだログイン中のユーザーはいません</div>
            )}
          </section>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-6">
          <h2 className="text-sm font-semibold mb-4">📊 統計情報</h2>

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
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mt-6">
          <h2 className="text-sm font-semibold mb-4">👥 ユーザー一覧</h2>

          {total_users === 0 ? (
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
                        className="px-3 py-2 text-xs rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={function() { handleLogin(user.id); }}
                      >
                        このユーザーでログイン
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