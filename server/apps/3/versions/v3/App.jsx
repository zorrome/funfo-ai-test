function App() {
  var API_BASE = typeof window !== "undefined" && window.API_BASE ? window.API_BASE : "";
  var genderOptions = ["男", "女", "其他"];

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function formatTime(value) {
    if (!value) return "-";
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

  function normalizeUser(item) {
    if (!item) return null;
    return {
      id: item.id,
      name: item.name || "",
      gender: item.gender || "",
      age: item.age == null ? "" : Number(item.age),
      isLoggedIn:
        item.is_logged_in === 1 ||
        item.is_logged_in === true ||
        item.isLoggedIn === true,
      loginAt: item.login_at || item.loginAt || "",
      loggedOutAt: item.logged_out_at || item.loggedOutAt || "",
      createdAt: item.created_at || item.createdAt || "",
      updatedAt: item.updated_at || item.updatedAt || ""
    };
  }

  function normalizeStats(data) {
    var value = data || {};
    return {
      total: Number(value.total || 0),
      loggedIn: Number(value.logged_in || value.loggedIn || 0),
      male: Number(value.male || 0),
      female: Number(value.female || 0),
      other: Number(value.other || 0),
      averageAge:
        value.average_age == null || value.average_age === ""
          ? "-"
          : String(value.average_age)
    };
  }

  function apiGet(path) {
    return fetch(API_BASE + path, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    }).then(function (res) {
      return res.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!res.ok) {
          throw new Error(data.error || data.message || "请求失败");
        }
        return data;
      });
    });
  }

  function apiSend(path, method, body) {
    return fetch(API_BASE + path, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!res.ok) {
          throw new Error(data.error || data.message || "请求失败");
        }
        return data;
      });
    });
  }

  function apiDelete(path) {
    return fetch(API_BASE + path, {
      method: "DELETE",
      headers: {
        Accept: "application/json"
      }
    }).then(function (res) {
      return res.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!res.ok) {
          throw new Error(data.error || data.message || "请求失败");
        }
        return data;
      });
    });
  }

  var _useState = useState([]);
  var users = _useState[0];
  var setUsers = _useState[1];

  var _useState2 = useState({
    total: 0,
    loggedIn: 0,
    male: 0,
    female: 0,
    other: 0,
    averageAge: "-"
  });
  var stats = _useState2[0];
  var setStats = _useState2[1];

  var _useState3 = useState({
    name: "",
    gender: "男",
    age: ""
  });
  var form = _useState3[0];
  var setForm = _useState3[1];

  var _useState4 = useState("");
  var currentUserId = _useState4[0];
  var setCurrentUserId = _useState4[1];

  var _useState5 = useState(null);
  var currentUser = _useState5[0];
  var setCurrentUser = _useState5[1];

  var _useState6 = useState("");
  var error = _useState6[0];
  var setError = _useState6[1];

  var _useState7 = useState("");
  var success = _useState7[0];
  var setSuccess = _useState7[1];

  var _useState8 = useState(true);
  var loading = _useState8[0];
  var setLoading = _useState8[1];

  var _useState9 = useState(false);
  var submitting = _useState9[0];
  var setSubmitting = _useState9[1];

  var _useState10 = useState(false);
  var detailLoading = _useState10[0];
  var setDetailLoading = _useState10[1];

  var _useState11 = useState("");
  var actionUserId = _useState11[0];
  var setActionUserId = _useState11[1];

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

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function loadUsers(keepSelection) {
    return apiGet("/api/users").then(function (data) {
      var list = asArray(data.users || data).map(normalizeUser);
      setUsers(list);

      if (!keepSelection) {
        if (!list.length) {
          setCurrentUserId("");
          setCurrentUser(null);
        }
        return list;
      }

      if (!currentUserId) {
        return list;
      }

      var exists = list.some(function (item) {
        return String(item.id) === String(currentUserId);
      });

      if (!exists) {
        setCurrentUserId("");
        setCurrentUser(null);
      }

      return list;
    });
  }

  function loadStats() {
    return apiGet("/api/users/stats").then(function (data) {
      setStats(normalizeStats(data));
      return data;
    });
  }

  function loadCurrentUser(id) {
    if (!id) {
      setCurrentUser(null);
      return Promise.resolve(null);
    }

    setDetailLoading(true);
    return apiGet("/api/users/" + id)
      .then(function (data) {
        var user = normalizeUser(data.user || data);
        setCurrentUser(user);
        return user;
      })
      .catch(function (err) {
        setCurrentUser(null);
        setError(err.message || "获取用户详情失败");
        throw err;
      })
      .finally(function () {
        setDetailLoading(false);
      });
  }

  function refreshAll(options) {
    var config = options || {};
    return Promise.all([
      loadUsers(config.keepSelection !== false),
      loadStats()
    ]);
  }

  useEffect(function () {
    setLoading(true);
    clearMessages();
    refreshAll({ keepSelection: true })
      .catch(function (err) {
        setError(err.message || "初始化数据失败");
      })
      .finally(function () {
        setLoading(false);
      });
  }, []);

  useEffect(function () {
    if (!currentUserId) {
      setCurrentUser(null);
      return;
    }
    loadCurrentUser(currentUserId).catch(function () {
      return null;
    });
  }, [currentUserId]);

  function handleLogin() {
    var name = form.name.trim();
    var age = Number(form.age);

    clearMessages();

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

    setSubmitting(true);
    apiSend("/api/users/login", "POST", {
      name: name,
      gender: form.gender,
      age: age
    })
      .then(function (data) {
        var user = normalizeUser(data.user || data);
        resetForm();
        setCurrentUserId(String(user.id));
        setSuccess("用户登录成功。");
        return refreshAll({ keepSelection: true });
      })
      .catch(function (err) {
        setError(err.message || "登录失败");
      })
      .finally(function () {
        setSubmitting(false);
      });
  }

  function handleLogout(id) {
    clearMessages();
    setActionUserId(String(id));
    apiSend("/api/users/" + id + "/logout", "POST")
      .then(function () {
        if (String(currentUserId) === String(id)) {
          return Promise.all([
            refreshAll({ keepSelection: true }),
            loadCurrentUser(id).catch(function () {
              return null;
            })
          ]);
        }
        return refreshAll({ keepSelection: true });
      })
      .then(function () {
        setSuccess("用户已退出登录。");
      })
      .catch(function (err) {
        setError(err.message || "退出失败");
      })
      .finally(function () {
        setActionUserId("");
      });
  }

  function handleRelogin(id) {
    clearMessages();
    setActionUserId(String(id));
    apiSend("/api/users/" + id + "/relogin", "POST")
      .then(function () {
        setCurrentUserId(String(id));
        return Promise.all([
          refreshAll({ keepSelection: true }),
          loadCurrentUser(id)
        ]);
      })
      .then(function () {
        setSuccess("用户已重新登录。");
      })
      .catch(function (err) {
        setError(err.message || "重新登录失败");
      })
      .finally(function () {
        setActionUserId("");
      });
  }

  function handleDelete(id) {
    clearMessages();
    setActionUserId(String(id));
    apiDelete("/api/users/" + id)
      .then(function () {
        if (String(currentUserId) === String(id)) {
          setCurrentUserId("");
          setCurrentUser(null);
        }
        return refreshAll({ keepSelection: true });
      })
      .then(function () {
        setSuccess("用户记录已删除。");
      })
      .catch(function (err) {
        setError(err.message || "删除失败");
      })
      .finally(function () {
        setActionUserId("");
      });
  }

  function handleViewUser(id) {
    clearMessages();
    setCurrentUserId(String(id));
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
            通过后端接口管理用户登录记录、当前状态与基础统计信息。
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
                ) : success ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                    ✅ {success}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500">
                    ✅ 请填写完整信息后点击登录
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleLogin}
                    disabled={submitting}
                    className={
                      "flex-1 rounded-xl text-sm font-medium py-2.5 " +
                      (submitting
                        ? "bg-slate-300 text-white cursor-not-allowed"
                        : "bg-slate-900 text-white hover:bg-slate-800")
                    }
                  >
                    {submitting ? "提交中..." : "登录"}
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={submitting}
                    className="px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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

                {detailLoading ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                    正在加载用户详情...
                  </div>
                ) : currentUser ? (
                  <div className="rounded-2xl bg-slate-900 text-white p-4">
                    <div className="text-base font-semibold">{currentUser.name}</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
                      <div>
                        <div className="text-slate-400">性别</div>
                        <div className="mt-1 text-white">{currentUser.gender || "-"}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">年龄</div>
                        <div className="mt-1 text-white">{currentUser.age || "-"}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">状态</div>
                        <div className="mt-1 text-white">
                          {currentUser.isLoggedIn ? "已登录" : "未登录"}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">登录时间</div>
                        <div className="mt-1 text-white">{formatTime(currentUser.loginAt)}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                      退出时间：{formatTime(currentUser.loggedOutAt)}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                    暂无选中用户，请从右侧列表中选择查看。
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">总人数</div>
                <div className="mt-2 text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500">已登录</div>
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
                <div className="text-xs text-slate-500">平均年龄</div>
                <div className="mt-2 text-2xl font-bold">{stats.averageAge}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">用户列表</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    数据来源：GET /api/users、GET /api/users/stats
                  </p>
                </div>
                <button
                  onClick={function () {
                    clearMessages();
                    setLoading(true);
                    refreshAll({ keepSelection: true })
                      .catch(function (err) {
                        setError(err.message || "刷新失败");
                      })
                      .finally(function () {
                        setLoading(false);
                      });
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                >
                  刷新数据
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-sm text-slate-500">正在加载用户数据...</div>
              ) : !asArray(users).length ? (
                <div className="p-8">
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                    <div className="text-3xl mb-3">🗂️</div>
                    <div className="text-sm font-medium text-slate-700">暂无用户记录</div>
                    <div className="mt-2 text-xs text-slate-500">
                      请先在左侧录入姓名、性别和年龄后执行登录。
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">姓名</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">性别</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">年龄</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">状态</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">登录时间</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asArray(users).map(function (item, index) {
                        var pending = actionUserId === String(item.id);
                        return (
                          <tr
                            key={item.id}
                            className={
                              index !== asArray(users).length - 1
                                ? "border-b border-slate-100"
                                : ""
                            }
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
                                    handleViewUser(item.id);
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
                                    disabled={pending}
                                    className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                                  >
                                    {pending ? "处理中..." : "退出"}
                                  </button>
                                ) : (
                                  <button
                                    onClick={function () {
                                      handleRelogin(item.id);
                                    }}
                                    disabled={pending}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                  >
                                    {pending ? "处理中..." : "重新登录"}
                                  </button>
                                )}

                                <button
                                  onClick={function () {
                                    handleDelete(item.id);
                                  }}
                                  disabled={pending}
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                >
                                  {pending ? "处理中..." : "删除"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}