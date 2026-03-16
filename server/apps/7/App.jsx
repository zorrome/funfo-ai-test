function App() {
  var API_BASE =
    typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : '';

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function apiGet(path) {
    return fetch(API_BASE + path, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    }).then(function (response) {
      return response.json().catch(function () {
        return null;
      }).then(function (data) {
        if (!response.ok) {
          var message =
            data && data.error
              ? data.error
              : 'データの取得に失敗しました。';
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
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body || {})
    }).then(function (response) {
      return response.json().catch(function () {
        return null;
      }).then(function (data) {
        if (!response.ok) {
          var message =
            data && data.error
              ? data.error
              : '操作に失敗しました。';
          throw new Error(message);
        }
        return data;
      });
    });
  }

  function apiDelete(path) {
    return fetch(API_BASE + path, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json'
      }
    }).then(function (response) {
      return response.json().catch(function () {
        return null;
      }).then(function (data) {
        if (!response.ok) {
          var message =
            data && data.error
              ? data.error
              : '削除に失敗しました。';
          throw new Error(message);
        }
        return data;
      });
    });
  }

  const [form, setForm] = useState({
    name: '',
    gender: '男性',
    age: ''
  });
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    other: 0,
    average_age: 0,
    adult: 0
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = useCallback(function () {
    return apiGet('/api/users').then(function (data) {
      var list = asArray(data && data.users);
      setUsers(list);
      return list;
    });
  }, []);

  const loadStats = useCallback(function (options) {
    var shouldShowRefreshing = !(options && options.silent);
    if (shouldShowRefreshing) {
      setRefreshingStats(true);
    }

    return apiGet('/api/users/stats')
      .then(function (data) {
        var nextStats = data && data.stats ? data.stats : data;
        setStats({
          total: Number(nextStats && nextStats.total) || 0,
          male: Number(nextStats && nextStats.male) || 0,
          female: Number(nextStats && nextStats.female) || 0,
          other: Number(nextStats && nextStats.other) || 0,
          average_age: Number(nextStats && nextStats.average_age) || 0,
          adult: Number(nextStats && nextStats.adult) || 0
        });
      })
      .finally(function () {
        if (shouldShowRefreshing) {
          setRefreshingStats(false);
        }
      });
  }, []);

  const loadDashboard = useCallback(function () {
    setLoading(true);
    setError('');

    return Promise.all([loadUsers(), loadStats({ silent: true })])
      .catch(function (e) {
        setError(e && e.message ? e.message : '初期データの取得に失敗しました。');
      })
      .finally(function () {
        setLoading(false);
      });
  }, [loadUsers, loadStats]);

  useEffect(function () {
    loadDashboard();
  }, [loadDashboard]);

  function updateForm(key, value) {
    setForm(function (prev) {
      return { ...prev, [key]: value };
    });
  }

  function resetForm() {
    setForm({
      name: '',
      gender: '男性',
      age: ''
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

    if (!form.age || Number.isNaN(ageNumber) || ageNumber <= 0 || Math.floor(ageNumber) !== ageNumber) {
      setError('年齢は1以上の整数で入力してください。');
      return;
    }

    setSubmitting(true);

    apiSend('/api/users', 'POST', {
      name: name,
      gender: form.gender,
      age: ageNumber
    })
      .then(function () {
        resetForm();
        return Promise.all([loadUsers(), loadStats({ silent: true })]);
      })
      .catch(function (e) {
        setError(e && e.message ? e.message : '登録に失敗しました。');
      })
      .finally(function () {
        setSubmitting(false);
      });
  }

  function deleteUser(id) {
    setError('');
    setDeletingId(id);

    apiDelete('/api/users/' + id)
      .then(function () {
        return Promise.all([loadUsers(), loadStats({ silent: true })]);
      })
      .catch(function (e) {
        setError(e && e.message ? e.message : '削除に失敗しました。');
      })
      .finally(function () {
        setDeletingId(null);
      });
  }

  function clearAll() {
    if (stats.total === 0 || clearing) {
      return;
    }

    setError('');
    setClearing(true);

    apiDelete('/api/users')
      .then(function () {
        return Promise.all([loadUsers(), loadStats({ silent: true })]);
      })
      .catch(function (e) {
        setError(e && e.message ? e.message : '全件クリアに失敗しました。');
      })
      .finally(function () {
        setClearing(false);
      });
  }

  function formatCreatedAt(value) {
    if (!value) {
      return '—';
    }

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString('ja-JP');
  }

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
                    min="1"
                    step="1"
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
                  disabled={submitting}
                  className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? '登録中...' : 'ログイン登録する'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">登録人数</div>
                <div className="mt-2 text-2xl font-bold">
                  {refreshingStats && !loading ? '...' : stats.total}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">平均年齢</div>
                <div className="mt-2 text-2xl font-bold">
                  {refreshingStats && !loading ? '...' : stats.average_age + '歳'}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">成人人数</div>
                <div className="mt-2 text-2xl font-bold">
                  {refreshingStats && !loading ? '...' : stats.adult}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">男性</div>
                <div className="mt-2 text-xl font-bold">
                  {refreshingStats && !loading ? '...' : stats.male}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">女性</div>
                <div className="mt-2 text-xl font-bold">
                  {refreshingStats && !loading ? '...' : stats.female}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">その他</div>
                <div className="mt-2 text-xl font-bold">
                  {refreshingStats && !loading ? '...' : stats.other}
                </div>
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
                  disabled={stats.total === 0 || clearing || loading}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {clearing ? 'クリア中...' : '🗑️ 全件クリア'}
                </button>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <div className="text-3xl mb-2">⏳</div>
                  <div className="text-sm font-medium">登録データを読み込んでいます</div>
                  <div className="text-xs text-slate-500 mt-1">
                    サーバーから最新の情報を取得中です。
                  </div>
                </div>
              ) : stats.total === 0 ? (
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
                              登録日時: {formatCreatedAt(user.created_at || user.createdAt)}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={function () {
                            deleteUser(user.id);
                          }}
                          disabled={deletingId === user.id}
                          className="self-start md:self-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === user.id ? '削除中...' : '削除'}
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