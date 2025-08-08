// 初始化图表
const ctx = document.getElementById("profitChart").getContext("2d")
let profitChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["1个月", "3个月", "6个月", "1年"],
    datasets: [
      {
        data: [300, 900, 1800, 3600],
        backgroundColor: "#1b68bc",
        borderRadius: 0,
        borderWidth: 0
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false, // 禁用 tooltip 的颜色显示
        bodyFont: { size: 16 },
        callbacks: {
          title: () => {
            return ""
          }, // 禁用 tooltip 的 title
          label: (ctx) => `${ctx.raw}元`
        }
      }
    },
    // 控制柱子的宽度
    barThickness: 15, // 设置柱状图的宽度
    maxBarThickness: 20, // 去掉过小的限制
    scales: {
      x: {
        grid: {
          drawTicks: false // 绘制刻度线
        }
      },
      y: {
        grid: {
          display: true, // 显示网格线
          drawBorder: true, // 不绘制坐标轴边框
          drawOnChartArea: true, // 不在图表区域内绘制网格线
          drawTicks: false // 绘制刻度线
        },
        beginAtZero: true,
        ticks: { callback: (v) => "￥" + v }
      }
    }
  }
})

// 保存的方案
let savedScenarios = []

// 计算收益
function calculate() {
  const cabinets = parseInt(document.getElementById("cabinetSlider").value)
  const bottles = parseInt(document.querySelector("#bottleBtns .active").dataset.bottles)
  const days = parseInt(document.querySelector("#durationSelect .active").dataset.bottles)

  // 计算收益
  const daily = bottles * 5 * cabinets
  const monthly = daily * 30
  const yearly = monthly * 12
  const roi = Math.round((yearly / (cabinets * 3000)) * 100)

  // 更新显示
  document.getElementById("dailyProfit").textContent = daily
  document.getElementById("monthlyProfit").textContent = monthly
  document.getElementById("yearlyProfit").textContent = yearly.toLocaleString()

  document.getElementById("yearlyProfitRatio").textContent = roi + "%"
  document.getElementById("cabinetValue").textContent = cabinets + "台"

  // 更新图表
  updateChart(monthly)

  return { cabinets, bottles, days, daily, monthly, yearly, roi }
}

// 更新图表
function updateChart(monthlyProfit) {
  profitChart.data.datasets[0].data = [monthlyProfit * 1, monthlyProfit * 3, monthlyProfit * 6, monthlyProfit * 12]
  profitChart.update()
}

// 保存方案
function numberToChinese(num) {
  const chineseNumbers = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
  return num
    .toString()
    .split("")
    .map((digit) => chineseNumbers[digit])
    .join("")
}
function saveScenario() {
  const data = calculate()
  const name = `${data.cabinets}台 × ${data.bottles}瓶`

  // 新建方案对象
  const newScenario = {
    name,
    h1: `保存方案${numberToChinese(savedScenarios.length + 1)}`,
    data
  }
  // 检查是否已有相同的 bottles, cabinets, days
  const isDuplicate = savedScenarios.some((item) => item.data.bottles === newScenario.data.bottles && item.data.cabinets === newScenario.data.cabinets && item.data.days === newScenario.data.days)

  if (isDuplicate) {
    // console.log("数据已保存过了")
    return // 如果是重复的，直接返回
  }

  // 在数组最前面插入新的方案
  savedScenarios.unshift(newScenario)

  // 去重：根据 bottles, cabinets, days 去重
  savedScenarios = savedScenarios
    .reverse()
    .filter((item, index, self) => index === self.findIndex((t) => t.data.bottles === item.data.bottles && t.data.cabinets === item.data.cabinets && t.data.days === item.data.days))
    .reverse() // 再次反转以保持原来的顺序
  // 渲染保存的方案列表
  renderSavedList()
}

// 渲染保存的方案列表
function renderSavedList() {
  const container = document.getElementById("savedList")
  if (savedScenarios.length === 0) {
    container.innerHTML = '<div class="no-saved">暂无保存的方案</div>'
    return
  }
  {
    /* <div class="saved-item">
               <div class="saved-title">${item.name}</div>
               <div class="saved-detail">柜数: ${item.data.cabinets}台 | 销量: ${item.data.bottles}瓶/天</div>
               <div class="saved-detail">时长: ${getDurationText(item.data.days)}</div>
               <div class="saved-profit">年收益: ${item.data.yearly.toLocaleString()}元 (ROI: ${item.data.roi}%)</div>
           </div> */
  }
  container.innerHTML = savedScenarios
    .map(
      (item) => `
           <div class="saved-li">
            <div class="saved-sub-h1">${item.h1}：</div>
            <div class="saved-sub-box">
              <div class="saved-sub-info">
                <div class="text">智能柜数量：${item.data.cabinets}台</div>
                <div class="text">每日销售：${item.data.bottles}瓶/天</div>
                <div class="text">运营时长：${getDurationText(item.data.days)}</div>
              </div>
              <div class="saved-sub-desc">
                <div class="text">
                  <span class="tpl">年收益：</span>
                  <span class="box-text digitText">
                    <span class="unit bold">￥</span>
                    <span class="num bold">${item.data.yearly.toLocaleString()}</span>
                  </span>
                </div>
                <div class="text">
                  <span class="tpl">年收益率：</span>
                  <span class="bold digitText">${item.data.roi}%</span>
                </div>
              </div>
            </div>
          </div>
       `
    )
    .join("")
}

// 获取时长文本
function getDurationText(days) {
  let months = days / 30
  months = months.toFixed(2) // 保留两位小数

  // 如果有小数部分且不等于0，直接显示两位小数
  if (months % 1 === 0) {
    months = parseInt(months) // 如果没有小数部分，取整
  } else {
    months = parseFloat(months) // 如果有小数部分，保留两位小数
  }

  return months >= 12 ? "1年" : months + "个月"
}

// 事件监听
document.getElementById("cabinetSlider").addEventListener("input", function () {
  document.getElementById("cabinetValue").textContent = this.value + "台"
  calculate()
})

document.querySelectorAll("#bottleBtns .btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#bottleBtns .btn").forEach((b) => b.classList.remove("active"))
    this.classList.add("active")
    calculate()
  })
})
document.querySelectorAll("#durationSelect .btn-tag").forEach((btn) => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#durationSelect .btn-tag").forEach((b) => b.classList.remove("active"))
    this.classList.add("active")
    calculate()
  })
})

document.getElementById("saveBtn").addEventListener("click", saveScenario)

// 初始化
calculate()
