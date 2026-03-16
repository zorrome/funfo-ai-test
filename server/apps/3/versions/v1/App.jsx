function App() {
  var STORAGE_KEY = "user-login-stats-app-v1";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function readStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return asArray(parsed);
    } catch (e) {
      return [];
    }
  }

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function formatTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  }

  var genderOptions = ["男", "女", "其他"];

  var _useState = useState(function () {
    return readStorage();
  });
  var users = _useState[0];
  var setUsers = _useState[1];

  var _useState2 = useState({
    name: "",
    gender: "男",
    age: ""
  });
  var form = _useState2[0];
  var setForm = _useState2[1];

  var _useState3 = useState("");
  var currentUserId = _useState3[0];
  var setCurrentUserId = _useState3[1];

  var _useState4 = useState("");
  var error = _useState4[0];
  var setError = _useState4[1];

  useEffect(function () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  var stats = useMemo(function () {
    var list = asArray(users);
    var total = list.length;
    var loggedInList = list.filter(function (item) {
      return item.isLoggedIn;
    });

    var maleCount = list.filter(function (item) {
      return item.gender === "男";
    }).length;

    var femaleCount = list.filter(function (item) {
      return item.gender === "女";
    }).length;

    var otherCount = list.filter(function (item) {
      return item.gender === "其他";
    }).length;

    var validAgeList = list
      .map(function (item) {
        return Number(item.age);
      })
      .filter(function (age) {
        return !Number.isNaN(age) && age > 0;
      });

    var averageAge = validAgeList.length
      ? (validAgeList.reduce(function (sum, age) {
          return sum + age;
        }, 0) / validAgeList.length).toFixed(1)
      : "-";

    return {
      total: total,
      loggedIn: loggedInList.length,
      male: maleCount,
      female: femaleCount,
      other: otherCount,
      averageAge: averageAge
    };
  }, [users]);

  var currentUser = useMemo(function () {
    return (
      asArray(users).find(function (item) {
        return item.id === currentUserId;
      }) || null
    );
  }, [users, currentUserId]);

  function updateForm(key, value) {
    setForm(function (prev) {
      return Object.assign({}, prev, { [key]: value });
    });
  }

  function resetForm() {
    setForm({
      name: "",
      gender: "男",
      age: ""
    });
    setError("");
  }

  function handleLogin() {
    var name = form.name.trim();
    var age = Number(form.age);

    if (!name) {
      setError("请输入姓名。");
      return;
    }

    if (!form.gender) {
      setError("请选择性别。");
      return;
    }

    if (!form.age || Number.isNaN(age) || age <= 0 || age > 120) {
      setError("请输入正确的年龄（1-120）。");
      return;
    }

    var id = String(Date.now());

    var newUser = {
      id: id,
      name: name,
      gender: form.gender,
      age: age,
      isLoggedIn: true,
      loginAt: new Date().toISOString()
    };

    setUsers(function (prev) {
      return [newUser].concat(asArray(prev));
    });
    setCurrentUserId(id);
    setError("");
    resetForm();
  }

  function handleLogout(id) {
    setUsers(function (prev) {
      return asArray(prev).map(function (item) {
        if (item.id !== id) return item;
        return Object.assign({}, item, {
          isLoggedIn: false
        });
      });
    });

    if (currentUserId === id) {
      setCurrentUserId("");
    }
  }

  function handleRelogin(id) {
    setUsers(function (prev) {
      return asArray(prev).map(function (item) {
        if (item.id !== id) return item;
        return Object.assign({}, item, {
          isLoggedIn: true,
          loginAt: new Date().toISOString()
        });
      });
    });
    setCurrentUserId(id);
  }

  function handleDelete(id) {
    setUsers(function (prev) {
      return asArray(prev).filter(function (item) {
        return item.id !== id;
      });
    });

    if (currentUserId === id) {
      setCurrentUserId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
            👤 用户登录管理
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">简单用户信息登录 App</h1>
          <p className="mt-2 text-sm text-slate-500">
            可录入姓名、性别、年龄,并查看当前登录状态与基础统计信息。
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🔐</span>
                <h2 className="text-sm font-semibold">用户登录</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">姓名</label>
                  <input
                    value={form.name}
                    onChange={function (e) {
                      updateForm("name", e.target.value);
                    }}
                    placeholder="请输入姓名"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">性别</label>
                  <select
                    value={form.gender}
                    onChange={function (e) {
                      updateForm("gender", e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-slate-400"
                  >
                    {asArray(genderOptions).map(function (item) {
                      return (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">年龄</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={function (e) {
                      updateForm("age", e.target.value);
                    }}
                    placeholder="请输入年龄"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                {error ? (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-600">
                    ❌ {error}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500">
                    ✅ 请填写完整信息后点击登录
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleLogin}
                    className="flex-1 rounded-xl bg-slate-900 text-white text-sm font-medium py-2.5 hover:bg-slate-800"
                  >
                    登录
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    重置
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <span>✨</span>
                  <h3 className="text-sm font-semibold">当前选中用户</h3>
                </div>

                {currentUser ? (
                  <div className="rounded-2xl bg-slate-900 text-white p-4">
                    <div className="text-base font-semibold">{currentUser.name}</div>
                    <div className="mt-2 text-sm text-slate-200">
                      性别:{currentUser.gender}
                    </div>
                    <div className="mt-1 text-sm text-slate-200">
                      年龄:{currentUser.age} 岁
                    </div>
                    <div className="mt-1 text-sm text-slate-200">
                      状态:{currentUser.isLoggedIn ? "已登录" : "未登录"}
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      登录时间:{formatTime(currentUser.loginAt)}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                    暂未选中任何用户
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">总用户数</div>
                <div className="mt-2 text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">当前登录</div>
                <div className="mt-2 text-2xl font-bold text-emerald-600">{stats.loggedIn}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">男性</div>
                <div className="mt-2 text-2xl font-bold">{stats.male}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">女性</div>
                <div className="mt-2 text-2xl font-bold">{stats.female}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">其他</div>
                <div className="mt-2 text-2xl font-bold">{stats.other}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">平均年龄</div>
                <div className="mt-2 text-2xl font-bold">{stats.averageAge}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📊</span>
                <h2 className="text-sm font-semibold">统计概览</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-3">性别分布</div>
                  <div className="space-y-3">
                    {asArray([
                      { label: "男", value: stats.male, color: "bg-sky-500" },
                      { label: "女", value: stats.female, color: "bg-pink-500" },
                      { label: "其他", value: stats.other, color: "bg-violet-500" }
                    ]).map(function (item) {
                      var max = stats.total || 1;
                      var width = (item.value / max) * 100;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{item.label}</span>
                            <span>{item.value} 人</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={"h-full rounded-full " + item.color}
                              style={{ width: width + "%" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-3">登录状态</div>
                  <div className="flex items-end gap-4 h-32">
                    <div className="flex-1 flex flex-col items-center justify-end">
                      <div
                        className="w-full max-w-[72px] bg-emerald-500 rounded-t-2xl"
                        style={{
                          height: ((stats.loggedIn || 0) / (stats.total || 1)) * 100 + "%"
                        }}
                      />
                      <div className="mt-3 text-xs text-slate-500">已登录</div>
                      <div className="text-sm font-semibold">{stats.loggedIn}</div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-end">
                      <div
                        className="w-full max-w-[72px] bg-slate-300 rounded-t-2xl"
                        style={{
                          height:
                            (((stats.total - stats.loggedIn) || 0) / (stats.total || 1)) * 100 + "%"
                        }}
                      />
                      <div className="mt-3 text-xs text-slate-500">未登录</div>
                      <div className="text-sm font-semibold">{stats.total - stats.loggedIn}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-3">数据说明</div>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• 自动保存本地数据</li>
                    <li>• 支持重复登录记录</li>
                    <li>• 可查看基础性别统计</li>
                    <li>• 可统计平均年龄</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <h2 className="text-sm font-semibold">用户记录</h2>
                </div>
                <div className="text-xs text-slate-500">
                  共 {stats.total} 条记录
                </div>
              </div>

              {asArray(users).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <div className="text-3xl mb-3">🗂️</div>
                  <div className="text-sm font-medium text-slate-600">暂无用户记录</div>
                  <div className="mt-1 text-xs text-slate-400">
                    请先在左侧录入用户信息并登录
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs text-slate-500">
                          <th className="px-4 py-3 font-medium">姓名</th>
                          <th className="px-4 py-3 font-medium">性别</th>
                          <th className="px-4 py-3 font-medium">年龄</th>
                          <th className="px-4 py-3 font-medium">状态</th>
                          <th className="px-4 py-3 font-medium">登录时间</th>
                          <th className="px-4 py-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {asArray(users).map(function (item, index) {
                          return (
                            <tr
                              key={item.id}
                              className={index !== asArray(users).length - 1 ? "border-b border-slate-100" : ""}
                            >
                              <td className="px-4 py-4 text-sm font-medium text-slate-800">
                                {item.name}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">{item.gender}</td>
                              <td className="px-4 py-4 text-sm text-slate-600">{item.age}</td>
                              <td className="px-4 py-4">
                                <span
                                  className={
                                    "inline-flex px-2.5 py-1 rounded-full text-xs font-medium " +
                                    (item.isLoggedIn
                                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border border-slate-200")
                                  }
                                >
                                  {item.isLoggedIn ? "已登录" : "未登录"}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-500">
                                {formatTime(item.loginAt)}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={function () {
                                      setCurrentUserId(item.id);
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                                  >
                                    查看
                                  </button>

                                  {item.isLoggedIn ? (
                                    <button
                                      onClick={function () {
                                        handleLogout(item.id);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 hover:bg-amber-100"
                                    >
                                      退出
                                    </button>
                                  ) : (
                                    <button
                                      onClick={function () {
                                        handleRelogin(item.id);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-100"
                                    >
                                      重新登录
                                    </button>
                                  )}

                                  <button
                                    onClick={function () {
                                      handleDelete(item.id);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 hover:bg-rose-100"
                                  >
                                    删除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}