// 初始化图表
const ctx = document.getElementById("profitChart").getContext("2d")
let profitChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["1个月", "3个月", "6个月", "1年"],
    datasets: [
      {
        data: [300, 900, 1800, 3600],
        backgroundColor: "#2a5caa",
        borderRadius: 0
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => "累计收益: " + ctx.raw + "元"
        }
      }
    },
    scales: {
      y: {
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
let saveNum = 0
function saveScenario() {
  const data = calculate()
  const name = `${data.cabinets}台 × ${data.bottles}瓶`
  savedScenarios.unshift({
    name,
    h1: `保存方案${numberToChinese(++saveNum)}`,
    data
  })

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
                <div class="text">每日销售${item.data.bottles}瓶/天</div>
                <div class="text">运营时长：${getDurationText(item.data.days)}</div>
              </div>
              <div class="saved-sub-desc">
                <div class="text">
                  <span class="tpl">年收益：</span>
                  <span class="box-text">
                    <span class="unit bold">￥</span>
                    <span class="num bold">${item.data.yearly.toLocaleString()}</span>
                  </span>
                </div>
                <div class="text">
                  <span class="tpl">年收益率：</span>
                  <span class="bold">${item.data.roi}%</span>
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
