function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEY = "users";
  var [users, setUsers] = useState([]);
  var [form, setForm] = useState({
    name: "",
    gender: "male",
    age: ""
  });
  var [editing_id, setEditingId] = useState(null);
  var [error, setError] = useState("");
  var [submitted_id, setSubmittedId] = useState(null);

  useEffect(function() {
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

  useEffect(function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

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

  function validateForm() {
    if (!form.name.trim()) return "请输入姓名";
    if (!form.age || isNaN(Number(form.age))) return "请输入正确年龄";
    if (Number(form.age) < 0 || Number(form.age) > 120) return "年龄需在 0 到 120 之间";
    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    var validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    var nextUser = {
      id: editing_id || Date.now(),
      name: form.name.trim(),
      gender: form.gender,
      age: Number(form.age),
      updated_at: new Date().toISOString()
    };

    if (editing_id) {
      setUsers(function(prev) {
        return asArray(prev).map(function(item) {
          return item.id === editing_id ? nextUser : item;
        });
      });
      setSubmittedId(editing_id);
    } else {
      nextUser.created_at = new Date().toISOString();
      setUsers(function(prev) {
        return [{ 
          id: nextUser.id,
          name: nextUser.name,
          gender: nextUser.gender,
          age: nextUser.age,
          created_at: nextUser.created_at,
          updated_at: nextUser.updated_at
        }].concat(asArray(prev));
      });
      setSubmittedId(nextUser.id);
    }

    resetForm();
  }

  function handleEdit(user) {
    setForm({
      name: user.name || "",
      gender: user.gender || "male",
      age: String(user.age || "")
    });
    setEditingId(user.id);
    setError("");
  }

  function handleDelete(id) {
    setUsers(function(prev) {
      return asArray(prev).filter(function(item) {
        return item.id !== id;
      });
    });
    if (editing_id === id) {
      resetForm();
    }
    if (submitted_id === id) {
      setSubmittedId(null);
    }
  }

  function clearAll() {
    setUsers([]);
    resetForm();
    setSubmittedId(null);
  }

  var stats = useMemo(function() {
    var list = asArray(users);
    var total = list.length;
    var male_count = list.filter(function(item) { return item.gender === "male"; }).length;
    var female_count = list.filter(function(item) { return item.gender === "female"; }).length;
    var other_count = list.filter(function(item) { return item.gender === "other"; }).length;
    var avg_age = total > 0
      ? (list.reduce(function(sum, item) { return sum + Number(item.age || 0); }, 0) / total).toFixed(1)
      : 0;

    return {
      total: total,
      male_count: male_count,
      female_count: female_count,
      other_count: other_count,
      avg_age: avg_age
    };
  }, [users]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">👤 用户信息登录</h1>
          <p className="text-sm text-slate-500 mt-1">录入姓名、性别、年龄,并查看简单统计信息。</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">
                  {editing_id ? "✏️ 编辑用户" : "📝 新增用户"}
                </h2>
                {editing_id && (
                  <button
                    className="text-xs text-slate-500 hover:text-slate-700"
                    onClick={resetForm}
                  >
                    取消编辑
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">姓名</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={form.name}
                    onChange={function(e) { updateForm("name", e.target.value); }}
                    placeholder="请输入姓名"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">性别</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                    value={form.gender}
                    onChange={function(e) { updateForm("gender", e.target.value); }}
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">年龄</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={form.age}
                    onChange={function(e) { updateForm("age", e.target.value); }}
                    placeholder="请输入年龄"
                    type="number"
                    min="0"
                    max="120"
                  />
                </div>

                {error && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    ❌ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  {editing_id ? "保存修改" : "提交登录信息"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">📊 总人数</div>
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">👨 男性</div>
                <div className="text-2xl font-bold text-slate-900">{stats.male_count}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">👩 女性</div>
                <div className="text-2xl font-bold text-slate-900">{stats.female_count}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">🎂 平均年龄</div>
                <div className="text-2xl font-bold text-slate-900">{stats.avg_age}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">📋 用户列表</h2>
                <button
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={clearAll}
                >
                  清空全部
                </button>
              </div>

              {users.length === 0 ? (
                <div className="text-sm text-slate-400 py-10 text-center">
                  暂无用户信息,请先添加一条记录。
                </div>
              ) : (
                <div className="space-y-3">
                  {asArray(users).map(function(user) {
                    var genderText = user.gender === "male" ? "男" : user.gender === "female" ? "女" : "其他";
                    return (
                      <div
                        key={user.id}
                        className={"border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 " + (submitted_id === user.id ? "border-blue-200 bg-blue-50" : "border-slate-200")}
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            性别:{genderText}　|　年龄:{user.age}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                            onClick={function() { handleEdit(user); }}
                          >
                            编辑
                          </button>
                          <button
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
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

            {users.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800 mb-3">📌 统计说明</h2>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>• 该应用支持本地录入用户姓名、性别和年龄。</p>
                  <p>• 数据保存在当前浏览器中,刷新页面后仍会保留。</p>
                  <p>• 可进行基础统计,包括总人数、男女数量和平均年龄。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}