function asArray(v) { return Array.isArray(v) ? v : []; }

var API_BASE = "";

function apiGet(path) {
  return fetch(API_BASE + path).then(function(r) {
    if (!r.ok) throw new Error("API error: " + r.status);
    return r.json();
  });
}

function apiSend(path, method, body) {
  return fetch(API_BASE + path, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (!r.ok) throw new Error("API error: " + r.status);
    return r.json();
  });
}

function apiDelete(path) {
  return fetch(API_BASE + path, { method: "DELETE" }).then(function(r) {
    if (!r.ok) throw new Error("API error: " + r.status);
    return r.json();
  });
}

function App() {
  var [users, setUsers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [name, setName] = useState("");
  var [gender, setGender] = useState("男性");
  var [age, setAge] = useState("");
  var [view, setView] = useState("register");
  var [editId, setEditId] = useState(null);
  var [editName, setEditName] = useState("");
  var [editGender, setEditGender] = useState("男性");
  var [editAge, setEditAge] = useState("");
  var [toast, setToast] = useState("");
  var [stats, setStats] = useState(null);

  function fetchUsers() {
    return apiGet("/api/users").then(function(data) {
      setUsers(asArray(data));
    }).catch(function() {
      setToast("⚠️ データの取得に失敗しました");
    });
  }

  function fetchStats() {
    return apiGet("/api/users/stats").then(function(data) {
      setStats(data);
    }).catch(function() {
      setStats(null);
    });
  }

  useEffect(function() {
    setLoading(true);
    Promise.all([fetchUsers(), fetchStats()]).then(function() {
      setLoading(false);
    });
  }, []);

  useEffect(function() {
    if (view === "stats") {
      fetchStats();
    }
  }, [view, users]);

  useEffect(function() {
    if (toast) {
      var t = setTimeout(function() { setToast(""); }, 2000);
      return function() { clearTimeout(t); };
    }
  }, [toast]);

  function handleRegister() {
    if (!name.trim()) { setToast("⚠️ 名前を入力してください"); return; }
    var ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 0 || ageNum > 150) { setToast("⚠️ 正しい年齢を入力してください"); return; }
    apiSend("/api/users", "POST", { name: name.trim(), gender: gender, age: ageNum })
      .then(function() {
        setName(""); setGender("男性"); setAge("");
        setToast("✅ 登録しました");
        return fetchUsers();
      })
      .catch(function() { setToast("⚠️ 登録に失敗しました"); });
  }

  function handleDelete(id) {
    apiDelete("/api/users/" + id)
      .then(function() {
        if (editId === id) setEditId(null);
        setToast("🗑️ 削除しました");
        return fetchUsers();
      })
      .catch(function() { setToast("⚠️ 削除に失敗しました"); });
  }

  function startEdit(u) {
    setEditId(u.id); setEditName(u.name); setEditGender(u.gender); setEditAge(String(u.age));
  }

  function saveEdit() {
    if (!editName.trim()) { setToast("⚠️ 名前を入力してください"); return; }
    var ageNum = parseInt(editAge, 10);
    if (!editAge || isNaN(ageNum) || ageNum < 0 || ageNum > 150) { setToast("⚠️ 正しい年齢を入力してください"); return; }
    apiSend("/api/users/" + editId, "PUT", { name: editName.trim(), gender: editGender, age: ageNum })
      .then(function() {
        setEditId(null);
        setToast("✅ 更新しました");
        return fetchUsers();
      })
      .catch(function() { setToast("⚠️ 更新に失敗しました"); });
  }

  var safeUsers = asArray(users);

  var displayStats = stats || { total: 0, male: 0, female: 0, other: 0, avgAge: 0, minAge: 0, maxAge: 0, ageGroups: [] };

  var genderData = [
    { name: "男性", value: displayStats.male, color: "#3b82f6" },
    { name: "女性", value: displayStats.female, color: "#ec4899" },
    { name: "その他", value: displayStats.other, color: "#8b5cf6" }
  ].filter(function(d) { return d.value > 0; });

  var ageChartData = asArray(displayStats.ageGroups).filter(function(g) { return g.count > 0; });

  var navBtn = function(key, label, emoji) {
    var active = view === key;
    return (
      <button
        key={key}
        onClick={function() { setView(key); }}
        className={"flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all " + (active ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200")}
      >
        <span>{emoji}</span> {label}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 text-sm font-medium text-gray-700 animate-bounce">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">👤 ユーザー情報管理</h1>
          <p className="text-xs text-gray-400 mt-1">登録・一覧・統計</p>
        </div>

        <div className="flex gap-2 justify-center mb-6">
          {navBtn("register", "登録", "📝")}
          {navBtn("list", "一覧", "📋")}
          {navBtn("stats", "統計", "📊")}
        </div>

        {view === "register" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">📝 ユーザー登録</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">名前</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
                  value={name}
                  onChange={function(e) { setName(e.target.value); }}
                  placeholder="例:田中太郎"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">性別</label>
                <div className="flex gap-2">
                  {["男性", "女性", "その他"].map(function(g) {
                    var active = gender === g;
                    var colors = g === "男性" ? "border-blue-400 bg-blue-50 text-blue-700" : g === "女性" ? "border-pink-400 bg-pink-50 text-pink-700" : "border-purple-400 bg-purple-50 text-purple-700";
                    return (
                      <button
                        key={g}
                        onClick={function() { setGender(g); }}
                        className={"flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition " + (active ? colors : "border-gray-200 bg-white text-gray-400 hover:border-gray-300")}
                      >
                        {g === "男性" ? "👨 " : g === "女性" ? "👩 " : "🧑 "}{g}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">年齢</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
                  value={age}
                  onChange={function(e) { setAge(e.target.value); }}
                  placeholder="例:30"
                />
              </div>
              <button
                onClick={handleRegister}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                ✅ 登録する
              </button>
            </div>
          </div>
        )}

        {view === "list" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">📋 ユーザー一覧</h2>
              <span className="text-xs text-gray-400">{safeUsers.length}件</span>
            </div>
            {safeUsers.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <div className="text-4xl mb-2">👤</div>
                <p className="text-sm">登録されたユーザーはいません</p>
              </div>
            )}
            <div className="space-y-2">
              {safeUsers.slice().reverse().map(function(u) {
                var isEditing = editId === u.id;
                var genderEmoji = u.gender === "男性" ? "👨" : u.gender === "女性" ? "👩" : "🧑";
                var genderColor = u.gender === "男性" ? "bg-blue-100 text-blue-700" : u.gender === "女性" ? "bg-pink-100 text-pink-700" : "bg-purple-100 text-purple-700";

                if (isEditing) {
                  return (
                    <div key={u.id} className="border-2 border-indigo-300 rounded-xl p-4 bg-indigo-50/50 space-y-3">
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editName} onChange={function(e) { setEditName(e.target.value); }} />
                      <div className="flex gap-2">
                        {["男性", "女性", "その他"].map(function(g) {
                          return (
                            <button key={g} onClick={function() { setEditGender(g); }}
                              className={"flex-1 py-2 rounded-lg text-xs font-medium border " + (editGender === g ? "border-indigo-400 bg-indigo-100 text-indigo-700" : "border-gray-200 text-gray-400")}
                            >{g}</button>
                          );
                        })}
                      </div>
                      <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editAge} onChange={function(e) { setEditAge(e.target.value); }} />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-medium">💾 保存</button>
                        <button onClick={function() { setEditId(null); }} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-medium">キャンセル</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={u.id} className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 transition group">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{genderEmoji}</div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{u.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + genderColor}>{u.gender}</span>
                          <span className="text-xs text-gray-400">{u.age}歳</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={function() { startEdit(u); }} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-indigo-600 transition text-xs">✏️</button>
                      <button onClick={function() { handleDelete(u.id); }} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition text-xs">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "総ユーザー数", value: displayStats.total, unit: "人", color: "from-indigo-500 to-blue-500", emoji: "👥" },
                { label: "平均年齢", value: displayStats.avgAge, unit: "歳", color: "from-emerald-500 to-teal-500", emoji: "📅" },
                { label: "最年少", value: displayStats.total > 0 ? displayStats.minAge : "-", unit: displayStats.total > 0 ? "歳" : "", color: "from-amber-500 to-orange-500", emoji: "🌱" },
                { label: "最年長", value: displayStats.total > 0 ? displayStats.maxAge : "-", unit: displayStats.total > 0 ? "歳" : "", color: "from-rose-500 to-pink-500", emoji: "🌳" }
              ].map(function(card) {
                return (
                  <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="text-lg mb-1">{card.emoji}</div>
                    <div className="text-xs text-gray-400 mb-1">{card.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className={"text-xl font-bold bg-gradient-to-r " + card.color + " bg-clip-text text-transparent"}>{card.value}</span>
                      <span className="text-xs text-gray-400">{card.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {displayStats.total > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">🧑‍🤝‍🧑 性別分布</h3>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" label={function(entry) { return entry.name + " " + entry.value + "人"; }} labelLine={false}>
                        {genderData.map(function(entry, i) {
                          return <Cell key={i} fill={entry.color} />;
                        })}
                      </Pie>
                      <Tooltip formatter={function(v) { return v + "人"; }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {ageChartData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 年齢層分布</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ageChartData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip formatter={function(v) { return v + "人"; }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {ageChartData.map(function(entry, i) {
                        return <Cell key={i} fill={entry.color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {displayStats.total === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-300">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-sm">データがありません。ユーザーを登録してください。</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}