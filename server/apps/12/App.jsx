function asArray(v) { return Array.isArray(v) ? v : []; }

var API_BASE = "";

function apiGet(path) {
  return fetch(API_BASE + path).then(function(r) {
    if (!r.ok) throw new Error("API error " + r.status);
    return r.json();
  });
}

function apiSend(path, method, body) {
  return fetch(API_BASE + path, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (!r.ok) throw new Error("API error " + r.status);
    return r.json();
  });
}

function apiDelete(path) {
  return fetch(API_BASE + path, { method: "DELETE" }).then(function(r) {
    if (!r.ok) throw new Error("API error " + r.status);
    return r.json();
  });
}

function App() {
  var [users, setUsers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [name, setName] = useState("");
  var [gender, setGender] = useState("男性");
  var [age, setAge] = useState("");
  var [view, setView] = useState("list");
  var [editId, setEditId] = useState(null);
  var [stats, setStats] = useState(null);

  function loadUsers() {
    return apiGet("/api/users").then(function(data) {
      setUsers(asArray(data));
    });
  }

  function loadStats() {
    return apiGet("/api/users/stats").then(function(data) {
      setStats(data);
    });
  }

  useEffect(function() {
    setLoading(true);
    Promise.all([loadUsers(), loadStats()]).then(function() {
      setLoading(false);
    }).catch(function() {
      setLoading(false);
    });
  }, []);

  function refreshAll() {
    return Promise.all([loadUsers(), loadStats()]);
  }

  function handleSubmit() {
    if (!name.trim() || !age) return;
    var ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) return;
    var body = { name: name.trim(), gender: gender, age: ageNum };

    if (editId !== null) {
      apiSend("/api/users/" + editId, "PUT", body).then(function() {
        setEditId(null);
        setName(""); setGender("男性"); setAge("");
        return refreshAll();
      });
    } else {
      apiSend("/api/users", "POST", body).then(function() {
        setName(""); setGender("男性"); setAge("");
        return refreshAll();
      });
    }
  }

  function handleEdit(u) {
    setEditId(u.id);
    setName(u.name);
    setGender(u.gender);
    setAge(String(u.age));
    setView("list");
  }

  function handleDelete(id) {
    apiDelete("/api/users/" + id).then(function() {
      if (editId === id) { setEditId(null); setName(""); setGender("男性"); setAge(""); }
      return refreshAll();
    });
  }

  function handleCancel() {
    setEditId(null); setName(""); setGender("男性"); setAge("");
  }

  var safeUsers = asArray(users);

  var COLORS = ["#3b82f6", "#ec4899", "#a78bfa"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  var safeStats = stats || { total: 0, maleCount: 0, femaleCount: 0, otherCount: 0, avgAge: 0, maxAge: 0, minAge: 0, ageGroups: [], genderData: [] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">👤 ユーザー登録管理</h1>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              className={"px-4 py-1.5 rounded-md text-sm font-medium transition-all " + (view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              onClick={function() { setView("list"); }}
            >📋 一覧</button>
            <button
              className={"px-4 py-1.5 rounded-md text-sm font-medium transition-all " + (view === "stats" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              onClick={function() { setView("stats"); }}
            >📊 統計</button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{editId !== null ? "✏️ ユーザー編集" : "➕ 新規ユーザー登録"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">氏名</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                value={name} onChange={function(e) { setName(e.target.value); }}
                placeholder="山田太郎"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">性別</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={gender} onChange={function(e) { setGender(e.target.value); }}
              >
                <option value="男性">男性</option>
                <option value="女性">女性</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">年齢</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                type="number" min="0" max="150"
                value={age} onChange={function(e) { setAge(e.target.value); }}
                placeholder="25"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                onClick={handleSubmit}
                disabled={!name.trim() || !age}
              >{editId !== null ? "更新" : "登録"}</button>
              {editId !== null && (
                <button className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors" onClick={handleCancel}>取消</button>
              )}
            </div>
          </div>
        </div>

        {view === "list" && (
          <div>
            {safeUsers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-slate-400 text-sm">まだユーザーが登録されていません</p>
                <p className="text-slate-300 text-xs mt-1">上のフォームから登録してください</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">登録ユーザー</span>
                  <span className="text-xs text-slate-400">{safeUsers.length + "件"}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {safeUsers.map(function(u) {
                    var genderEmoji = u.gender === "男性" ? "🙋‍♂️" : u.gender === "女性" ? "🙋‍♀️" : "🧑";
                    var genderColor = u.gender === "男性" ? "bg-blue-50 text-blue-700" : u.gender === "女性" ? "bg-pink-50 text-pink-700" : "bg-purple-50 text-purple-700";
                    return (
                      <div key={u.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-lg">{genderEmoji}</div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.age + "歳"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + genderColor}>{u.gender}</span>
                          <button className="text-xs text-slate-400 hover:text-blue-600 transition-colors" onClick={function() { handleEdit(u); }}>編集</button>
                          <button className="text-xs text-slate-400 hover:text-red-500 transition-colors" onClick={function() { handleDelete(u.id); }}>削除</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {view === "stats" && (
          <div>
            {safeStats.total === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-slate-400 text-sm">統計を表示するにはユーザーを登録してください</p>
              </div>
            ) : (
              <div>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="text-xs text-slate-400 mb-1">総登録数</div>
                    <div className="text-2xl font-bold text-slate-800">{safeStats.total}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="text-xs text-slate-400 mb-1">平均年齢</div>
                    <div className="text-2xl font-bold text-blue-600">{safeStats.avgAge + "歳"}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="text-xs text-slate-400 mb-1">最年少</div>
                    <div className="text-2xl font-bold text-emerald-600">{safeStats.minAge + "歳"}</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="text-xs text-slate-400 mb-1">最年長</div>
                    <div className="text-2xl font-bold text-amber-600">{safeStats.maxAge + "歳"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gender Distribution */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">性別分布</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={asArray(safeStats.genderData)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={function(entry) { return entry.name + " " + entry.value + "人"; }}>
                          {asArray(safeStats.genderData).map(function(entry, i) {
                            return <Cell key={i} fill={COLORS[i % COLORS.length]} />;
                          })}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      <span className="text-xs text-slate-500">🙋‍♂️ 男性 {safeStats.maleCount + "人"}</span>
                      <span className="text-xs text-slate-500">🙋‍♀️ 女性 {safeStats.femaleCount + "人"}</span>
                      {safeStats.otherCount > 0 && <span className="text-xs text-slate-500">🧑 その他 {safeStats.otherCount + "人"}</span>}
                    </div>
                  </div>

                  {/* Age Distribution */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">年齢分布</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={asArray(safeStats.ageGroups)} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="人数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}