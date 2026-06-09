/**
 * Y-Evolution 主页面逻辑
 */
const app = getApp();
const { NavItems } = require('../../utils/constants');

Page({
  data: {
    // 系统状态栏
    currentTime: '12:00',
    phoneBattery: 75,

    // 导航
    navItems: NavItems,
    activeNav: 'control',

    // 设备信息
    deviceName: '设备已连接',
    deviceModel: 'ELF Tennis Robot',
    battery: 85,
    usageTime: '2h 36min',
    statusText: '待机中',

    // 状态胶囊
    statusType: 'idle',       // idle | moving | collecting | serving | shutdown
    statusPillText: '待机中',
    statusDescription: '等待控制指令',

    // 移动控制
    controlModes: ['手动控制', '自动控制'],
    controlModeIndex: 0,

    // 收球
    isCollecting: false,

    // 发球
    serveModes: ['定向球', '随机球'],
    serveModeIndex: 0,
    serveSpeeds: ['低档', '中档', '高档'],
    serveSpeedIndex: 0,
    isServing: false,

    // 总开关
    isShutdown: false,
    isPowered: true, // 默认开机
  },

  onLoad() {
    const g = app.globalData;
    this.setData({
      controlModeIndex: g.controlMode === 'manual' ? 0 : 1,
      isCollecting: g.isCollecting,
      serveModeIndex: g.serveMode === 'directional' ? 0 : 1,
      serveSpeedIndex: ['low', 'medium', 'high'].indexOf(g.serveSpeed),
      isServing: g.isServing,
      isShutdown: g.isShutdown,
    });
    this._refreshStatus();
    this._updateTime();
    this._fetchPhoneBattery();
  },

  onShow() {
    // 每次回到页面刷新时间
    this._updateTime();
    this._fetchPhoneBattery();
  },

  onHide() {
    this._clearTimer();
  },

  onUnload() {
    this._clearTimer();
  },

  // ==================== 系统状态栏 ====================
  _updateTime() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const timeStr = `${h}:${m.toString().padStart(2, '0')}`;
    this.setData({ currentTime: timeStr });
    this._clearTimer();
    // 每分钟更新一次
    this._timeTimer = setInterval(() => {
      const n = new Date();
      const nh = n.getHours();
      const nm = n.getMinutes();
      this.setData({ currentTime: `${nh}:${nm.toString().padStart(2, '0')}` });
    }, 60000);
  },

  _clearTimer() {
    if (this._timeTimer) {
      clearInterval(this._timeTimer);
      this._timeTimer = null;
    }
  },

  _fetchPhoneBattery() {
    try {
      wx.getBatteryInfo({
        success: (res) => {
          this.setData({ phoneBattery: res.level });
        },
        fail: () => {
          // 获取失败保持默认值
        },
      });
    } catch (e) {
      // API 不可用，保持默认值
    }
  },

  // ==================== 移动控制 ====================
  onControlModeChange(e) {
    const { index } = e.detail;
    const mode = index === 0 ? 'manual' : 'auto';
    this.setData({ controlModeIndex: index });
    app.setState('controlMode', mode);
  },

  onJoystickDirection(e) {
    const { direction } = e.detail;
    app.setState('joystickDirection', direction);
    this._refreshStatus();
  },

  // ==================== 收球 ====================
  onCollectToggle() {
    if (!this.data.isPowered) return;
    const toggled = !this.data.isCollecting;
    this.setData({
      isCollecting: toggled,
      isServing: toggled ? false : this.data.isServing,
    });
    app.setState('isCollecting', toggled);
    if (toggled) app.setState('isServing', false);
    this._refreshStatus();
  },

  // ==================== 发球 ====================
  onServeModeChange(e) {
    const { index } = e.detail;
    const mode = index === 0 ? 'directional' : 'random';
    this.setData({ serveModeIndex: index });
    app.setState('serveMode', mode);
  },

  onSpeedChange(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const speeds = ['low', 'medium', 'high'];
    this.setData({ serveSpeedIndex: index });
    app.setState('serveSpeed', speeds[index]);
    this._refreshStatus();
  },

  onServeToggle() {
    if (!this.data.isPowered) return;
    const toggled = !this.data.isServing;
    this.setData({
      isServing: toggled,
      isCollecting: toggled ? false : this.data.isCollecting,
    });
    app.setState('isServing', toggled);
    if (toggled) app.setState('isCollecting', false);
    this._refreshStatus();
  },

  // ==================== 总开关 ====================
  onShutdownToggle(e) {
    const value = e.detail.value;
    this.setData({
      isShutdown: value,
      isCollecting: value ? false : this.data.isCollecting,
      isServing: value ? false : this.data.isServing,
    });
    app.setState('isShutdown', value);
    if (value) {
      app.setState('isCollecting', false);
      app.setState('isServing', false);
    }
    this._refreshStatus();
  },

  // ==================== 底部导航 ====================
  onNavChange(e) {
    const { key } = e.detail;
    this.setData({ activeNav: key });
  },

  // ==================== 状态刷新 ====================
  _refreshStatus() {
    const { isShutdown, isCollecting, isServing, serveSpeedIndex } = this.data;
    const speeds = ['低速', '中速', '高速'];
    const speedLabel = speeds[serveSpeedIndex] || '低速';
    const modeLabel = this.data.serveModeIndex === 0 ? '定向球' : '随机球';

    if (isShutdown) {
      this.setData({
        statusText: '已关闭',
        statusType: 'shutdown',
        statusPillText: '已关闭',
        statusDescription: '发球和收球功能已停止',
      });
    } else if (isCollecting) {
      this.setData({
        statusText: '收球中',
        statusType: 'collecting',
        statusPillText: '收球中',
        statusDescription: '自动回收场地网球',
      });
    } else if (isServing) {
      this.setData({
        statusText: `发球中 · ${speedLabel}`,
        statusType: 'serving',
        statusPillText: '发球中',
        statusDescription: `${modeLabel} · ${speedLabel}`,
      });
    } else if (app.globalData.joystickDirection &&
               app.globalData.joystickDirection !== 'stop') {
      const dirMap = {
        forward: '向前移动',
        backward: '向后移动',
        left: '向左移动',
        right: '向右移动',
      };
      const dirLabel = dirMap[app.globalData.joystickDirection] || '移动中';
      this.setData({
        statusText: '运动中',
        statusType: 'moving',
        statusPillText: '运动中',
        statusDescription: `正在${dirLabel}`,
      });
    } else {
      this.setData({
        statusText: '待机中',
        statusType: 'idle',
        statusPillText: '待机中',
        statusDescription: '等待控制指令',
      });
    }
  },
});
