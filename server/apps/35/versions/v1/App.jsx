function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "users";
  var SESSION_KEY = "current_user";

  var [users, setUsers] = useState([]);
  var [currentUserId, setCurrentUserId] = useState("");
  var [form, setForm] = useState({
    name: "",
    gender: "male",
    age: ""
  });
  var [message, setMessage] = useState("");

  useEffect(function() {
    try {
      var savedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      var savedSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      setUsers(asArray(savedUsers));
      if (savedSession && savedSession.user_id) {
        setCurrentUserId(String(savedSession.user_id));
      }
    } catch (e) {
      setUsers([]);
      setCurrentUserId("");
    }
  }, []);

  useEffect(function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(function() {
    if (currentUserId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user_id: Number(currentUserId) }));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUserId]);

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
  }

  function handleRegister() {
    var name = form.name.trim();
    var age = Number(form.age);

    if (!name) {
      setMessage("❌ 请输入姓名");
      return;
    }
    if (!form.age || isNaN(age) || age <= 0) {
      setMessage("❌ 请输入有效年龄");
      return;
    }

    var newUser = {
      id: Date.now(),
      name: name,
      gender: form.gender,
      age: age,
      created_at: new Date().toISOString()
    };

    setUsers(function(prev) {
      return prev.concat([newUser]);
    });
    setCurrentUserId(String(newUser.id));
    setMessage("✅ 注册并登录成功");
    resetForm();
  }

  function handleLogin(userId) {
    setCurrentUserId(String(userId));
    setMessage("✅ 登录成功");
  }

  function handleLogout() {
    setCurrentUserId("");
    setMessage("✅ 已退出登录");
  }

  function handleDelete(userId) {
    var nextUsers = asArray(users).filter(function(user) {
      return user.id !== userId;
    });
    setUsers(nextUsers);
    if (String(userId) === String(currentUserId)) {
      setCurrentUserId("");
    }
    setMessage("🗑️ 用户已删除");
  }

  var currentUser = asArray(users).find(function(user) {
    return String(user.id) === String(currentUserId);
  }) || null;

  var totalUsers = asArray(users).length;
  var maleCount = asArray(users).filter(function(user) {
    return user.gender === "male";
  }).length;
  var femaleCount = asArray(users).filter(function(user) {
    return user.gender === "female";
  }).length;
  var averageAge = totalUsers > 0
    ? (asArray(users).reduce(function(sum, user) {
        return sum + Number(user.age || 0);
      }, 0) / totalUsers).toFixed(1)
    : "0.0";

  var chartData = [
    { name: "男性", value: maleCount },
    { name: "女性", value: femaleCount }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">👤 用户信息登录 App</h1>
          <p className="text-sm text-slate-500">
            支持录入姓名、性别、年龄,并进行简单登录与统计展示。
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-4">📝 用户注册 / 登录</div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">姓名</div>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                  value={form.name}
                  onChange={function(e) { updateForm("name", e.target.value); }}
                  placeholder="请输入姓名"
                />
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">性别</div>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                  value={form.gender}
                  onChange={function(e) { updateForm("gender", e.target.value); }}
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">年龄</div>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                  value={form.age}
                  onChange={function(e) { updateForm("age", e.target.value); }}
                  placeholder="请输入年龄"
                  type="number"
                  min="1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
                  onClick={handleRegister}
                >
                  ✅ 注册并登录
                </button>
                <button
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-4 py-2 rounded-lg"
                  onClick={resetForm}
                >
                  ↺ 重置
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-4">🔐 当前登录状态</div>

            {currentUser ? (
              <div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-4">
                  <div className="text-sm font-semibold text-emerald-800 mb-2">✅ 已登录</div>
                  <div className="text-sm text-slate-700 mb-1">姓名:{currentUser.name}</div>
                  <div className="text-sm text-slate-700 mb-1">
                    性别:{currentUser.gender === "male" ? "男" : "女"}
                  </div>
                  <div className="text-sm text-slate-700">年龄:{currentUser.age}</div>
                </div>
                <button
                  className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg"
                  onClick={handleLogout}
                >
                  🚪 退出登录
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                当前暂无登录用户,请先注册或从下方用户列表中登录。
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500 mb-2">👥 用户总数</div>
            <div className="text-2xl font-bold text-slate-900">{totalUsers}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500 mb-2">📊 平均年龄</div>
            <div className="text-2xl font-bold text-slate-900">{averageAge}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-slate-500 mb-2">🙋 当前登录</div>
            <div className="text-sm font-semibold text-slate-900">
              {currentUser ? currentUser.name : "未登录"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-4">📋 用户列表</div>

            {totalUsers === 0 ? (
              <div className="text-sm text-slate-400">暂无用户数据,请先新增用户。</div>
            ) : (
              <div className="space-y-3">
                {asArray(users).map(function(user) {
                  var isActive = String(user.id) === String(currentUserId);
                  return (
                    <div
                      key={user.id}
                      className="border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {user.name} {isActive ? "🟢" : ""}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          性别:{user.gender === "male" ? "男" : "女"} ｜ 年龄:{user.age}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isActive && (
                          <button
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm px-3 py-2 rounded-lg"
                            onClick={function() { handleLogin(user.id); }}
                          >
                            登录
                          </button>
                        )}
                        <button
                          className="bg-red-50 hover:bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg"
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

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-800 mb-4">📈 性别统计</div>

            {totalUsers === 0 ? (
              <div className="text-sm text-slate-400">暂无统计数据。</div>
            ) : (
              <div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ec4899" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <div className="text-xs text-blue-600 mb-1">男性人数</div>
                    <div className="text-sm font-semibold text-blue-900">{maleCount}</div>
                  </div>
                  <div className="rounded-xl bg-pink-50 border border-pink-100 p-3">
                    <div className="text-xs text-pink-600 mb-1">女性人数</div>
                    <div className="text-sm font-semibold text-pink-900">{femaleCount}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}