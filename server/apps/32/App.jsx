function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "users";
  var SESSION_KEY = "current_user_id";

  var [users, setUsers] = useState([]);
  var [currentUserId, setCurrentUserId] = useState("");
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
    if (currentUserId) {
      localStorage.setItem(SESSION_KEY, currentUserId);
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
    setError("");
  }

  function handleRegisterAndLogin() {
    var trimmedName = form.name.trim();
    var ageNumber = Number(form.age);

    if (!trimmedName) {
      setError("姓名不能为空");
      return;
    }
    if (!form.gender) {
      setError("请选择性别");
      return;
    }
    if (!form.age || isNaN(ageNumber) || ageNumber <= 0) {
      setError("请输入正确年龄");
      return;
    }

    var newUser = {
      id: String(Date.now()),
      name: trimmedName,
      gender: form.gender,
      age: ageNumber,
      created_at: new Date().toISOString()
    };

    setUsers(function(prev) {
      return prev.concat([newUser]);
    });
    setCurrentUserId(newUser.id);
    resetForm();
  }

  function handleLogin(userId) {
    setCurrentUserId(userId);
  }

  function handleLogout() {
    setCurrentUserId("");
  }

  function handleDelete(userId) {
    var isCurrent = currentUserId === userId;
    setUsers(function(prev) {
      return prev.filter(function(user) {
        return user.id !== userId;
      });
    });
    if (isCurrent) {
      setCurrentUserId("");
    }
  }

  var currentUser = asArray(users).find(function(user) {
    return user.id === currentUserId;
  }) || null;

  var totalUsers = asArray(users).length;
  var maleCount = asArray(users).filter(function(user) {
    return user.gender === "male";
  }).length;
  var femaleCount = asArray(users).filter(function(user) {
    return user.gender === "female";
  }).length;
  var otherCount = asArray(users).filter(function(user) {
    return user.gender === "other";
  }).length;

  var averageAge = totalUsers > 0
    ? (asArray(users).reduce(function(sum, user) {
        return sum + Number(user.age || 0);
      }, 0) / totalUsers).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">👤 用户信息登录应用</h1>
          <p className="text-sm text-slate-500 mt-1">登记姓名、性别、年龄,并查看基础统计信息</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">📝 用户登录登记</h2>
                <button
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={resetForm}
                >
                  重置
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">姓名</label>
                  <input
                    value={form.name}
                    onChange={function(e) { updateForm("name", e.target.value); }}
                    placeholder="请输入姓名"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">性别</label>
                  <select
                    value={form.gender}
                    onChange={function(e) { updateForm("gender", e.target.value); }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">年龄</label>
                  <input
                    value={form.age}
                    onChange={function(e) { updateForm("age", e.target.value); }}
                    placeholder="请输入年龄"
                    type="number"
                    min="1"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>

                {error ? (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    ❌ {error}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    输入完成后会创建用户并自动登录
                  </div>
                )}

                <button
                  onClick={handleRegisterAndLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg px-4 py-2"
                >
                  ✅ 登记并登录
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mt-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">🔐 当前登录状态</h2>
              {currentUser ? (
                <div className="space-y-2">
                  <div className="text-sm text-slate-700">
                    当前用户:<span className="font-semibold">{currentUser.name}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    性别:{currentUser.gender === "male" ? "男" : currentUser.gender === "female" ? "女" : "其他"}
                  </div>
                  <div className="text-xs text-slate-500">
                    年龄:{currentUser.age} 岁
                  </div>
                  <button
                    onClick={handleLogout}
                    className="mt-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2"
                  >
                    退出登录
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-400">暂无登录用户</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">👥 总人数</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">👨 男性</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{maleCount}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">👩 女性</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{femaleCount}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500">📊 平均年龄</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{averageAge}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">📈 性别统计</h2>
              {totalUsers > 0 ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>男</span>
                      <span>{maleCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-500 h-3 rounded-full"
                        style={{ width: (maleCount / totalUsers * 100) + "%" }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>女</span>
                      <span>{femaleCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-pink-500 h-3 rounded-full"
                        style={{ width: (femaleCount / totalUsers * 100) + "%" }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>其他</span>
                      <span>{otherCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-amber-500 h-3 rounded-full"
                        style={{ width: (otherCount / totalUsers * 100) + "%" }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">暂无统计数据</div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">📋 用户列表</h2>
              {totalUsers === 0 ? (
                <div className="text-sm text-slate-400">还没有用户,请先添加一位用户</div>
              ) : (
                <div className="space-y-3">
                  {asArray(users).map(function(user) {
                    var isActive = currentUserId === user.id;
                    return (
                      <div
                        key={user.id}
                        className={"border rounded-xl p-3 " + (isActive ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">
                              {user.name} {isActive ? "✅" : ""}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              性别:{user.gender === "male" ? "男" : user.gender === "female" ? "女" : "其他"} ・ 年龄:{user.age} 岁
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              创建时间:{new Date(user.created_at).toLocaleString()}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {!isActive && (
                              <button
                                onClick={function() { handleLogin(user.id); }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg px-3 py-2"
                              >
                                登录
                              </button>
                            )}
                            <button
                              onClick={function() { handleDelete(user.id); }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2"
                            >
                              删除
                            </button>
                          </div>
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