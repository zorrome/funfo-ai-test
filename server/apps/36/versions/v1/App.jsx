function asArray(v) { return Array.isArray(v) ? v : []; }

function App() {
  var STORAGE_KEYS = {
    ingredients: "ingredients",
    price_records: "price_records",
    menu_items: "menu_items"
  };

  var [ingredients, setIngredients] = useState([]);
  var [priceRecords, setPriceRecords] = useState([]);
  var [menuItems, setMenuItems] = useState([]);
  var [activeTab, setActiveTab] = useState("dashboard");

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

  useEffect(function() {
    var savedIngredients = safeParse(localStorage.getItem(STORAGE_KEYS.ingredients), []);
    var savedPriceRecords = safeParse(localStorage.getItem(STORAGE_KEYS.price_records), []);
    var savedMenuItems = safeParse(localStorage.getItem(STORAGE_KEYS.menu_items), []);

    if (savedIngredients.length === 0 && savedPriceRecords.length === 0 && savedMenuItems.length === 0) {
      var seed = createSeedData();
      setIngredients(seed.ingredients);
      setPriceRecords(seed.price_records);
      setMenuItems(seed.menu_items);
      localStorage.setItem(STORAGE_KEYS.ingredients, JSON.stringify(seed.ingredients));
      localStorage.setItem(STORAGE_KEYS.price_records, JSON.stringify(seed.price_records));
      localStorage.setItem(STORAGE_KEYS.menu_items, JSON.stringify(seed.menu_items));
    } else {
      setIngredients(savedIngredients);
      setPriceRecords(savedPriceRecords);
      setMenuItems(savedMenuItems);
    }
  }, []);

  useEffect(function() {
    localStorage.setItem(STORAGE_KEYS.ingredients, JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(function() {
    localStorage.setItem(STORAGE_KEYS.price_records, JSON.stringify(priceRecords));
  }, [priceRecords]);

  useEffect(function() {
    localStorage.setItem(STORAGE_KEYS.menu_items, JSON.stringify(menuItems));
  }, [menuItems]);

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
          return record.ingredient_id === ingredient.id;
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

      var recipeDetails = recipeLines.map(function(line) {
        var ingredient = asArray(ingredients).find(function(ing) {
          return ing.id === line.ingredient_id;
        });
        var latestPrice = latestPricesByIngredient[line.ingredient_id];
        var unitCost = latestPrice ? Number(latestPrice.unit_price || 0) / Number(latestPrice.quantity_basis || 1) : 0;
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
      if (costRate >= 35) status = "danger";
      else if (costRate >= 30) status = "warning";

      return {
        id: item.id,
        name: item.name,
        selling_price: sellingPrice,
        total_cost: totalCost,
        cost_rate: costRate,
        gross_profit: grossProfit,
        recommended_price: recommendedPrice,
        status: status,
        missing_count: missingCount,
        recipe_details: recipeDetails
      };
    });
  }, [menuItems, ingredients, latestPricesByIngredient]);

  var dashboardStats = useMemo(function() {
    var risingCount = ingredientStats.filter(function(stat) { return stat.change_rate > 5; }).length;
    var dangerMenus = menuAnalysis.filter(function(item) { return item.status === "danger"; }).length;
    var warningMenus = menuAnalysis.filter(function(item) { return item.status === "warning"; }).length;

    var averageCostRate = 0;
    if (menuAnalysis.length > 0) {
      averageCostRate = menuAnalysis.reduce(function(sum, item) {
        return sum + Number(item.cost_rate || 0);
      }, 0) / menuAnalysis.length;
    }

    return {
      rising_count: risingCount,
      danger_menus: dangerMenus,
      warning_menus: warningMenus,
      average_cost_rate: averageCostRate
    };
  }, [ingredientStats, menuAnalysis]);

  var priceTrendData = useMemo(function() {
    var map = {};
    asArray(priceRecords).forEach(function(record) {
      if (!map[record.recorded_at]) {
        map[record.recorded_at] = { recorded_at: record.recorded_at };
      }
    });

    var dates = Object.keys(map).sort();
    var featured = asArray(ingredientStats).slice(0, 4);

    dates.forEach(function(date) {
      featured.forEach(function(stat) {
        var sameDate = asArray(stat.records).find(function(record) {
          return record.recorded_at === date;
        });
        map[date][stat.name] = sameDate ? Number(sameDate.unit_price || 0) : null;
      });
    });

    return dates.map(function(date) {
      return map[date];
    });
  }, [priceRecords, ingredientStats]);

  function safeParse(value, fallback) {
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function todayString() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function createId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  }

  function createSeedData() {
    var ingredientsSeed = [
      { id: "ing_tomato", name: "トマト", category: "野菜", unit: "kg", supplier: "青果A" },
      { id: "ing_cheese", name: "モッツァレラ", category: "乳製品", unit: "kg", supplier: "乳業B" },
      { id: "ing_flour", name: "小麦粉", category: "粉類", unit: "kg", supplier: "製粉C" },
      { id: "ing_oil", name: "オリーブオイル", category: "調味料", unit: "L", supplier: "商社D" },
      { id: "ing_chicken", name: "鶏もも肉", category: "肉", unit: "kg", supplier: "精肉E" }
    ];

    var priceSeed = [
      { id: createId("price"), ingredient_id: "ing_tomato", recorded_at: "2024-04-01", unit_price: 480, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_tomato", recorded_at: "2024-05-01", unit_price: 520, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_tomato", recorded_at: "2024-06-01", unit_price: 610, quantity_basis: 1 },

      { id: createId("price"), ingredient_id: "ing_cheese", recorded_at: "2024-04-01", unit_price: 1800, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_cheese", recorded_at: "2024-05-01", unit_price: 1950, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_cheese", recorded_at: "2024-06-01", unit_price: 2100, quantity_basis: 1 },

      { id: createId("price"), ingredient_id: "ing_flour", recorded_at: "2024-04-01", unit_price: 260, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_flour", recorded_at: "2024-05-01", unit_price: 270, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_flour", recorded_at: "2024-06-01", unit_price: 300, quantity_basis: 1 },

      { id: createId("price"), ingredient_id: "ing_oil", recorded_at: "2024-04-01", unit_price: 1400, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_oil", recorded_at: "2024-05-01", unit_price: 1520, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_oil", recorded_at: "2024-06-01", unit_price: 1600, quantity_basis: 1 },

      { id: createId("price"), ingredient_id: "ing_chicken", recorded_at: "2024-04-01", unit_price: 900, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_chicken", recorded_at: "2024-05-01", unit_price: 980, quantity_basis: 1 },
      { id: createId("price"), ingredient_id: "ing_chicken", recorded_at: "2024-06-01", unit_price: 1100, quantity_basis: 1 }
    ];

    var menuSeed = [
      {
        id: "menu_margherita",
        name: "マルゲリータ",
        selling_price: 1280,
        recipe_text: "ing_flour,0.2\ning_tomato,0.12\ning_cheese,0.1\ning_oil,0.02"
      },
      {
        id: "menu_chicken",
        name: "チキンソテー",
        selling_price: 1480,
        recipe_text: "ing_chicken,0.22\ning_tomato,0.08\ning_oil,0.015"
      }
    ];

    return {
      ingredients: ingredientsSeed,
      price_records: priceSeed,
      menu_items: menuSeed
    };
  }

  function parseRecipeText(recipeText) {
    return String(recipeText || "")
      .split("\n")
      .map(function(line) { return line.trim(); })
      .filter(function(line) { return !!line; })
      .map(function(line) {
        var parts = line.split(",");
        return {
          ingredient_id: (parts[0] || "").trim(),
          quantity: Number((parts[1] || "0").trim())
        };
      })
      .filter(function(line) { return !!line.ingredient_id; });
  }

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

  function saveIngredient() {
    if (!ingredientForm.name.trim()) return;

    if (ingredientForm.id) {
      setIngredients(function(prev) {
        return prev.map(function(item) {
          if (item.id !== ingredientForm.id) return item;
          return {
            id: item.id,
            name: ingredientForm.name.trim(),
            category: ingredientForm.category,
            unit: ingredientForm.unit.trim() || "kg",
            supplier: ingredientForm.supplier.trim()
          };
        });
      });
    } else {
      var newIngredient = {
        id: createId("ing"),
        name: ingredientForm.name.trim(),
        category: ingredientForm.category,
        unit: ingredientForm.unit.trim() || "kg",
        supplier: ingredientForm.supplier.trim()
      };
      setIngredients(function(prev) {
        return [newIngredient].concat(prev);
      });
    }
    resetIngredientForm();
  }

  function editIngredient(item) {
    setIngredientForm({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      supplier: item.supplier
    });
    setActiveTab("ingredients");
  }

  function deleteIngredient(id) {
    var usedInMenu = asArray(menuItems).some(function(item) {
      return parseRecipeText(item.recipe_text).some(function(line) {
        return line.ingredient_id === id;
      });
    });
    if (usedInMenu) {
      alert("この食材はメニュー原価計算で使われています。先にレシピを更新してください。");
      return;
    }

    setIngredients(function(prev) {
      return prev.filter(function(item) { return item.id !== id; });
    });
    setPriceRecords(function(prev) {
      return prev.filter(function(record) { return record.ingredient_id !== id; });
    });
  }

  function addPriceRecord() {
    if (!priceForm.ingredient_id || !priceForm.recorded_at || !priceForm.unit_price) return;

    var newRecord = {
      id: createId("price"),
      ingredient_id: priceForm.ingredient_id,
      recorded_at: priceForm.recorded_at,
      unit_price: Number(priceForm.unit_price),
      quantity_basis: Number(priceForm.quantity_basis || 1)
    };

    setPriceRecords(function(prev) {
      return [newRecord].concat(prev);
    });
    resetPriceForm();
  }

  function deletePriceRecord(id) {
    setPriceRecords(function(prev) {
      return prev.filter(function(item) { return item.id !== id; });
    });
  }

  function saveMenuItem() {
    if (!menuForm.name.trim() || !menuForm.selling_price) return;

    var normalized = {
      id: menuForm.id || createId("menu"),
      name: menuForm.name.trim(),
      selling_price: Number(menuForm.selling_price),
      recipe_text: menuForm.recipe_text.trim()
    };

    if (menuForm.id) {
      setMenuItems(function(prev) {
        return prev.map(function(item) {
          return item.id === normalized.id ? normalized : item;
        });
      });
    } else {
      setMenuItems(function(prev) {
        return [normalized].concat(prev);
      });
    }

    resetMenuForm();
  }

  function editMenuItem(item) {
    setMenuForm({
      id: item.id,
      name: item.name,
      selling_price: String(item.selling_price),
      recipe_text: item.recipe_text
    });
    setActiveTab("menus");
  }

  function deleteMenuItem(id) {
    setMenuItems(function(prev) {
      return prev.filter(function(item) { return item.id !== id; });
    });
  }

  var topRiskIngredients = ingredientStats
    .slice()
    .sort(function(a, b) {
      return Number(b.change_rate || 0) - Number(a.change_rate || 0);
    })
    .slice(0, 5);

  var topRiskMenus = menuAnalysis
    .slice()
    .sort(function(a, b) {
      return Number(b.cost_rate || 0) - Number(a.cost_rate || 0);
    })
    .slice(0, 5);

  var costChartData = menuAnalysis.map(function(item) {
    return {
      name: item.name,
      原価率: Number(item.cost_rate.toFixed(1))
    };
  });

  function getStatusBadge(status) {
    if (status === "danger") return "bg-red-50 text-red-700 border-red-200";
    if (status === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  function getStatusLabel(status) {
    if (status === "danger") return "要対策";
    if (status === "warning") return "注意";
    return "健全";
  }

  function TabButton(props) {
    var active = props.value === activeTab;
    return (
      <button
        onClick={function() { setActiveTab(props.value); }}
        className={
          "px-3 py-2 rounded-lg text-sm border transition " +
          (active
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")
        }
      >
        {props.label}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-1">📊 食材コスト管理</div>
              <h1 className="text-2xl font-bold">原価分析アプリ</h1>
              <p className="text-sm text-slate-600 mt-2">
                食材価格の推移と原価率への影響を見える化し、値上げ判断や仕入れ見直しに使えるワークスペースです。
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
              <MetricCard label="値上がり食材" value={dashboardStats.rising_count + "件"} sub="前回比 +5%以上" />
              <MetricCard label="平均原価率" value={dashboardStats.average_cost_rate.toFixed(1) + "%"} sub="全メニュー平均" />
              <MetricCard label="高リスク商品" value={dashboardStats.danger_menus + "件"} sub="原価率 35%以上" />
              <MetricCard label="注意商品" value={dashboardStats.warning_menus + "件"} sub="原価率 30〜35%" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton value="dashboard" label="📈 ダッシュボード" />
          <TabButton value="ingredients" label="🥬 食材マスタ" />
          <TabButton value="prices" label="💴 価格履歴" />
          <TabButton value="menus" label="🍽️ メニュー原価" />
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Panel title="📉 食材価格の推移" helper="登録済み食材のうち先頭4件を時系列表示">
                {priceTrendData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priceTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="recorded_at" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        {asArray(ingredientStats).slice(0, 4).map(function(stat, index) {
                          var colors = ["#0f172a", "#2563eb", "#dc2626", "#16a34a"];
                          return (
                            <Line
                              key={stat.id}
                              type="monotone"
                              dataKey={stat.name}
                              stroke={colors[index % colors.length]}
                              strokeWidth={2}
                              connectNulls={true}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState text="価格履歴がまだありません。" />
                )}
              </Panel>

              <Panel title="🍽️ メニュー別 原価率" helper="最新仕入単価を使って算出">
                {costChartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="原価率" fill="#334155" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState text="メニューがまだありません。" />
                )}
              </Panel>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Panel title="⚠️ 値上がりインパクトが大きい食材" helper="前回比の上昇率順">
                <div className="space-y-3">
                  {topRiskIngredients.length === 0 && <EmptyState text="食材データがありません。" />}
                  {asArray(topRiskIngredients).map(function(item) {
                    return (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-sm">{item.name}</div>
                            <div className="text-xs text-slate-500 mt-1">{item.category} / {item.supplier || "仕入先未設定"}</div>
                          </div>
                          <div className={"text-xs px-2 py-1 rounded-full border " + (item.change_rate > 5 ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200")}>
                            {formatSignedPercent(item.change_rate)}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                          <MiniValue label="最新単価" value={formatCurrency(item.latest_unit_price) + "/" + item.unit} />
                          <MiniValue label="最安値" value={formatCurrency(item.min_price)} />
                          <MiniValue label="最高値" value={formatCurrency(item.max_price)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="🚨 値上げ判断が必要なメニュー" helper="原価率の高い順">
                <div className="space-y-3">
                  {topRiskMenus.length === 0 && <EmptyState text="メニュー分析対象がありません。" />}
                  {asArray(topRiskMenus).map(function(item) {
                    return (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-sm">{item.name}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              売価 {formatCurrency(item.selling_price)} / 粗利 {formatCurrency(item.gross_profit)}
                            </div>
                          </div>
                          <div className={"text-xs px-2 py-1 rounded-full border " + getStatusBadge(item.status)}>
                            {getStatusLabel(item.status)}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                          <MiniValue label="原価" value={formatCurrency(item.total_cost)} />
                          <MiniValue label="原価率" value={item.cost_rate.toFixed(1) + "%"} />
                          <MiniValue label="目安売価" value={formatCurrency(item.recommended_price)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {activeTab === "ingredients" && (
          <div className="grid lg:grid-cols-[360px,1fr] gap-6">
            <Panel title="🥬 食材を登録" helper="カテゴリ・単位・仕入先を管理">
              <div className="space-y-3">
                <FormInput label="食材名" value={ingredientForm.name} onChange={function(v){ setIngredientForm(function(prev){ return Object.assign({}, prev, { name: v }); }); }} placeholder="例: 玉ねぎ" />
                <FormSelect
                  label="カテゴリ"
                  value={ingredientForm.category}
                  options={["野菜", "肉", "魚介", "乳製品", "粉類", "調味料", "飲料", "その他"]}
                  onChange={function(v){ setIngredientForm(function(prev){ return Object.assign({}, prev, { category: v }); }); }}
                />
                <FormInput label="単位" value={ingredientForm.unit} onChange={function(v){ setIngredientForm(function(prev){ return Object.assign({}, prev, { unit: v }); }); }} placeholder="kg / L / 個" />
                <FormInput label="仕入先" value={ingredientForm.supplier} onChange={function(v){ setIngredientForm(function(prev){ return Object.assign({}, prev, { supplier: v }); }); }} placeholder="例: 青果A" />
                <div className="flex gap-2 pt-2">
                  <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm" onClick={saveIngredient}>
                    {ingredientForm.id ? "更新" : "追加"}
                  </button>
                  <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm" onClick={resetIngredientForm}>
                    リセット
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="📚 食材一覧" helper="マスタ編集と現行単価の確認">
              <div className="space-y-3">
                {ingredients.length === 0 && <EmptyState text="食材がまだ登録されていません。" />}
                {asArray(ingredientStats).map(function(item) {
                  return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm">{item.name}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {item.category} / {item.unit} / {item.supplier || "仕入先未設定"}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{formatCurrency(item.latest_unit_price)}/{item.unit}</span>
                          <span className={"text-xs px-2 py-1 rounded-full border " + (item.change_rate > 5 ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200")}>
                            {formatSignedPercent(item.change_rate)}
                          </span>
                          <button className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white" onClick={function(){ editIngredient(item); }}>編集</button>
                          <button className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50" onClick={function(){ deleteIngredient(item.id); }}>削除</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "prices" && (
          <div className="grid lg:grid-cols-[360px,1fr] gap-6">
            <Panel title="💴 価格履歴を追加" helper="仕入れ単価の時系列登録">
              <div className="space-y-3">
                <FormSelect
                  label="食材"
                  value={priceForm.ingredient_id}
                  options={asArray(ingredients).map(function(item){ return item.id; })}
                  optionLabels={asArray(ingredients).reduce(function(acc, item){ acc[item.id] = item.name; return acc; }, {})}
                  onChange={function(v){ setPriceForm(function(prev){ return Object.assign({}, prev, { ingredient_id: v }); }); }}
                />
                <FormInput label="記録日" type="date" value={priceForm.recorded_at} onChange={function(v){ setPriceForm(function(prev){ return Object.assign({}, prev, { recorded_at: v }); }); }} />
                <FormInput label="単価" type="number" value={priceForm.unit_price} onChange={function(v){ setPriceForm(function(prev){ return Object.assign({}, prev, { unit_price: v }); }); }} placeholder="例: 580" />
                <FormInput label="数量基準" type="number" value={priceForm.quantity_basis} onChange={function(v){ setPriceForm(function(prev){ return Object.assign({}, prev, { quantity_basis: v }); }); }} placeholder="例: 1" />
                <p className="text-xs text-slate-500">例: 1kgあたり580円なら 数量基準=1。5kgで2900円なら 単価=2900, 数量基準=5。</p>
                <div className="flex gap-2 pt-2">
                  <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm" onClick={addPriceRecord}>追加</button>
                  <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm" onClick={resetPriceForm}>リセット</button>
                </div>
              </div>
            </Panel>

            <Panel title="🧾 価格履歴一覧" helper="新しい順に表示">
              <div className="space-y-3">
                {priceRecords.length === 0 && <EmptyState text="価格履歴がまだありません。" />}
                {asArray(priceRecords)
                  .slice()
                  .sort(function(a, b) {
                    if (String(a.recorded_at) === String(b.recorded_at)) return 0;
                    return String(a.recorded_at) < String(b.recorded_at) ? 1 : -1;
                  })
                  .map(function(record) {
                    var ingredient = asArray(ingredients).find(function(item) { return item.id === record.ingredient_id; });
                    return (
                      <div key={record.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm">{ingredient ? ingredient.name : "未登録食材"}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {record.recorded_at} / {formatCurrency(record.unit_price)} ÷ {record.quantity_basis} {ingredient ? ingredient.unit : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {formatCurrency(Number(record.unit_price || 0) / Number(record.quantity_basis || 1))}/{ingredient ? ingredient.unit : ""}
                          </span>
                          <button className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50" onClick={function(){ deletePriceRecord(record.id); }}>
                            削除
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "menus" && (
          <div className="grid lg:grid-cols-[360px,1fr] gap-6">
            <Panel title="🍽️ メニュー登録" helper="レシピは 1行ごとに ingredient_id,使用量">
              <div className="space-y-3">
                <FormInput label="メニュー名" value={menuForm.name} onChange={function(v){ setMenuForm(function(prev){ return Object.assign({}, prev, { name: v }); }); }} placeholder="例: オムライス" />
                <FormInput label="売価" type="number" value={menuForm.selling_price} onChange={function(v){ setMenuForm(function(prev){ return Object.assign({}, prev, { selling_price: v }); }); }} placeholder="例: 980" />
                <div>
                  <label className="block text-xs text-slate-500 mb-1">レシピ</label>
                  <textarea
                    className="w-full min-h-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={menuForm.recipe_text}
                    onChange={function(e){ setMenuForm(function(prev){ return Object.assign({}, prev, { recipe_text: e.target.value }); }); }}
                    placeholder={"例:\ning_chicken,0.2\ning_oil,0.01"}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    利用可能な食材ID: {asArray(ingredients).map(function(item){ return item.id; }).join(", ") || "まず食材を登録してください"}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm" onClick={saveMenuItem}>
                    {menuForm.id ? "更新" : "追加"}
                  </button>
                  <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm" onClick={resetMenuForm}>
                    リセット
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="📋 メニュー原価一覧" helper="最新の食材単価で自動計算">
              <div className="space-y-4">
                {menuAnalysis.length === 0 && <EmptyState text="メニューがまだ登録されていません。" />}
                {asArray(menuAnalysis).map(function(item) {
                  return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold text-sm">{item.name}</div>
                            <span className={"text-xs px-2 py-1 rounded-full border " + getStatusBadge(item.status)}>
                              {getStatusLabel(item.status)}
                            </span>
                            {item.missing_count > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                単価未設定 {item.missing_count}件
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                            <MiniValue label="売価" value={formatCurrency(item.selling_price)} />
                            <MiniValue label="原価" value={formatCurrency(item.total_cost)} />
                            <MiniValue label="原価率" value={item.cost_rate.toFixed(1) + "%"} />
                            <MiniValue label="粗利" value={formatCurrency(item.gross_profit)} />
                            <MiniValue label="目安売価" value={formatCurrency(item.recommended_price)} />
                          </div>
                          <div className="mt-4">
                            <div className="text-xs font-semibold text-slate-600 mb-2">使用食材</div>
                            <div className="space-y-2">
                              {asArray(item.recipe_details).map(function(detail, index) {
                                return (
                                  <div key={item.id + "_" + index} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-3 py-2 bg-slate-50">
                                    <div>
                                      {detail.ingredient_name} <span className="text-slate-500">({detail.quantity}{detail.unit})</span>
                                    </div>
                                    <div className={detail.has_price ? "text-slate-700" : "text-amber-700"}>
                                      {detail.has_price ? formatCurrency(detail.line_cost) : "単価未設定"}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex lg:flex-col gap-2">
                          <button className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white" onClick={function(){ editMenuItem(asArray(menuItems).find(function(m){ return m.id === item.id; })); }}>
                            編集
                          </button>
                          <button className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-700 bg-red-50" onClick={function(){ deleteMenuItem(item.id); }}>
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard(props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-[140px]">
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

function formatCurrency(value) {
  return "¥" + Number(value || 0).toLocaleString();
}

function formatSignedPercent(value) {
  var num = Number(value || 0);
  var prefix = num > 0 ? "+" : "";
  return prefix + num.toFixed(1) + "%";
}