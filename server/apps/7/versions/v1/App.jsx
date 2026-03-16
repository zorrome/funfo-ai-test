function App() {
  const STORAGE_KEY = 'funfo-user-login-app';

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  const [form, setForm] = useState({
    name: '',
    gender: '男性',
    age: ''
  });
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
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
      return { ...prev, [key]: value };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    var name = form.name.trim();
    var ageNumber = Number(form.age);

    if (!name) {
      setError('氏名を入力してください。');
      return;
    }

    if (!form.age || Number.isNaN(ageNumber) || ageNumber <= 0) {
      setError('年齢は正しい数字で入力してください。');
      return;
    }

    var newUser = {
      id: Date.now(),
      name: name,
      gender: form.gender,
      age: ageNumber,
      createdAt: new Date().toLocaleString('ja-JP')
    };

    setUsers(function (prev) {
      return [newUser].concat(asArray(prev));
    });

    setForm({
      name: '',
      gender: '男性',
      age: ''
    });
  }

  function deleteUser(id) {
    setUsers(function (prev) {
      return asArray(prev).filter(function (item) {
        return item.id !== id;
      });
    });
  }

  function clearAll() {
    setUsers([]);
  }

  const stats = useMemo(function () {
    var list = asArray(users);
    var total = list.length;
    var male = list.filter(function (item) {
      return item.gender === '男性';
    }).length;
    var female = list.filter(function (item) {
      return item.gender === '女性';
    }).length;
    var other = list.filter(function (item) {
      return item.gender === 'その他';
    }).length;
    var averageAge = total
      ? Math.round(
          list.reduce(function (sum, item) {
            return sum + Number(item.age || 0);
          }, 0) / total
        )
      : 0;
    var adult = list.filter(function (item) {
      return Number(item.age) >= 18;
    }).length;

    return {
      total: total,
      male: male,
      female: female,
      other: other,
      averageAge: averageAge,
      adult: adult
    };
  }, [users]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            👤 ユーザー情報ログインアプリ
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">ユーザー登録と簡単統計</h1>
          <p className="mt-2 text-sm text-slate-600">
            氏名・性別・年齢を登録して、人数や平均年齢をすぐ確認できます。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📝</span>
                <h2 className="text-sm font-semibold">ユーザー情報入力</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    氏名
                  </label>
                  <input
                    value={form.name}
                    onChange={function (e) {
                      updateForm('name', e.target.value);
                    }}
                    placeholder="例: 山田 太郎"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    性別
                  </label>
                  <select
                    value={form.gender}
                    onChange={function (e) {
                      updateForm('gender', e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 bg-white"
                  >
                    <option value="男性">男性</option>
                    <option value="女性">女性</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    年齢
                  </label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={function (e) {
                      updateForm('age', e.target.value);
                    }}
                    placeholder="例: 28"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    ❌ {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium hover:bg-slate-800 transition"
                >
                  ログイン登録する
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">登録人数</div>
                <div className="mt-2 text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">平均年齢</div>
                <div className="mt-2 text-2xl font-bold">{stats.averageAge}歳</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">成人人数</div>
                <div className="mt-2 text-2xl font-bold">{stats.adult}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">男性</div>
                <div className="mt-2 text-xl font-bold">{stats.male}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">女性</div>
                <div className="mt-2 text-xl font-bold">{stats.female}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">その他</div>
                <div className="mt-2 text-xl font-bold">{stats.other}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold">登録ユーザー一覧</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    最新の登録順で表示しています。
                  </p>
                </div>
                <button
                  onClick={clearAll}
                  disabled={stats.total === 0}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🗑️ 全件クリア
                </button>
              </div>

              {stats.total === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <div className="text-3xl mb-2">📭</div>
                  <div className="text-sm font-medium">まだ登録データがありません</div>
                  <div className="text-xs text-slate-500 mt-1">
                    左側のフォームから最初のユーザーを登録してください。
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {asArray(users).map(function (user, index) {
                    return (
                      <div
                        key={user.id}
                        className="rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{user.name}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              性別: {user.gender} ・ 年齢: {user.age}歳
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              登録日時: {user.createdAt}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={function () {
                            deleteUser(user.id);
                          }}
                          className="self-start md:self-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100"
                        >
                          削除
                        </button>
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