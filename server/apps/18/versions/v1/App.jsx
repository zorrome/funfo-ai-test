function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "users";
  var [users, setUsers] = useState([]);
  var [form, setForm] = useState({
    name: "",
    gender: "male",
    age: ""
  });
  var [editingId, setEditingId] = useState(null);
  var [error, setError] = useState("");

  useEffect(function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        setUsers(asArray(parsed));
      }
    } catch (e) {
      setUsers([]);
    }
  }, []);

  useEffect(function () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

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

  function handleSubmit() {
    var msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    var payload = {
      id: editingId || Date.now(),
      name: form.name.trim(),
      gender: form.gender,
      age: Number(form.age),
      created_at: Date.now()
    };

    if (editingId) {
      setUsers(function (prev) {
        return asArray(prev).map(function (item) {
          return item.id === editingId
            ? {
                id: item.id,
                name: payload.name,
                gender: payload.gender,
                age: payload.age,
                created_at: item.created_at
              }
            : item;
        });
      });
    } else {
      setUsers(function (prev) {
        return asArray(prev).concat([payload]);
      });
    }

    resetForm();
  }

  function handleEdit(user) {
    setForm({
      name: user.name,
      gender: user.gender,
      age: String(user.age)
    });
    setEditingId(user.id);
    setError("");
  }

  function handleDelete(id) {
    setUsers(function (prev) {
      return asArray(prev).filter(function (item) {
        return item.id !== id;
      });
    });
    if (editingId === id) resetForm();
  }

  function countByGender(gender) {
    return asArray(users).filter(function (item) {
      return item.gender === gender;
    }).length;
  }

  function averageAge() {
    if (!users.length) return 0;
    var total = asArray(users).reduce(function (sum, item) {
      return sum + Number(item.age || 0);
    }, 0);
    return Math.round((total / users.length) * 10) / 10;
  }

  function minAge() {
    if (!users.length) return 0;
    return Math.min.apply(null, asArray(users).map(function (item) { return Number(item.age || 0); }));
  }

  function maxAge() {
    if (!users.length) return 0;
    return Math.max.apply(null, asArray(users).map(function (item) { return Number(item.age || 0); }));
  }

  function genderLabel(gender) {
    if (gender === "male") return "男性";
    if (gender === "female") return "女性";
    return "その他";
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
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">性別</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                  value={form.gender}
                  onChange={function (e) { updateForm("gender", e.target.value); }}
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
                />
              </div>

              {error && (
                <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  ❌ {error}
                </div>
              )}

              <button
                className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-sm hover:bg-slate-800"
                onClick={handleSubmit}
              >
                {editingId ? "更新する" : "登録する"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">📊 総人数</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{users.length}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">👨 男性</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{countByGender("male")}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">👩 女性</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{countByGender("female")}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">🧮 平均年齢</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{averageAge()}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">🎯 年齢範囲</div>
                <div className="text-sm font-semibold text-slate-900 mt-3">
                  {users.length ? minAge() + "〜" + maxAge() : "-"}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">📋 登録ユーザー一覧</h2>
                <span className="text-xs text-slate-400">ローカル保存対応</span>
              </div>

              {users.length === 0 ? (
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
                          >
                            編集
                          </button>
                          <button
                            className="px-3 py-2 text-xs rounded-xl border border-red-200 text-red-500 hover:bg-red-50"
                            onClick={function () { handleDelete(user.id); }}
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

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">📈 統計サマリー</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  最も多い性別:
                  <span className="font-semibold text-slate-900 ml-1">
                    {countByGender("male") === 0 && countByGender("female") === 0 && countByGender("other") === 0
                      ? "-"
                      : (
                          countByGender("male") >= countByGender("female") &&
                          countByGender("male") >= countByGender("other")
                        )
                        ? "男性"
                        : (
                            countByGender("female") >= countByGender("male") &&
                            countByGender("female") >= countByGender("other")
                          )
                        ? "女性"
                        : "その他"}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  20歳未満:
                  <span className="font-semibold text-slate-900 ml-1">
                    {asArray(users).filter(function (u) { return Number(u.age) < 20; }).length}人
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  20歳以上:
                  <span className="font-semibold text-slate-900 ml-1">
                    {asArray(users).filter(function (u) { return Number(u.age) >= 20; }).length}人
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