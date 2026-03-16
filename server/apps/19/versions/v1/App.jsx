function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "users";
  var SESSION_KEY = "current_user_id";

  var [users, setUsers] = useState(function() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return asArray(parsed);
    } catch (e) {
      return [];
    }
  });

  var [current_user_id, setCurrentUserId] = useState(function() {
    return localStorage.getItem(SESSION_KEY) || "";
  });

  var [name, setName] = useState("");
  var [gender, setGender] = useState("male");
  var [age, setAge] = useState("");
  var [error, setError] = useState("");

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

  var currentUser = useMemo(function() {
    return asArray(users).find(function(user) {
      return String(user.id) === String(current_user_id);
    }) || null;
  }, [users, current_user_id]);

  var stats = useMemo(function() {
    var list = asArray(users);
    var total = list.length;
    var male_count = list.filter(function(user) { return user.gender === "male"; }).length;
    var female_count = list.filter(function(user) { return user.gender === "female"; }).length;
    var other_count = list.filter(function(user) { return user.gender === "other"; }).length;
    var age_sum = list.reduce(function(sum, user) {
      return sum + (Number(user.age) || 0);
    }, 0);
    var avg_age = total > 0 ? Math.round((age_sum / total) * 10) / 10 : 0;
    var adults = list.filter(function(user) { return Number(user.age) >= 18; }).length;
    var minors = list.filter(function(user) { return Number(user.age) < 18; }).length;

    return {
      total: total,
      male_count: male_count,
      female_count: female_count,
      other_count: other_count,
      avg_age: avg_age,
      adults: adults,
      minors: minors
    };
  }, [users]);

  function resetForm() {
    setName("");
    setGender("male");
    setAge("");
    setError("");
  }

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

    var matched = asArray(users).find(function(user) {
      return (
        user.name === cleanName &&
        user.gender === gender &&
        Number(user.age) === ageNumber
      );
    });

    if (matched) {
      setCurrentUserId(String(matched.id));
      setError("");
      resetForm();
      return;
    }

    var newUser = {
      id: Date.now(),
      name: cleanName,
      gender: gender,
      age: ageNumber,
      created_at: new Date().toISOString()
    };

    var nextUsers = asArray(users).concat([newUser]);
    setUsers(nextUsers);
    setCurrentUserId(String(newUser.id));
    setError("");
    resetForm();
  }

  function handleLogout() {
    setCurrentUserId("");
  }

  function handleDeleteUser(id) {
    var ok = window.confirm("このユーザーを削除しますか？");
    if (!ok) return;

    var nextUsers = asArray(users).filter(function(user) {
      return user.id !== id;
    });

    setUsers(nextUsers);

    if (String(current_user_id) === String(id)) {
      setCurrentUserId("");
    }
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
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">性別</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                  value={gender}
                  onChange={function(e) { setGender(e.target.value); }}
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
                />
              </div>

              {error && (
                <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  ❌ {error}
                </div>
              )}

              <button
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm font-medium"
                onClick={handleLogin}
              >
                ログイン / 登録
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
                    className="mt-4 w-full bg-white border border-slate-200 hover:bg-slate-100 rounded-xl px-4 py-2 text-sm"
                    onClick={handleLogout}
                  >
                    ログアウト
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
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📊</span>
                <h2 className="text-sm font-semibold text-slate-900">ユーザー統計</h2>
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
                    var active = String(current_user_id) === String(user.id);

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
                            className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50"
                            onClick={function() { handleDeleteUser(user.id); }}
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
      </div>
    </div>
  );
}