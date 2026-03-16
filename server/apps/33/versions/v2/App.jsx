function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "users";
  var THEME_KEY = "users_theme";
  var [users, setUsers] = useState([]);
  var [form, setForm] = useState({
    name: "",
    gender: "male",
    age: ""
  });
  var [editing_id, setEditingId] = useState(null);
  var [error, setError] = useState("");
  var [submitted, setSubmitted] = useState(false);
  var [darkMode, setDarkMode] = useState(false);

  useEffect(function() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      setUsers(asArray(parsed));
    } catch (e) {
      setUsers([]);
    }

    try {
      var savedTheme = localStorage.getItem(THEME_KEY);
      setDarkMode(savedTheme === "dark");
    } catch (e2) {
      setDarkMode(false);
    }
  }, []);

  useEffect(function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(function() {
    localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

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
    setEditingId(null);
    setError("");
  }

  function validate() {
    if (!form.name.trim()) {
      return "请输入姓名";
    }
    if (!form.age || isNaN(Number(form.age))) {
      return "请输入有效年龄";
    }
    if (Number(form.age) <= 0) {
      return "年龄需要大于 0";
    }
    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    var message = validate();
    setSubmitted(true);
    if (message) {
      setError(message);
      return;
    }

    var user = {
      id: editing_id || Date.now(),
      name: form.name.trim(),
      gender: form.gender,
      age: Number(form.age),
      created_at: editing_id
        ? users.find(function(item) { return item.id === editing_id; })?.created_at || new Date().toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (editing_id) {
      setUsers(function(prev) {
        return prev.map(function(item) {
          return item.id === editing_id ? user : item;
        });
      });
    } else {
      setUsers(function(prev) {
        return [user].concat(prev);
      });
    }

    resetForm();
    setSubmitted(false);
  }

  function handleEdit(user) {
    setForm({
      name: user.name || "",
      gender: user.gender || "male",
      age: String(user.age || "")
    });
    setEditingId(user.id);
    setError("");
    setSubmitted(false);
  }

  function handleDelete(id) {
    var ok = window.confirm("确定删除这条用户信息吗？");
    if (!ok) return;
    setUsers(function(prev) {
      return prev.filter(function(item) {
        return item.id !== id;
      });
    });
    if (editing_id === id) {
      resetForm();
    }
  }

  var stats = useMemo(function() {
    var list = asArray(users);
    var total = list.length;
    var male_count = list.filter(function(item) { return item.gender === "male"; }).length;
    var female_count = list.filter(function(item) { return item.gender === "female"; }).length;
    var other_count = list.filter(function(item) { return item.gender === "other"; }).length;
    var avg_age = total > 0
      ? (list.reduce(function(sum, item) { return sum + Number(item.age || 0); }, 0) / total).toFixed(1)
      : "0.0";

    return {
      total: total,
      male_count: male_count,
      female_count: female_count,
      other_count: other_count,
      avg_age: avg_age
    };
  }, [users]);

  var chartData = [
    { name: "男", value: stats.male_count, color: "#3b82f6" },
    { name: "女", value: stats.female_count, color: "#ec4899" },
    { name: "其他", value: stats.other_count, color: "#10b981" }
  ];

  return (
    <div className={darkMode ? "min-h-screen bg-slate-950 p-4 md:p-6" : "min-h-screen bg-slate-50 p-4 md:p-6"}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className={darkMode ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>👤 用户信息登录与统计</h1>
            <p className={darkMode ? "text-sm text-slate-400 mt-1" : "text-sm text-slate-500 mt-1"}>录入姓名、性别、年龄,并查看简单统计结果。</p>
          </div>
          <button
            className={darkMode
              ? "text-sm px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "text-sm px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}
            onClick={function() { setDarkMode(function(prev) { return !prev; }); }}
          >
            {darkMode ? "☀️ 切换浅色模式" : "🌙 切换深夜模式"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <div className={darkMode ? "bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm" : "bg-white border border-slate-200 rounded-xl p-4 shadow-sm"}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={darkMode ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-800"}>
                  {editing_id ? "✏️ 编辑用户" : "➕ 新增用户"}
                </h2>
                {editing_id && (
                  <button
                    className={darkMode
                      ? "text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"}
                    onClick={resetForm}
                  >
                    取消编辑
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={darkMode ? "block text-xs text-slate-400 mb-1" : "block text-xs text-slate-500 mb-1"}>姓名</label>
                  <input
                    className={darkMode
                      ? "w-full border border-slate-700 bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                      : "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"}
                    value={form.name}
                    onChange={function(e) { updateForm("name", e.target.value); }}
                    placeholder="请输入姓名"
                  />
                </div>

                <div>
                  <label className={darkMode ? "block text-xs text-slate-400 mb-1" : "block text-xs text-slate-500 mb-1"}>性别</label>
                  <select
                    className={darkMode
                      ? "w-full border border-slate-700 bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                      : "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"}
                    value={form.gender}
                    onChange={function(e) { updateForm("gender", e.target.value); }}
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className={darkMode ? "block text-xs text-slate-400 mb-1" : "block text-xs text-slate-500 mb-1"}>年龄</label>
                  <input
                    type="number"
                    className={darkMode
                      ? "w-full border border-slate-700 bg-slate-950 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                      : "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"}
                    value={form.age}
                    onChange={function(e) { updateForm("age", e.target.value); }}
                    placeholder="请输入年龄"
                    min="1"
                  />
                </div>

                {submitted && error && (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    ❌ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  {editing_id ? "保存修改" : "提交信息"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={darkMode ? "bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm" : "bg-white border border-slate-200 rounded-xl p-4 shadow-sm"}>
                <div className={darkMode ? "text-xs text-slate-400 mb-1" : "text-xs text-slate-500 mb-1"}>📋 总人数</div>
                <div className={darkMode ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>{stats.total}</div>
              </div>
              <div className={darkMode ? "bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm" : "bg-white border border-slate-200 rounded-xl p-4 shadow-sm"}>
                <div className={darkMode ? "text-xs text-slate-400 mb-1" : "text-xs text-slate-500 mb-1"}>👨 男</div>
                <div className="text-2xl font-bold text-blue-600">{stats.male_count}</div>
              </div>
              <div className={darkMode ? "bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm" : "bg-white border border-slate-200 rounded-xl p-4 shadow-sm"}>
                <div className={darkMode ? "text-xs text-slate-400 mb-1" : "text-xs text-slate-500 mb-1"}>👩 女</div>
                <div className="text-2xl font-bold text-pink-600">{stats.female_count}</div>
              </div>
              <div className={darkMode ? "bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm" : "bg-white border border-slate-200 rounded-xl p-4 shadow-sm"}>
                <div className={darkMode ? "text-xs text-slate-400 mb-1" : "text-xs text-slate-500 mb-1"}>🎂 平均年龄</div>
                <div className="text-2xl font-bold text-emerald-600">{stats.avg_age}</div>
              </div>
            </div>

            <div className={darkMode ? "bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm" : "bg-white border border-slate-200 rounded-xl p-4 shadow-sm"}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={darkMode ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-800"}>📊 性别统计</h2>
                <span className={darkMode ? "text-xs text-slate-500" : "text-xs text-slate-400"}>简单分布图</span>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label
                    >
                      {asArray(chartData).map(function(entry, index) {
                        return <Cell key={index} fill={entry.color} />;
                      })}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={darkMode ? "bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm" : "bg-white border border-slate-200 rounded-xl p-4 shadow-sm"}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={darkMode ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-800"}>🧾 用户列表</h2>
                <span className={darkMode ? "text-xs text-slate-500" : "text-xs text-slate-400"}>支持编辑与删除</span>
              </div>

              {users.length === 0 ? (
                <div className={darkMode
                  ? "text-sm text-slate-500 border border-dashed border-slate-700 rounded-lg p-6 text-center"
                  : "text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg p-6 text-center"}>
                  暂无用户信息,请先添加一条记录。
                </div>
              ) : (
                <div className="space-y-3">
                  {asArray(users).map(function(user) {
                    return (
                      <div
                        key={user.id}
                        className={darkMode
                          ? "border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                          : "border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"}
                      >
                        <div className="flex-1">
                          <div className={darkMode ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-slate-800"}>{user.name}</div>
                          <div className={darkMode ? "text-xs text-slate-400 mt-1" : "text-xs text-slate-500 mt-1"}>
                            性别:
                            {user.gender === "male" ? "男" : user.gender === "female" ? "女" : "其他"}
                            {" · "}
                            年龄:{user.age}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            className={darkMode
                              ? "px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
                              : "px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"}
                            onClick={function() { handleEdit(user); }}
                          >
                            编辑
                          </button>
                          <button
                            className="px-3 py-2 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600"
                            onClick={function() { handleDelete(user.id); }}
                          >
                            删除
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