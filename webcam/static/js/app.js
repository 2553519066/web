// Vue 实例
new Vue({
  el: "#app",
  data() {
    return {
      doctorId: null,
      isSelect: parseInt(new URLSearchParams(window.location.search).get("isSelect")) || 1,
      videoSrc: decodeURIComponent(new URLSearchParams(window.location.search).get("videoSrc") || ""),
      tabs: [
        {
          id: 1,
          label: "上传驱动素材"
        },
        {
          id: 2,
          label: "形象授权制作"
        },
        {
          id: 3,
          label: "上传文件制作"
        }
      ],
      tipsLabel: ["您的脸部始终清晰可见", "您正视着相机", "朗读句子之间有停顿", "环境安静，且光线充足"],
      stream: null,
      mediaRecorder: null,
      recordedBlobs: [],
      isRecording: false,
      videoUrl: "",
      currentFacingMode: "user",
      isTake: false,
      endTime: 0, //倒计时
      endTimeTwo: 3, //倒计时
      seconds: "", //录像秒数
      isSubmit: false, //多选是否全选状态
      userName: "", //授权的名字
      authorizeLz: false, //是否是在形象授权录制
      tips: "文字检测中...", //视频返回提示文案
      isSbm: false, //视频是否合格
      videoTwo: "", //二次视频文件
      _isDestroyed: false, // 防止组件销毁后执行回调
      times: 3,
      oneTimer: null,
      twoTimer: null,
      mirrorStream: null,
      // 定时器 ID（用于 cancelAnimationFrame）
      oneTimerId: null,
      twoTimerId: null,

      // 倒计时开始时间
      firstStartTime: null,
      secondStartTime: null,

      // 页面是否可见（用于暂停倒计时）
      isPageVisible: true,
      videoShow: true //是否显示视频页面
    }
  },
  beforeDestroy() {
    // 标记组件已销毁，防止异步回调执行
    this._isDestroyed = true

    // 清除定时器
    //     if (this.countdownTimer) clearInterval(this.countdownTimer);
    //     if (this.recordTimer) clearInterval(this.recordTimer);

    //     // 停止录制并释放资源
    //     if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
    //       this.mediaRecorder.stop();
    //     }
    //     if (this.stream) {
    //       this.stream.getTracks().forEach(track => track.stop());
    //     }

    //     this.mediaRecorder = null;
    this.stream = null
  },
  methods: {
    countdown(duration, onTick, onComplete) {
      let timer = setInterval(() => {
        if (duration <= 0) {
          clearInterval(timer) // 清除定时器
          onComplete && onComplete({ mm: "00", ss: "00" }) // 完成时调用
          return
        }

        let mm = Math.floor(duration / 60) // 获取分钟
        let ss = duration % 60 // 获取秒数

        // 补零
        mm = mm < 10 ? "0" + mm : mm
        ss = ss < 10 ? "0" + ss : ss

        duration-- // 每秒减少

        onTick && onTick({ mm, ss }) // 每秒更新
      }, 1000)
    },
    handleSbm() {
      //打开输入名字弹窗
      this.videoShow = false
      document.getElementById("myVideoTwo").style.display = "none"
      document.getElementById("myModal").style.display = "flex"
      document.getElementById("myModal").classList.add("show")
    },
    myModalNone() {
      //关闭输入名字弹窗
      document.getElementById("myVideoTwo").style.display = "block"
      document.getElementById("myModal").style.display = "none"
    },
    authorizeLuzhi() {
      //立即授权录制
      this.userName = document.getElementById("nameInput").value
      // document.getElementById('myVideoTwo').style.display='none';
      console.log(this.userName)
      this.authorizeLz = true

      document.getElementById("tabTwo").style.display = "none"

      document.getElementById("tabOne").style.display = "block"
      document.getElementById("videoUrl").style.display = "none" // 显示 div
      document.getElementById("luzhi").style.display = "block"
      // document.getElementById('tabTwoTop').style.display = 'none'
      // this.seconds= 3; //录像秒数
      this.initCamera()
      this.myModalNone()
    },
    authorizeTijiao() {
      //授权提交
      console.log("状态", this.isSbm)
      if (!this.isSbm) return
      this.uploadFile(this.videoTwo, "/doctor/file/uploadauth")
      console.log("二次确认")
    },
    handleChange(id) {
      this.isSelect = id
    },
    videoChange(videoSrc) {
      if (this.authorizeLz) {
        this.videoTwo = videoSrc
        document.getElementById("tabTwoTop").style.display = "flex"
      } else {
        this.videoSrc = videoSrc
        setTimeout(() => {
          document.getElementById("myVideoTwo").src = videoSrc
        }, 300)
      }

      this.isSelect = 2
      document.getElementById("tabOne").style.display = "none"
      document.getElementById("tabTwo").style.display = "block"
    },
    back() {
      console.log(111, window.parent)
      // window.location.href = "/pages/home/index";
      window.parent.postMessage(
        {
          type: "navigate",
          action: "goHome"
        },
        "*"
      )
    },
    async initCamera() {
      try {
        const video = document.getElementById("video")
        const canvas = document.getElementById("mirrorCanvas")
        const context = canvas.getContext("2d")

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("当前浏览器不支持 mediaDevices.getUserMedia")
        }

        let constraints = {
          video: {
            facingMode: this.currentFacingMode
          },
          audio: true // 如果需要录制声音
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        this.stream = stream

        video.srcObject = stream

        video.onloadedmetadata = () => {
          video.play()

          // 设置 canvas 尺寸与视频一致
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          // 创建非镜像的流
          const mirrorStream = canvas.captureStream()

          // 添加音频轨道（如果需要）
          const audioTrack = stream.getAudioTracks()[0]
          if (audioTrack) {
            mirrorStream.addTrack(audioTrack)
          }

          // 保存非镜像流，用于录制
          this.mirrorStream = mirrorStream

          // 每帧绘制并翻转画面
          const drawFrame = () => {
            context.save()
            context.scale(-1, 1) // 水平翻转（取消镜像）
            context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
            context.restore()
            requestAnimationFrame(drawFrame)
          }

          drawFrame()
        }
      } catch (err) {
        console.error("无法访问摄像头:", err)
        alert(err.message)
      }
    },
    toggleRecord() {
      //开始录制倒计时
      if (!this.isRecording) {
        if (!this.stream) {
          alert("请先打开摄像头")
          return
        }
        this.isTake = true
        this.endTime = 3
        this.countdown(
          this.endTime,
          ({ mm, ss }) => {
            this.endTime = ss * 1
          },
          () => {
            this.endTime = 0
            this.beginVideoPlay()
            this.seconds = `00:05`
            this.countdown(
              5,
              ({ mm, ss }) => {
                this.seconds = `${mm}:${ss}`
              },
              () => {
                this.seconds = ""
                this.beginVideoPlay()
                console.log("倒计时结束")
              }
            )
          }
        )
        return false
        this.oneTimer = setInterval(() => {
          this.endTime = this.endTime - 1
          console.log("倒计时1111", this.endTime)
          if (this.endTime == 0 || this.endTimeTwo == 0) {
            document.getElementById("endTime").style.display = "none"

            // this.endTime = 3;
            this.isTake = false
            this.beginVideoPlay()
            const countdownEl = document.getElementById("countdown")
            if (countdownEl) {
              countdownEl.style.display = "block"

              // 🔥 关键：强制触发重排，让 Safari 立即渲染
              countdownEl.offsetHeight // 任意读取 layout 属性即可
            }
            // document.getElementById('countdown').style.display = 'block'
            this.seconds = 3
            this.times = 3
            // alert('元素',countdownEl.innerText)
            this.twoTimer = setInterval(() => {
              // alert('显示',this.seconds)
              this.seconds = this.seconds - 1
              // this.times--;
              if (this.seconds == 0) {
                clearInterval(this.twoTimer)
                clearInterval(this.oneTimer)
                this.beginVideoPlay()
                document.getElementById("countdown").style.display = "none"
              }
            }, 1000)
          }
        }, 1000)
        // 启动第一个倒计时
        // this.startFirstCountdown();
      }
    },
    startFirstCountdown() {
      this.firstStartTime = performance.now()

      const step = (timestamp) => {
        const elapsed = timestamp - this.firstStartTime
        const secondsElapsed = Math.floor(elapsed / 1000)

        // 更新倒计时
        this.endTime = 3 - secondsElapsed

        if (this.endTime <= 0) {
          // 倒计时结束
          this.handleFirstCountdownEnd()
          return
        }

        // 继续下一帧
        this.oneTimerId = requestAnimationFrame(step)
      }

      this.oneTimerId = requestAnimationFrame(step)
    },

    handleFirstCountdownEnd() {
      const endTimeEl = document.getElementById("endTime")
      if (endTimeEl) {
        endTimeEl.style.display = "none"
      }
      this.isTake = false
      this.beginVideoPlay() // 开始录制/播放

      // 显示第二个倒计时
      const countdownEl = document.getElementById("countdown")
      if (countdownEl) {
        countdownEl.style.display = "block"
      }
      this.seconds = 5
      this.times = 3

      // 启动第二个倒计时
      this.startSecondCountdown()
    },

    startSecondCountdown() {
      this.secondStartTime = performance.now()

      const step = (timestamp) => {
        const elapsed = timestamp - this.secondStartTime
        const secondsElapsed = Math.floor(elapsed / 1000)

        this.seconds = 5 - secondsElapsed
        this.times = 3 - secondsElapsed

        if (this.seconds <= 0) {
          // 第二个倒计时结束
          this.handleSecondCountdownEnd()
          return
        }

        this.twoTimerId = requestAnimationFrame(step)
      }

      this.twoTimerId = requestAnimationFrame(step)
    },

    handleSecondCountdownEnd() {
      this.beginVideoPlay() // 可能是结束录制或切换状态
      const countdownEl = document.getElementById("countdown")
      if (countdownEl) {
        countdownEl.style.display = "none"
      }
      this.isRecording = false // 可选：重置录制状态
    },
    beginVideoPlay() {
      //开始录制并拿结果
      // 开始录制并拿结果
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        this.recordedBlobs = []
        this.mediaRecorder = new MediaRecorder(this.mirrorStream, {
          // ✅ 使用 mirrorStream
          mimeType: "video/webm"
        })

        this.mediaRecorder.ondataavailable = (event) => {
          if (this._isDestroyed) return
          if (event.data && event.data.size > 0) {
            this.recordedBlobs.push(event.data)
          }
        }

        this.mediaRecorder.onstop = () => {
          if (this._isDestroyed) return
          const superBuffer = new Blob(this.recordedBlobs, {
            type: "video/webm"
          })
          let url = URL.createObjectURL(superBuffer)
          this.urlFuzhi(url) // 你可以在这里设置视频预览或上传
        }

        this.mediaRecorder.start()
        this.isRecording = true
      } else {
        this.mediaRecorder.stop()
        this.isRecording = false
      }
    },
    urlFuzhi(url) {
      // 获取 video 元素
      const videoElement = document.getElementById("myVideo")
      console.log("看看", videoElement)
      videoElement.src = url
      if (!this.authorizeLz) {
        this.videoSrc = url
        let container = document.getElementById("circleGrid")
        this.tipsLabel.forEach((label, index) => {
          const option = document.createElement("div")
          option.classList.add("option")
          option.dataset.index = index
          option.dataset.label = label
          const circle = document.createElement("div")
          circle.classList.add("circle")
          circle.dataset.index = index
          circle.dataset.label = label
          // 添加对号元素
          const checkmark = document.createElement("div")
          checkmark.classList.add("checkmark")
          checkmark.textContent = "✓" // 使用 ✓ 字符作为对号
          circle.appendChild(checkmark)
          const labelEl = document.createElement("div")
          labelEl.classList.add("label")
          labelEl.textContent = label
          // 点击整行都可以切换选中状态
          option.addEventListener("click", () => {
            circle.classList.toggle("selected")
            this.updateSubmitButtonState() // 更新提交按钮状态
          })
          option.appendChild(circle)
          option.appendChild(labelEl)
          container.appendChild(option)
        })
        // 初始化时检查一次按钮状态
        this.updateSubmitButtonState()
      } else {
        this.videoTwo = url
        this.checkDoctorAuth(this.doctorId, this.userName)
        document.getElementById("tips").innerText = "文字检测中..."
      }
      this.stopCamera()
      console.log(111, videoElement)
      document.getElementById("videoUrl").style.display = "flex" // 显示 div
      document.getElementById("luzhi").style.display = "none"
      this.isRecording = false
    },
    // 关闭摄像头 (适用于 H5)
    stopCamera() {
      if (this.stream) {
        const tracks = this.stream.getTracks()
        tracks.forEach((track) => track.stop())
        this.stream = null
        // this.videoSrc = null;
      }
      // this.showWebcam = false;
    },
    updateSubmitButtonState() {
      //是否选择
      const selectedCount = document.querySelectorAll(".circle.selected").length
      const button = document.getElementById("submitBtn")
      if (selectedCount === this.tipsLabel.length) {
        console.log("全部")
        this.isSubmit = true
        button.classList.add("btn")
        button.classList.remove("btn1")
      } else {
        this.isSubmit = false
        button.classList.remove("btn")
        button.classList.add("btn1")
      }
      document.getElementById("videoUrl").style.display = "flex"
    },
    handleDel() {
      //删除视频从新录制
      console.log(1111)
      this.initCamera()
      this.videoSrc = ""
      document.getElementById("myVideo").src = ""
      document.getElementById("videoUrl").style.display = "none" // 显示 div
      document.getElementById("luzhi").style.display = "block"

      // document.getElementById('tabTwo').style.display='none';

      // isTake&&!isRecording
      if (this.authorizeLz) {
        document.getElementById("tabTwoTop").style.display = "none"
        this.isTake = false
        this.isRecording = false
        // document.getElementById('tabTwo').remove('disflexShu')
      } else {
        document.getElementById("circleGrid").innerHTML = ""
      }
    },
    async getflip() {
      if (!this.stream) {
        alert("请先打开摄像头")
        return
      }
      // 切换摄像头方向
      this.currentFacingMode = this.currentFacingMode == "user" ? "environment" : "user"
      // 重新初始化摄像头
      this.initCamera()
    },
    handelClose() {
      console.log("关闭")
    },
    updateVideo() {
      if (!this.isSubmit) return
      this.uploadFile(this.videoSrc, "/doctor/file/uploaddrive")
      console.log("-------------------------------------------------------------")
    },
    //原生上传文件接口
    uploadFile(file, url) {
      // let that=this;
      if (!file) {
        alert("请上传视频文件")
        return
      }

      fetch(file)
        .then((res) => {
          if (!res.ok) throw new Error("获取视频失败")
          return res.blob()
        })
        .then((blob) => {
          // 2. 创建一个 File 对象（模拟视频文件）
          let videoFile = new File([blob], "video.mp4", {
            type: blob.type || "video/mp4"
          })

          // 3. 构造 FormData
          let formData = new FormData()
          formData.append("file", videoFile) // 视频文件
          formData.append("doctorId", this.doctorId) // 医生ID
          if (this.authorizeLz) {
            document.getElementById("shouquantijiao").disabled = true
          } else {
            document.getElementById("submitBtn").disabled = true
          }

          // 4. 发起上传请求
          fetch(`http://47.108.20.93:26111/api${url}`, {
            method: "POST",
            body: formData
          })
            .then((res) => res.json())
            .then((obj) => {
              console.log("上传成功:", obj)
              if (obj.status == 0) {
                // alert('上传成功');
                // this.videoUrl=obj.data
                this.videoChange(obj.data) //要注释的
              }
              // alert('上传成功');
            })
            .catch((err) => {
              console.error("上传失败:", err)
              alert("上传失败")
            })
            .finally(() => {
              if (this.authorizeLz) {
                document.getElementById("shouquantijiao").disabled = false
              } else {
                document.getElementById("submitBtn").disabled = false
              }
            })
        })
    },
    checkDoctorAuth(doctorId, doctorName) {
      //医生检测
      const url = `http://47.108.20.93:26111/api/doctor/isdoctorauth?doctorId=${encodeURIComponent(doctorId)}&doctorName=${encodeURIComponent(doctorName)}`

      var xhr = new XMLHttpRequest()
      xhr.open("GET", url, true)
      xhr.setRequestHeader("Content-Type", "application/json")
      let that = this
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            var res = JSON.parse(xhr.responseText)
            console.log("请求成功:", res)
            if (res?.data) {
              that.isSbm = true
              document.getElementById("tips").innerText = "授权文字内容检测一致"
              document.getElementById("shouquantijiao").classList.add("btn2")
            } else {
              that.isSbm = false
              document.getElementById("shouquantijiao").classList.add("btn1")
              document.getElementById("tips").innerText = "您上传的授权视频不符合要求，请按脚本的内容清晰阅读"
            }
          } catch (e) {
            console.error("JSON 解析失败:", e)
          }
        } else {
          console.error("请求失败，状态码:", xhr.status)
        }
      }

      xhr.onerror = function () {
        console.error("网络错误")
      }

      xhr.send()
    },
    saveDoctorClone(params) {
      const url = "http://47.108.20.93:26111/api/doctor/savedoctorclone"

      // 设置请求头（根据后端要求调整）
      const headers = {
        "Content-Type": "application/json;charset=UTF-8"
      }

      // 发起 fetch 请求
      return fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(params)
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("网络请求失败")
          }
          return response.json() // 假设返回的是 JSON 数据
        })
        .then((res) => {
          // return Promise.resolve(data); // 成功返回数据
          console.log("创建", res)
          if (res.status === 0) {
            // uni.showToast({
            // 	title: "创建数字人成功",
            // 	icon: "none"
            // })
            this.isSelect = 3
            document.getElementById("tabThree").style.display = "flex"
            document.getElementById("tabOne").style.display = "none"
            document.getElementById("tabTwo").style.display = "none"
            // setTimeout(() => {
            // 	uni.reLaunch({
            // 		url: "/pages/home/index"
            // 	})
            // }, 1000)
          }
        })
        .catch((error) => {
          console.error("请求出错:", error)
          return Promise.reject(error) // 错误抛出
        })
    },

    //提交禅镜
    createCustomisedPerson(data) {
      console.log("禅境")
      const accessToken = localStorage.getItem("AccessToken") // 替换 uni.getStorageSync
      const url = "/chanjing/api/open/v1/create_customised_person"

      return new Promise((resolve, reject) => {
        fetch(url, {
          method: "POST",
          headers: {
            access_token: accessToken || "",
            "Content-Type": "application/json; charset=utf-8"
          },
          body: JSON.stringify(data)
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok")
            }
            return response.json()
          })
          .then((res) => {
            const code = res?.code || 0
            const msg = res?.msg
            if (code === 0) {
              resolve(res)
            } else if (code !== 1) {
              reject({
                code,
                msg
              })
            }
          })
          .catch((error) => {
            reject({
              code: -1,
              msg: error.message
            })
          })
      })
    },

    // 获取 URL 参数
    getUrlParams(url) {
      let params = {}
      let parser = new URL(url)
      for (let [key, value] of parser.searchParams) {
        params[key] = value
      }
      return params
    },
    //提交到禅镜
    zenmirrorTijiao() {
      console.log("总提交", this.videoSrc)
      if (!this.videoSrc) return
      // 上传禅境返回id
      let parms = {
        name: this.doctorId,
        material_video: this.videoSrc,
        callback: "https://xx.com",
        train_type: ""
      }
      let that = this
      that.createCustomisedPerson(parms).then((res) => {
        if (res?.code === 0) {
          let doctorCloneDTO = {
            cloneId: res.data,
            doctorId: that.doctorId
          }
          console.log(that)
          that.saveDoctorClone(doctorCloneDTO)
        }
      })
    }
  },
  mounted() {
    let param = this.getUrlParams(window.location.href)
    // if (isSelect) {
    // 	console.log(videoSrc);
    // 	this.isSelect = parseInt(isSelect);
    // 	this.videoSrc = decodeURIComponent(videoSrc);
    // }
    // this.videoChange('http://tuozhen1.oss-cn-beijing.aliyuncs.com/Aizz/doctor/9000035/drive.mp4') //要注释的
    this.doctorId = param.doctorId
    // document.getElementById('luzhi').style.display='none';
    // document.getElementById('videoUrl').style.display='flex'
    // document.getElementById('myVideo').src='http://tuozhen1.oss-cn-beijing.aliyuncs.com/Aizz/doctor/9000035/drive.mp4';
    console.log("ID", param)
    if (param.videoSrc) {
      this.urlFuzhi(JSON.parse(param.videoSrc))
    }
    setTimeout(() => {
      this.initCamera()
    }, 300)
  }
})
