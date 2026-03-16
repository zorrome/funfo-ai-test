function asArray(v) { return Array.isArray(v) ? v : []; }

function todayString() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function formatCurrency(value) {
  return "¥" + Number(value || 0).toLocaleString();
}

function formatSignedPercent(value) {
  var num = Number(value || 0);
  var prefix = num > 0 ? "+" : "";
  return prefix + num.toFixed(1) + "%";
}

function parseRecipeText(recipeText) {
  return String(recipeText || "")
    .split("\n")
    .map(function(line) { return line.trim(); })
    .filter(function(line) { return !!line; })
    .map(function(line, index) {
      var parts = line.split(",");
      return {
        id: index + 1,
        ingredient_id: (parts[0] || "").trim(),
        quantity: Number((parts[1] || "0").trim() || 0)
      };
    })
    .filter(function(line) { return !!line.ingredient_id; });
}

function getStatusLabel(status) {
  if (status === "danger") return "要見直し";
  if (status === "warning") return "注意";
  return "安定";
}

function getStatusBadge(status) {
  if (status === "danger") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function apiGet(path) {
  return fetch(path, {
    method: "GET",
    headers: { "Accept": "application/json" }
  }).then(function(res) {
    if (!res.ok) {
      return res.json().catch(function(){ return {}; }).then(function(body) {
        throw new Error(body.error || "API error");
      });
    }
    return res.json();
  });
}

function apiSend(path, method, body) {
  return fetch(path, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(body || {})
  }).then(function(res) {
    if (!res.ok) {
      return res.json().catch(function(){ return {}; }).then(function(body) {
        throw new Error(body.error || "API error");
      });
    }
    return res.json();
  });
}

function apiDelete(path) {
  return fetch(path, {
    method: "DELETE",
    headers: { "Accept": "application/json" }
  }).then(function(res) {
    if (!res.ok) {
      return res.json().catch(function(){ return {}; }).then(function(body) {
        throw new Error(body.error || "API error");
      });
    }
    return res.json();
  });
}

