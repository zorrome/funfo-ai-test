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

  useEffect(function() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      setUsers(asArray(parsed));
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
  }

  function handleSubmit() {
    var name = (form.name || "").trim();
    var age_num = Number(form.age);

    if (!name) {
      alert("请输入姓名");
      return;
    }

    if (!form.gender) {
      alert("请选择性别");
      return;
    }

    if (!form.age || isNaN(age_num) || age_num <= 0) {
      alert("请输入正确年龄");
      return;
    }

    if (editing_id) {
      setUsers(function(prev) {
        return asArray(prev).map(function(item) {
          if (item.id === editing_id) {
            return {
              id: item.id,
              name: name,
              gender: form.gender,
              age: age_num,
              created_at: item.created_at,
              updated_at: Date.now()
            };
          }
          return item;
        });
      });
    } else {
      var new_user = {
        id: Date.now(),
        name: name,
        gender: form.gender,
        age: age_num,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      setUsers(function(prev) {
        return [new_user].concat(asArray(prev));
      });
    }

    resetForm();
  }

  function handleEdit(user) {
    setEditingId(user.id);
    setForm({
      name: user.name || "",
      gender: user.gender || "male",
      age: String(user.age || "")
    });
  }

  function handleDelete(id) {
    var ok = window.confirm("确定删除这条用户信息吗？");
    if (!ok) return;
    setUsers(function(prev) {
      return asArray(prev).filter(function(item) {
        return item.id !== id;
      });
    });
    if (editing_id === id) {
      resetForm();
    }
  }

  var total_users = asArray(users).length;
  var male_count = asArray(users).filter(function(item) { return item.gender === "male"; }).length;
  var female_count = asArray(users).filter(function(item) { return item.gender === "female"; }).length;
  var average_age = total_users > 0
    ? (asArray(users).reduce(function(sum, item) {
        return sum + Number(item.age || 0);
      }, 0) / total_users).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">👤 用户信息登录</h1>
          <p className="text-sm text-slate-500 mt-1">录入姓名、性别、年龄,并查看简单统计</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">总用户数</div>
            <div className="text-2xl font-bold text-slate-900">{total_users}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">男性人数</div>
            <div className="text-2xl font-bold text-blue-600">{male_count}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">女性人数</div>
            <div className="text-2xl font-bold text-pink-600">{female_count}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">平均年龄</div>
            <div className="text-2xl font-bold text-emerald-600">{average_age}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-sm font-semibold text-slate-800 mb-4">
                {editing_id ? "✏️ 编辑用户" : "✅ 新增用户"}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">姓名</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500"
                    value={form.name}
                    onChange={function(e) { updateForm("name", e.target.value); }}
                    placeholder="请输入姓名"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">性别</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500"
                    value={form.gender}
                    onChange={function(e) { updateForm("gender", e.target.value); }}
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">年龄</label>
                  <input
                    type="number"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-500"
                    value={form.age}
                    onChange={function(e) { updateForm("age", e.target.value); }}
                    placeholder="请输入年龄"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    className="flex-1 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm"
                    onClick={handleSubmit}
                  >
                    {editing_id ? "保存修改" : "提交信息"}
                  </button>
                  <button
                    className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700"
                    onClick={resetForm}
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-slate-800">📋 用户列表</div>
                <div className="text-xs text-slate-500">共 {total_users} 条记录</div>
              </div>

              {total_users === 0 ? (
                <div className="text-sm text-slate-400 py-10 text-center">
                  暂无用户信息,请先录入数据
                </div>
              ) : (
                <div className="space-y-3">
                  {asArray(users).map(function(user, index) {
                    return (
                      <div
                        key={user.id}
                        className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {index + 1}．{user.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            性别:
                            {user.gender === "male" ? "男" : "女"}
                            {" · "}
                            年龄:{user.age} 岁
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-700"
                            onClick={function() { handleEdit(user); }}
                          >
                            编辑
                          </button>
                          <button
                            className="px-3 py-2 text-xs rounded-lg bg-red-500 text-white"
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