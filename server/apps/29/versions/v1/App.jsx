function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "users";
  var SESSION_KEY = "current_user_id";

  var [users, setUsers] = useState([]);
  var [current_user_id, setCurrentUserId] = useState("");
  var [form, setForm] = useState({
    name: "",
    gender: "male",
    age: ""
  });
  var [error, setError] = useState("");

  useEffect(function() {
    try {
      var savedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      var savedSession = localStorage.getItem(SESSION_KEY) || "";
      setUsers(asArray(savedUsers));
      setCurrentUserId(savedSession);
    } catch (e) {
      setUsers([]);
      setCurrentUserId("");
    }
  }, []);

  useEffect(function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(function() {
    if (current_user_id) {
      localStorage.setItem(SESSION_KEY, current_user_id);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [current_user_id]);

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

  function handleRegister() {
    var name = form.name.trim();
    var age_num = Number(form.age);

    if (!name) {
      setError("姓名を入力してください");
      return;
    }

    if (!form.age || isNaN(age_num) || age_num <= 0) {
      setError("正しい年齢を入力してください");
      return;
    }

    var new_user = {
      id: String(Date.now()),
      name: name,
      gender: form.gender,
      age: age_num,
      created_at: new Date().toISOString()
    };

    setUsers(function(prev) {
      return prev.concat([new_user]);
    });
    setCurrentUserId(new_user.id);
    resetForm();
  }

  function handleLogin(user_id) {
    setCurrentUserId(user_id);
  }

  function handleLogout() {
    setCurrentUserId("");
  }

  function handleDelete(user_id) {
    var nextUsers = asArray(users).filter(function(user) {
      return user.id !== user_id;
    });
    setUsers(nextUsers);
    if (current_user_id === user_id) {
      setCurrentUserId("");
    }
  }

  var currentUser = asArray(users).find(function(user) {
    return user.id === current_user_id;
  }) || null;

  var total_users = asArray(users).length;
  var male_count = asArray(users).filter(function(user) {
    return user.gender === "male";
  }).length;
  var female_count = asArray(users).filter(function(user) {
    return user.gender === "female";
  }).length;
  var other_count = asArray(users).filter(function(user) {
    return user.gender === "other";
  }).length;
  var average_age = total_users > 0
    ? (asArray(users).reduce(function(sum, user) {
        return sum + Number(user.age || 0);
      }, 0) / total_users).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 mb-3">
            <span>👤</span>
            <span>シンプルなユーザー情報ログインアプリ</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">ユーザー情報ログイン</h1>
          <p className="text-sm text-slate-500">
            名前・性別・年齢で登録して、そのままログイン。下で簡単な統計も確認できます。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">📝</span>
              <h2 className="text-sm font-semibold">ユーザー登録</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">姓名</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form.name}
                  onChange={function(e) { updateForm("name", e.target.value); }}
                  placeholder="例:田中 太郎"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">性別</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                  value={form.gender}
                  onChange={function(e) { updateForm("gender", e.target.value); }}
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form.age}
                  onChange={function(e) { updateForm("age", e.target.value); }}
                  placeholder="例:28"
                />
              </div>

              {error ? (
                <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  ❌ {error}
                </div>
              ) : null}

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
                onClick={handleRegister}
              >
                登録してログイン
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">🔐</span>
              <h2 className="text-sm font-semibold">現在のログイン状態</h2>
            </div>

            {currentUser ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs text-emerald-600 mb-1">ログイン中</div>
                  <div className="text-sm font-semibold mb-2">{currentUser.name}</div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-slate-600">
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-slate-400 mb-1">性別</div>
                      <div className="text-sm font-medium">
                        {currentUser.gender === "male" ? "男性" : currentUser.gender === "female" ? "女性" : "その他"}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-slate-400 mb-1">年齢</div>
                      <div className="text-sm font-medium">{currentUser.age}歳</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-slate-400 mb-1">状態</div>
                      <div className="text-sm font-medium">利用中</div>
                    </div>
                  </div>
                </div>

                <button
                  className="w-full bg-slate-900 hover:bg-black text-white rounded-xl px-4 py-2.5 text-sm"
                  onClick={handleLogout}
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <div className="text-3xl mb-2">🙂</div>
                <div className="text-sm font-medium mb-1">まだログインしていません</div>
                <div className="text-xs text-slate-500">
                  左のフォームから登録するか、下の一覧からログインしてください。
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">📊</span>
            <h2 className="text-sm font-semibold">簡単な統計</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs text-slate-500 mb-1">登録人数</div>
              <div className="text-2xl font-bold">{total_users}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs text-slate-500 mb-1">男性</div>
              <div className="text-2xl font-bold">{male_count}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs text-slate-500 mb-1">女性</div>
              <div className="text-2xl font-bold">{female_count}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="text-xs text-slate-500 mb-1">平均年齢</div>
              <div className="text-2xl font-bold">{average_age}</div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 p-4 bg-slate-50">
            <div className="text-xs text-slate-500 mb-2">性別内訳</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">男性 {male_count}人</div>
              <div className="px-3 py-1.5 rounded-full bg-pink-100 text-pink-700">女性 {female_count}人</div>
              <div className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700">その他 {other_count}人</div>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">📋</span>
            <h2 className="text-sm font-semibold">登録ユーザー一覧</h2>
          </div>

          {total_users === 0 ? (
            <div className="text-sm text-slate-400 py-8 text-center">
              まだユーザーが登録されていません
            </div>
          ) : (
            <div className="space-y-3">
              {asArray(users).map(function(user) {
                var isCurrent = current_user_id === user.id;
                return (
                  <div
                    key={user.id}
                    className={"rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 " + (isCurrent ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white")}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold">{user.name}</div>
                        {isCurrent ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white">ログイン中</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-500">
                        性別:
                        {user.gender === "male" ? "男性" : user.gender === "female" ? "女性" : "その他"}
                        {" / "}年齢:{user.age}歳
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isCurrent ? (
                        <button
                          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          onClick={function() { handleLogin(user.id); }}
                        >
                          ログイン
                        </button>
                      ) : (
                        <button
                          className="px-3 py-2 rounded-xl bg-slate-800 text-white text-sm"
                          onClick={handleLogout}
                        >
                          ログアウト
                        </button>
                      )}

                      <button
                        className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm border border-red-200"
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
        </div>
      </div>
    </div>
  );
}