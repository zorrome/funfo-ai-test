function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "users";
  var [users, setUsers] = useState([]);
  var [name, setName] = useState("");
  var [gender, setGender] = useState("male");
  var [age, setAge] = useState("");
  var [message, setMessage] = useState("");

  useEffect(function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        setUsers(asArray(parsed));
      }
    } catch (e) {
      setUsers([]);
    }
  }, []);

  useEffect(function () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  function resetForm() {
    setName("");
    setGender("male");
    setAge("");
  }

  function handleLogin() {
    var trimmedName = name.trim();
    var ageNumber = Number(age);

    if (!trimmedName) {
      setMessage("⚠️ 名前を入力してください");
      return;
    }

    if (!age || isNaN(ageNumber) || ageNumber <= 0) {
      setMessage("⚠️ 正しい年齢を入力してください");
      return;
    }

    var newUser = {
      id: Date.now(),
      name: trimmedName,
      gender: gender,
      age: ageNumber,
      created_at: new Date().toISOString()
    };

    setUsers(function (prev) {
      return [newUser].concat(prev);
    });
    setMessage("✅ ログイン情報を登録しました");
    resetForm();
  }

  function handleDelete(id) {
    setUsers(function (prev) {
      return prev.filter(function (item) {
        return item.id !== id;
      });
    });
  }

  var totalCount = users.length;

  var maleCount = users.filter(function (item) {
    return item.gender === "male";
  }).length;

  var femaleCount = users.filter(function (item) {
    return item.gender === "female";
  }).length;

  var otherCount = users.filter(function (item) {
    return item.gender === "other";
  }).length;

  var averageAge = totalCount > 0
    ? (users.reduce(function (sum, item) {
        return sum + Number(item.age || 0);
      }, 0) / totalCount).toFixed(1)
    : "0.0";

  var adultCount = users.filter(function (item) {
    return Number(item.age) >= 18;
  }).length;

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
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1">性別</label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  value={gender}
                  onChange={function (e) { setGender(e.target.value); }}
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
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
                >
                  ✅ ログイン登録
                </button>
                <button
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl"
                >
                  リセット
                </button>
              </div>

              {message ? (
                <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  {message}
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-800">📊 統計表示</h2>
              <p className="text-xs text-slate-500 mt-1">
                登録されたユーザー情報の集計です。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="text-xs text-slate-500">登録人数</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="text-xs text-slate-500">平均年齢</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{averageAge}</div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="text-xs text-slate-500">男性</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">{maleCount}</div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="text-xs text-slate-500">女性</div>
                <div className="text-2xl font-bold text-pink-600 mt-1">{femaleCount}</div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">その他 / 成人数</div>
                    <div className="text-sm text-slate-700 mt-1">
                      その他: <span className="font-semibold">{otherCount}</span> / 18歳以上: <span className="font-semibold">{adultCount}</span>
                    </div>
                  </div>
                  <div className="text-2xl">📈</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-800">📋 登録ユーザー一覧</h2>
            <p className="text-xs text-slate-500 mt-1">
              登録済みユーザーの情報を一覧で確認できます。
            </p>
          </div>

          {users.length === 0 ? (
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
                    </div>
                    <button
                      onClick={function () { handleDelete(user.id); }}
                      className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl"
                    >
                      🗑️ 削除
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