function App() {
  var [ingredients, setIngredients] = useState([]);
  var [priceRecords, setPriceRecords] = useState([]);
  var [menuItems, setMenuItems] = useState([]);
  var [dashboardStats, setDashboardStats] = useState({
    ingredient_count: 0,
    price_record_count: 0,
    menu_item_count: 0,
    avg_cost_rate: 0,
    high_risk_menu_count: 0,
    recent_price_change_count: 0
  });

  var [activeTab, setActiveTab] = useState("dashboard");
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState("");

  var [ingredientForm, setIngredientForm] = useState({
    id: null,
    name: "",
    category: "野菜",
    unit: "kg",
    supplier: ""
  });

  var [priceForm, setPriceForm] = useState({
    ingredient_id: "",
    recorded_at: todayString(),
    unit_price: "",
    quantity_basis: "1"
  });

  var [menuForm, setMenuForm] = useState({
    id: null,
    name: "",
    selling_price: "",
    recipe_text: ""
  });

  function resetIngredientForm() {
    setIngredientForm({
      id: null,
      name: "",
      category: "野菜",
      unit: "kg",
      supplier: ""
    });
  }

  function resetPriceForm() {
    setPriceForm({
      ingredient_id: "",
      recorded_at: todayString(),
      unit_price: "",
      quantity_basis: "1"
    });
  }

  function resetMenuForm() {
    setMenuForm({
      id: null,
      name: "",
      selling_price: "",
      recipe_text: ""
    });
  }

  function hydrateDashboard() {
    setLoading(true);
    setError("");
    return apiGet("/api/dashboard")
      .then(function(data) {
        setIngredients(asArray(data.ingredients));
        setPriceRecords(asArray(data.price_records));
        setMenuItems(asArray(data.menu_items));
        setDashboardStats({
          ingredient_count: Number(data.ingredient_count || asArray(data.ingredients).length || 0),
          price_record_count: Number(data.price_record_count || asArray(data.price_records).length || 0),
          menu_item_count: Number(data.menu_item_count || asArray(data.menu_items).length || 0),
          avg_cost_rate: Number(data.avg_cost_rate || 0),
          high_risk_menu_count: Number(data.high_risk_menu_count || 0),
          recent_price_change_count: Number(data.recent_price_change_count || 0)
        });
      })
      .catch(function(err) {
        setError(err.message || "データの読み込みに失敗しました");
        setIngredients([]);
        setPriceRecords([]);
        setMenuItems([]);
      })
      .finally(function() {
        setLoading(false);
      });
  }

  useEffect(function() {
    hydrateDashboard();
  }, []);

  var latestPricesByIngredient = useMemo(function() {
    var map = {};
    asArray(priceRecords).forEach(function(record) {
      var current = map[record.ingredient_id];
      if (!current || String(record.recorded_at) > String(current.recorded_at)) {
        map[record.ingredient_id] = record;
      }
    });
    return map;
  }, [priceRecords]);

  var ingredientStats = useMemo(function() {
    return asArray(ingredients).map(function(ingredient) {
      var records = asArray(priceRecords)
        .filter(function(record) {
          return String(record.ingredient_id) === String(ingredient.id);
        })
        .sort(function(a, b) {
          return String(a.recorded_at).localeCompare(String(b.recorded_at));
        });

      var latest = records[records.length - 1] || null;
      var previous = records[records.length - 2] || null;
      var min = null;
      var max = null;

      records.forEach(function(record) {
        var value = Number(record.unit_price || 0);
        if (min === null || value < min) min = value;
        if (max === null || value > max) max = value;
      });

      var changeRate = 0;
      if (latest && previous && Number(previous.unit_price) > 0) {
        changeRate = ((Number(latest.unit_price) - Number(previous.unit_price)) / Number(previous.unit_price)) * 100;
      }

      return {
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category,
        supplier: ingredient.supplier,
        unit: ingredient.unit,
        latest_unit_price: latest ? Number(latest.unit_price) : 0,
        previous_unit_price: previous ? Number(previous.unit_price) : 0,
        latest_recorded_at: latest ? latest.recorded_at : "",
        change_rate: changeRate,
        min_price: min || 0,
        max_price: max || 0,
        records: records
      };
    });
  }, [ingredients, priceRecords]);

  var menuAnalysis = useMemo(function() {
    return asArray(menuItems).map(function(item) {
      var recipeLines = parseRecipeText(item.recipe_text);
      var totalCost = 0;
      var missingCount = 0;

      var recipeDetails = asArray(recipeLines).map(function(line) {
        var ingredient = asArray(ingredients).find(function(ing) {
          return String(ing.id) === String(line.ingredient_id);
        });
        var latestPrice = latestPricesByIngredient[line.ingredient_id];
        var unitCost = latestPrice ? Number(latestPrice.unit_price || 0) / Number(latestPrice.quantity_basis || 1 || 1) : 0;
        var lineCost = unitCost * Number(line.quantity || 0);

        if (!ingredient || !latestPrice) {
          missingCount += 1;
        }

        totalCost += lineCost;

        return {
          ingredient_id: line.ingredient_id,
          ingredient_name: ingredient ? ingredient.name : "不明な食材",
          quantity: Number(line.quantity || 0),
          unit: ingredient ? ingredient.unit : "",
          line_cost: lineCost,
          has_price: !!latestPrice
        };
      });

      var sellingPrice = Number(item.selling_price || 0);
      var costRate = sellingPrice > 0 ? (totalCost / sellingPrice) * 100 : 0;
      var grossProfit = sellingPrice - totalCost;

      var recommendedPrice = sellingPrice;
      var targetCostRate = 30;
      if (totalCost > 0) {
        recommendedPrice = Math.ceil((totalCost / (targetCostRate / 100)) / 10) * 10;
      }

      var status = "healthy";
      if (costRate >= 35 || missingCount > 0) status = "danger";
      else if (costRate >= 30) status = "warning";

      return {
        id: item.id,
        name: item.name,
        selling_price: sellingPrice,
        recipe_text: item.recipe_text,
        total_cost: totalCost,
        cost_rate: costRate,
        gross_profit: grossProfit,
        recommended_price: recommendedPrice,
        missing_count: missingCount,
        status: status,
        recipe_details: recipeDetails
      };
    });
  }, [menuItems, ingredients, latestPricesByIngredient]);

  var priceTrendData = useMemo(function() {
    return asArray(priceRecords)
      .slice()
      .sort(function(a, b) {
        return String(a.recorded_at).localeCompare(String(b.recorded_at));
      })
      .map(function(record) {
        var ingredient = asArray(ingredients).find(function(ing) {
          return String(ing.id) === String(record.ingredient_id);
        });
        return {
          recorded_at: record.recorded_at,
          unit_price: Number(record.unit_price || 0),
          ingredient_name: ingredient ? ingredient.name : "不明"
        };
      });
  }, [priceRecords, ingredients]);

  function saveIngredient() {
    if (!ingredientForm.name.trim()) {
      setError("原料名を入力してください");
      return;
    }
    setSaving(true);
    setError("");

    var payload = {
      name: ingredientForm.name.trim(),
      category: ingredientForm.category,
      unit: ingredientForm.unit.trim(),
      supplier: ingredientForm.supplier.trim()
    };

    var req = ingredientForm.id
      ? apiSend("/api/ingredients/" + ingredientForm.id, "PUT", payload)
      : apiSend("/api/ingredients", "POST", payload);

    req.then(function(saved) {
      if (ingredientForm.id) {
        setIngredients(function(prev) {
          return asArray(prev).map(function(item) {
            return String(item.id) === String(saved.id) ? saved : item;
          });
        });
      } else {
        setIngredients(function(prev) {
          return asArray(prev).concat([saved]);
        });
      }
      resetIngredientForm();
      return hydrateDashboard();
    }).catch(function(err) {
      setError(err.message || "原料の保存に失敗しました");
    }).finally(function() {
      setSaving(false);
    });
  }

  function editIngredient(item) {
    setIngredientForm({
      id: item.id,
      name: item.name || "",
      category: item.category || "野菜",
      unit: item.unit || "kg",
      supplier: item.supplier || ""
    });
    setActiveTab("ingredients");
  }

  function deleteIngredient(id) {
    setSaving(true);
    setError("");
    apiDelete("/api/ingredients/" + id)
      .then(function() {
        resetIngredientForm();
        return hydrateDashboard();
      })
      .catch(function(err) {
        setError(err.message || "原料の削除に失敗しました");
      })
      .finally(function() {
        setSaving(false);
      });
  }

  function addPriceRecord() {
    if (!priceForm.ingredient_id) {
      setError("対象原料を選択してください");
      return;
    }
    if (!priceForm.recorded_at) {
      setError("記録日を入力してください");
      return;
    }
    setSaving(true);
    setError("");
    apiSend("/api/price-records", "POST", {
      ingredient_id: Number(priceForm.ingredient_id),
      recorded_at: priceForm.recorded_at,
      unit_price: Number(priceForm.unit_price || 0),
      quantity_basis: Number(priceForm.quantity_basis || 1)
    }).then(function(saved) {
      setPriceRecords(function(prev) {
        return asArray(prev).concat([saved]);
      });
      resetPriceForm();
      return hydrateDashboard();
    }).catch(function(err) {
      setError(err.message || "価格記録の追加に失敗しました");
    }).finally(function() {
      setSaving(false);
    });
  }

  function deletePriceRecord(id) {
    setSaving(true);
    setError("");
    apiDelete("/api/price-records/" + id)
      .then(function() {
        return hydrateDashboard();
      })
      .catch(function(err) {
        setError(err.message || "価格記録の削除に失敗しました");
      })
      .finally(function() {
        setSaving(false);
      });
  }

  function saveMenuItem() {
    if (!menuForm.name.trim()) {
      setError("メニュー名を入力してください");
      return;
    }
    setSaving(true);
    setError("");

    var payload = {
      name: menuForm.name.trim(),
      selling_price: Number(menuForm.selling_price || 0),
      recipe_text: menuForm.recipe_text
    };

    var req = menuForm.id
      ? apiSend("/api/menu-items/" + menuForm.id, "PUT", payload)
      : apiSend("/api/menu-items", "POST", payload);

    req.then(function(saved) {
      if (menuForm.id) {
        setMenuItems(function(prev) {
          return asArray(prev).map(function(item) {
            return String(item.id) === String(saved.id) ? saved : item;
          });
        });
      } else {
        setMenuItems(function(prev) {
          return asArray(prev).concat([saved]);
        });
      }
      resetMenuForm();
      return hydrateDashboard();
    }).catch(function(err) {
      setError(err.message || "メニューの保存に失敗しました");
    }).finally(function() {
      setSaving(false);
    });
  }

  function editMenuItem(item) {
    setMenuForm({
      id: item.id,
      name: item.name || "",
      selling_price: String(item.selling_price || ""),
      recipe_text: item.recipe_text || ""
    });
    setActiveTab("menus");
  }

  function deleteMenuItem(id) {
    setSaving(true);
    setError("");
    apiDelete("/api/menu-items/" + id)
      .then(function() {
        resetMenuForm();
        return hydrateDashboard();
      })
      .catch(function(err) {
        setError(err.message || "メニューの削除に失敗しました");
      })
      .finally(function() {
        setSaving(false);
      });
  }

  var topMenus = useMemo(function() {
    return asArray(menuAnalysis)
      .slice()
      .sort(function(a, b) { return b.cost_rate - a.cost_rate; })
      .slice(0, 5);
  }, [menuAnalysis]);

  var recentPriceRecords = useMemo(function() {
    return asArray(priceRecords)
      .slice()
      .sort(function(a, b) {
        return String(b.recorded_at).localeCompare(String(a.recorded_at));
      })
      .slice(0, 8);
  }, [priceRecords]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">📊 値上げ判断や仕入れ見直しに使える原価分析</h1>
            <p className="text-sm text-slate-500 mt-1">
              原料価格の変動、メニュー原価率、値上げ検討ラインをまとめて確認できます。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm hover:bg-slate-50"
              onClick={hydrateDashboard}
              disabled={loading || saving}
            >
              {loading ? "読込中..." : "🔄 更新"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton active={activeTab === "dashboard"} onClick={function(){ setActiveTab("dashboard"); }}>📈 ダッシュボード</TabButton>
          <TabButton active={activeTab === "ingredients"} onClick={function(){ setActiveTab("ingredients"); }}>🥕 原料管理</TabButton>
          <TabButton active={activeTab === "prices"} onClick={function(){ setActiveTab("prices"); }}>💴 価格履歴</TabButton>
          <TabButton active={activeTab === "menus"} onClick={function(){ setActiveTab("menus"); }}>🍽️ メニュー分析</TabButton>
        </div>

        {error && (
          <div className="mb-4 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl px-4 py-3 text-sm">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            <Panel title="読み込み中" helper="API から最新データを取得しています">
              <div className="text-sm text-slate-500">しばらくお待ちください...</div>
            </Panel>
          </div>
        ) : (
          <div>
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard
                    label="登録原料数"
                    value={dashboardStats.ingredient_count + "件"}
                    sub="仕入れ先・カテゴリを管理"
                  />
                  <MetricCard
                    label="価格記録数"
                    value={dashboardStats.price_record_count + "件"}
                    sub="時系列の価格推移"
                  />
                  <MetricCard
                    label="メニュー数"
                    value={dashboardStats.menu_item_count + "件"}
                    sub="販売価格と原価率を確認"
                  />
                  <MetricCard
                    label="高リスクメニュー"
                    value={dashboardStats.high_risk_menu_count + "件"}
                    sub="原価率35%以上または価格未設定"
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <Panel title="📌 判断の目安" helper="ダッシュボードで毎回確認したい主要指標">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <MiniValue label="平均原価率" value={dashboardStats.avg_cost_rate.toFixed(1) + "%"} />
                      <MiniValue label="価格変動のある原料" value={dashboardStats.recent_price_change_count + "件"} />
                      <MiniValue label="値上げ検討対象" value={asArray(topMenus).filter(function(item){ return item.cost_rate >= 30; }).length + "件"} />
                    </div>
                  </Panel>

                  <Panel title="⚠️ 優先確認メニュー" helper="原価率が高い順に表示">
                    {asArray(topMenus).length === 0 ? (
                      <EmptyState text="メニュー分析データがまだありません" />
                    ) : (
                      <div className="space-y-3">
                        {asArray(topMenus).map(function(item) {
                          return (
                            <div key={item.id} className="border border-slate-200 rounded-xl p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold">{item.name}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    原価 {formatCurrency(item.total_cost)} / 売価 {formatCurrency(item.selling_price)}
                                  </div>
                                </div>
                                <div className={"text-xs px-2 py-1 rounded-full border " + getStatusBadge(item.status)}>
                                  {getStatusLabel(item.status)}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-3">
                                <MiniValue label="原価率" value={item.cost_rate.toFixed(1) + "%"} />
                                <MiniValue label="粗利" value={formatCurrency(item.gross_profit)} />
                                <MiniValue label="推奨売価" value={formatCurrency(item.recommended_price)} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>

                  <Panel title="🕒 最新価格記録" helper="最近追加された価格履歴">
                    {asArray(recentPriceRecords).length === 0 ? (
                      <EmptyState text="価格記録がまだありません" />
                    ) : (
                      <div className="space-y-2">
                        {asArray(recentPriceRecords).map(function(record) {
                          var ingredient = asArray(ingredients).find(function(ing) {
                            return String(ing.id) === String(record.ingredient_id);
                          });
                          return (
                            <div key={record.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
                              <div>
                                <div className="text-sm font-medium">{ingredient ? ingredient.name : "不明な原料"}</div>
                                <div className="text-xs text-slate-500">{record.recorded_at}</div>
                              </div>
                              <div className="text-sm font-semibold">{formatCurrency(record.unit_price)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Panel title="📉 原料価格の推移" helper="登録順ではなく記録日順で表示">
                    {asArray(priceTrendData).length === 0 ? (
                      <EmptyState text="チャート表示に必要な価格履歴がありません" />
                    ) : (
                      <div style={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={asArray(priceTrendData)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="recorded_at" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="unit_price" stroke="#0f172a" strokeWidth={2} name="単価" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Panel>

                  <Panel title="📊 メニュー原価率" helper="値上げ判断が必要な順に確認">
                    {asArray(menuAnalysis).length === 0 ? (
                      <EmptyState text="メニューを登録すると原価率を表示できます" />
                    ) : (
                      <div style={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart data={asArray(menuAnalysis)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="cost_rate" fill="#334155" name="原価率(%)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {activeTab === "ingredients" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Panel title="🥕 原料を登録・更新" helper="仕入れ見直しの起点になる原料マスタ">
                  <div className="space-y-3">
                    <FormInput
                      label="原料名"
                      value={ingredientForm.name}
                      onChange={function(value){ setIngredientForm(function(prev){ return { id: prev.id, name: value, category: prev.category, unit: prev.unit, supplier: prev.supplier }; }); }}
                      placeholder="例: 玉ねぎ"
                    />
                    <FormSelect
                      label="カテゴリ"
                      value={ingredientForm.category}
                      onChange={function(value){ setIngredientForm(function(prev){ return { id: prev.id, name: prev.name, category: value, unit: prev.unit, supplier: prev.supplier }; }); }}
                      options={["野菜", "肉", "魚介", "調味料", "穀物", "乳製品", "その他"]}
                    />
                    <FormInput
                      label="単位"
                      value={ingredientForm.unit}
                      onChange={function(value){ setIngredientForm(function(prev){ return { id: prev.id, name: prev.name, category: prev.category, unit: value, supplier: prev.supplier }; }); }}
                      placeholder="kg / g / 本 / 個"
                    />
                    <FormInput
                      label="仕入れ先"
                      value={ingredientForm.supplier}
                      onChange={function(value){ setIngredientForm(function(prev){ return { id: prev.id, name: prev.name, category: prev.category, unit: prev.unit, supplier: value }; }); }}
                      placeholder="例: ○○青果"
                    />
                    <div className="flex gap-2 pt-2">
                      <button className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm" onClick={saveIngredient} disabled={saving}>
                        {saving ? "保存中..." : ingredientForm.id ? "更新する" : "登録する"}
                      </button>
                      <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm" onClick={resetIngredientForm} disabled={saving}>
                        クリア
                      </button>
                    </div>
                  </div>
                </Panel>

                <div className="xl:col-span-2">
                  <Panel title="📋 原料一覧" helper="最新単価・変動率を見ながら仕入れ見直し候補を探せます">
                    {asArray(ingredientStats).length === 0 ? (
                      <EmptyState text="原料がまだ登録されていません" />
                    ) : (
                      <div className="space-y-3">
                        {asArray(ingredientStats).map(function(item) {
                          return (
                            <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-semibold">{item.name}</div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                      {item.category}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    単位: {item.unit || "-"} / 仕入れ先: {item.supplier || "未設定"}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm" onClick={function(){ editIngredient(item); }}>
                                    編集
                                  </button>
                                  <button className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm" onClick={function(){ deleteIngredient(item.id); }}>
                                    削除
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                                <MiniValue label="最新単価" value={formatCurrency(item.latest_unit_price)} />
                                <MiniValue label="前回単価" value={formatCurrency(item.previous_unit_price)} />
                                <MiniValue label="変動率" value={formatSignedPercent(item.change_rate)} />
                                <MiniValue label="最安値" value={formatCurrency(item.min_price)} />
                                <MiniValue label="最高値" value={formatCurrency(item.max_price)} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {activeTab === "prices" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Panel title="💴 価格記録を追加" helper="原料ごとの価格推移を蓄積します">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">対象原料</label>
                      <select
                        value={priceForm.ingredient_id}
                        onChange={function(e){ setPriceForm(function(prev){ return { ingredient_id: e.target.value, recorded_at: prev.recorded_at, unit_price: prev.unit_price, quantity_basis: prev.quantity_basis }; }); }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="">選択してください</option>
                        {asArray(ingredients).map(function(item) {
                          return <option key={item.id} value={item.id}>{item.name}</option>;
                        })}
                      </select>
                    </div>
                    <FormInput
                      label="記録日"
                      type="date"
                      value={priceForm.recorded_at}
                      onChange={function(value){ setPriceForm(function(prev){ return { ingredient_id: prev.ingredient_id, recorded_at: value, unit_price: prev.unit_price, quantity_basis: prev.quantity_basis }; }); }}
                    />
                    <FormInput
                      label="単価"
                      type="number"
                      value={priceForm.unit_price}
                      onChange={function(value){ setPriceForm(function(prev){ return { ingredient_id: prev.ingredient_id, recorded_at: prev.recorded_at, unit_price: value, quantity_basis: prev.quantity_basis }; }); }}
                      placeholder="例: 480"
                    />
                    <FormInput
                      label="数量基準"
                      type="number"
                      value={priceForm.quantity_basis}
                      onChange={function(value){ setPriceForm(function(prev){ return { ingredient_id: prev.ingredient_id, recorded_at: prev.recorded_at, unit_price: prev.unit_price, quantity_basis: value }; }); }}
                      placeholder="例: 1"
                    />
                    <div className="flex gap-2 pt-2">
                      <button className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm" onClick={addPriceRecord} disabled={saving}>
                        {saving ? "保存中..." : "追加する"}
                      </button>
                      <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm" onClick={resetPriceForm} disabled={saving}>
                        クリア
                      </button>
                    </div>
                  </div>
                </Panel>

                <div className="xl:col-span-2">
                  <Panel title="🧾 価格履歴一覧" helper="記録日順に並べて変動を追跡">
                    {asArray(priceRecords).length === 0 ? (
                      <EmptyState text="価格履歴がまだありません" />
                    ) : (
                      <div className="space-y-2">
                        {asArray(priceRecords)
                          .slice()
                          .sort(function(a, b) {
                            return String(b.recorded_at).localeCompare(String(a.recorded_at));
                          })
                          .map(function(record) {
                            var ingredient = asArray(ingredients).find(function(ing) {
                              return String(ing.id) === String(record.ingredient_id);
                            });
                            return (
                              <div key={record.id} className="border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold">{ingredient ? ingredient.name : "不明な原料"}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {record.recorded_at} / 数量基準 {record.quantity_basis}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-sm font-semibold">{formatCurrency(record.unit_price)}</div>
                                  <button className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm" onClick={function(){ deletePriceRecord(record.id); }}>
                                    削除
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {activeTab === "menus" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Panel title="🍽️ メニューを登録・更新" helper="recipe_text は「ingredient_id,quantity」を1行ずつ入力">
                  <div className="space-y-3">
                    <FormInput
                      label="メニュー名"
                      value={menuForm.name}
                      onChange={function(value){ setMenuForm(function(prev){ return { id: prev.id, name: value, selling_price: prev.selling_price, recipe_text: prev.recipe_text }; }); }}
                      placeholder="例: 牛丼"
                    />
                    <FormInput
                      label="販売価格"
                      type="number"
                      value={menuForm.selling_price}
                      onChange={function(value){ setMenuForm(function(prev){ return { id: prev.id, name: prev.name, selling_price: value, recipe_text: prev.recipe_text }; }); }}
                      placeholder="例: 780"
                    />
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">recipe_text</label>
                      <textarea
                        value={menuForm.recipe_text}
                        onChange={function(e){ setMenuForm(function(prev){ return { id: prev.id, name: prev.name, selling_price: prev.selling_price, recipe_text: e.target.value }; }); }}
                        placeholder={"例:\n1,0.15\n2,0.08"}
                        className="w-full min-h-[160px] border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                      />
                      <p className="text-xs text-slate-400 mt-1">原料IDと使用量をカンマ区切りで入力します。</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm" onClick={saveMenuItem} disabled={saving}>
                        {saving ? "保存中..." : menuForm.id ? "更新する" : "登録する"}
                      </button>
                      <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm" onClick={resetMenuForm} disabled={saving}>
                        クリア
                      </button>
                    </div>
                  </div>
                </Panel>

                <div className="xl:col-span-2">
                  <Panel title="📚 メニュー原価分析一覧" helper="値上げ判断やレシピ見直しの優先順位付けに利用">
                    {asArray(menuAnalysis).length === 0 ? (
                      <EmptyState text="メニューがまだ登録されていません" />
                    ) : (
                      <div className="space-y-3">
                        {asArray(menuAnalysis)
                          .slice()
                          .sort(function(a, b) { return b.cost_rate - a.cost_rate; })
                          .map(function(item) {
                            return (
                              <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-semibold">{item.name}</div>
                                      <span className={"text-xs px-2 py-1 rounded-full border " + getStatusBadge(item.status)}>
                                        {getStatusLabel(item.status)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      原価未取得食材: {item.missing_count}件
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm" onClick={function(){ editMenuItem(item); }}>
                                      編集
                                    </button>
                                    <button className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm" onClick={function(){ deleteMenuItem(item.id); }}>
                                      削除
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                  <MiniValue label="売価" value={formatCurrency(item.selling_price)} />
                                  <MiniValue label="推定原価" value={formatCurrency(item.total_cost)} />
                                  <MiniValue label="原価率" value={item.cost_rate.toFixed(1) + "%"} />
                                  <MiniValue label="推奨売価" value={formatCurrency(item.recommended_price)} />
                                </div>

                                <div className="mt-4">
                                  <div className="text-xs text-slate-500 mb-2">レシピ明細</div>
                                  {asArray(item.recipe_details).length === 0 ? (
                                    <EmptyState text="recipe_text が未設定です" />
                                  ) : (
                                    <div className="space-y-2">
                                      {asArray(item.recipe_details).map(function(detail, index) {
                                        return (
                                          <div key={item.id + "-" + index} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                                            <div>
                                              <div className="text-sm">{detail.ingredient_name}</div>
                                              <div className="text-xs text-slate-500">
                                                使用量 {detail.quantity}{detail.unit ? " " + detail.unit : ""}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-sm font-medium">{formatCurrency(detail.line_cost)}</div>
                                              <div className={"text-xs " + (detail.has_price ? "text-emerald-600" : "text-rose-600")}>
                                                {detail.has_price ? "価格取得済み" : "価格未登録"}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </Panel>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton(props) {
  return (
    <button
      onClick={props.onClick}
      className={
        "px-4 py-2 rounded-full text-sm border transition " +
        (props.active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
      }
    >
      {props.children}
    </button>
  );
}

function MetricCard(props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="text-xs text-slate-500">{props.label}</div>
      <div className="text-2xl font-bold mt-1">{props.value}</div>
      <div className="text-xs text-slate-400 mt-1">{props.sub}</div>
    </div>
  );
}

function Panel(props) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{props.title}</h2>
        {props.helper && <p className="text-xs text-slate-500 mt-1">{props.helper}</p>}
      </div>
      <div>{props.children}</div>
    </section>
  );
}

function FormInput(props) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{props.label}</label>
      <input
        type={props.type || "text"}
        value={props.value}
        onChange={function(e){ props.onChange(e.target.value); }}
        placeholder={props.placeholder || ""}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
      />
    </div>
  );
}

function FormSelect(props) {
  var labels = props.optionLabels || {};
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{props.label}</label>
      <select
        value={props.value}
        onChange={function(e){ props.onChange(e.target.value); }}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
      >
        <option value="">選択してください</option>
        {asArray(props.options).map(function(option) {
          return (
            <option key={option} value={option}>
              {labels[option] || option}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function MiniValue(props) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
      <div className="text-xs text-slate-500">{props.label}</div>
      <div className="text-sm font-semibold mt-1">{props.value}</div>
    </div>
  );
}

function EmptyState(props) {
  return (
    <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400 bg-slate-50">
      {props.text}
    </div>
  );
}