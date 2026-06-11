/**
 * Y-Evolution 主页面逻辑
 */
const app = getApp();
const { NavItems, BLECommands } = require('../../utils/constants');
const { BLEState, bleManager } = require('../../utils/ble');

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
    statusType: 'idle',
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
    isPowered: true,

    // 蓝牙状态
    bleState: BLEState.IDLE,
    bleDeviceName: '',
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

    // 初始化蓝牙
    this._initBLE();
  },

  onShow() {
    this._updateTime();
    this._fetchPhoneBattery();
  },

  onHide() {
    this._clearTimer();
  },

  onUnload() {
    this._clearTimer();
    bleManager.close();
  },

  // ==================== 系统状态栏 ====================
  _updateTime() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const timeStr = `${h}:${m.toString().padStart(2, '0')}`;
    this.setData({ currentTime: timeStr });
    this._clearTimer();
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
        fail: () => {},
      });
    } catch (e) {}
  },

  // ==================== 蓝牙管理 ====================
  _initBLE() {
    bleManager.on('connected', (data) => {
      this.setData({ bleState: BLEState.CONNECTED, bleDeviceName: 'ATK-BLE04' });
      wx.showToast({ title: '蓝牙已连接', icon: 'success', duration: 1500 });
    });
    bleManager.on('disconnected', () => {
      this.setData({ bleState: BLEState.DISCONNECTED, bleDeviceName: '' });
    });
    bleManager.on('connecting', () => {
      this.setData({ bleState: BLEState.CONNECTING });
    });
    bleManager.on('scanStart', () => {
      this.setData({ bleState: BLEState.SCANNING });
    });
    bleManager.on('error', () => {
      this.setData({ bleState: BLEState.ERROR });
    });
    bleManager.on('adapterOff', () => {
      this.setData({ bleState: BLEState.ERROR });
    });

    // 自动初始化蓝牙适配器
    bleManager.init();
  },

  /** 点击蓝牙按钮 → 跳转到蓝牙连接页面 */
  onBLETap() {
    wx.navigateTo({ url: '/pages/ble/ble' });
  },

  // ==================== 蓝牙指令发送 ====================
  /** 移动控制 */
  _sendDirection(dir) {
    if (bleManager.state !== BLEState.CONNECTED) return;
    const cmdMap = {
      forward: BLECommands.forward,
      backward: BLECommands.backward,
      left: BLECommands.left,
      right: BLECommands.right,
    };
    const cmd = cmdMap[dir];
    if (cmd) {
      // 先停再发新方向（避免方向叠加）
      bleManager.sendCommand(BLECommands.stop);
      setTimeout(() => bleManager.sendCommand(cmd), 30);
    }
  },

  _sendStop() {
    if (bleManager.state !== BLEState.CONNECTED) return;
    bleManager.sendCommand(BLECommands.stop);
  },

  /** 收球 */
  _sendCollect(on) {
    if (bleManager.state !== BLEState.CONNECTED) return;
    if (on) {
      bleManager.sendCommand(BLECommands.collect);
    } else {
      bleManager.sendCommand(BLECommands.stopAll);
    }
  },

  /** 发球 */
  _sendServe(on) {
    if (bleManager.state !== BLEState.CONNECTED) return;
    if (on) {
      const { serveSpeedIndex, serveModeIndex } = this.data;
      const speeds = [BLECommands.speedLow, BLECommands.speedMedium, BLECommands.speedHigh];
      // 先发速度，再发模式（随机球），再发开始发球
      const seq = [];
      seq.push(speeds[serveSpeedIndex] || BLECommands.speedLow);
      if (serveModeIndex === 1) seq.push(BLECommands.randomBall);
      seq.push(BLECommands.serve);
      bleManager.sendSequence(seq.join(''), 50);
    } else {
      bleManager.sendCommand(BLECommands.stopAll);
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
    const prev = app.globalData.joystickDirection;
    app.setState('joystickDirection', direction);

    // 蓝牙指令
    if (direction === 'stop' || !direction) {
      this._sendStop();
    } else if (direction !== prev && direction !== 'stop') {
      this._sendDirection(direction);
    }

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

    this._sendCollect(toggled);
    this._refreshStatus();
  },

  // ==================== 发球 ====================
  onServeModeChange(e) {
    const { index } = e.detail;
    const mode = index === 0 ? 'directional' : 'random';
    this.setData({ serveModeIndex: index });
    app.setState('serveMode', mode);

    // 如果正在发球，模式变更需重新发送指令
    if (this.data.isServing) {
      this._sendServe(true);
    }
  },

  onSpeedChange(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const speeds = ['low', 'medium', 'high'];
    this.setData({ serveSpeedIndex: index });
    app.setState('serveSpeed', speeds[index]);

    // 如果正在发球，速度变更需重新发送指令
    if (this.data.isServing) {
      this._sendServe(true);
    }
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

    this._sendServe(toggled);
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
      bleManager.sendCommand(BLECommands.stopAll);
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
    const { isShutdown, isCollecting, isServing, serveSpeedIndex, controlModeIndex } = this.data;
    const speeds = ['低档', '中档', '高档'];
    const speedLabel = speeds[serveSpeedIndex] || '低档';
    const modeLabel = this.data.serveModeIndex === 0 ? '定向球' : '随机球';
    const ctrlLabel = controlModeIndex === 0 ? '手动' : '自动';

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
        statusDescription: '收球功能：自动回收场地网球',
      });
    } else if (isServing) {
      this.setData({
        statusText: `发球中 · ${speedLabel}`,
        statusType: 'serving',
        statusPillText: '发球中',
        statusDescription: `发球功能：${speedLabel}${modeLabel}`,
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
        statusDescription: `${ctrlLabel}：${dirLabel}`,
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
