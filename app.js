/**
 * Y-Evolution 网球机器人控制小程序
 * 全局应用入口
 */
const { DeviceDefaults } = require('./utils/constants');

App({
  globalData: {
    // 设备状态
    deviceName: DeviceDefaults.deviceName,
    deviceModel: DeviceDefaults.deviceModel,
    battery: DeviceDefaults.battery,
    usageTime: DeviceDefaults.usageTime,
    status: DeviceDefaults.status,
    isPowered: false,

    // 运动控制
    controlMode: 'manual',    // 'manual' | 'auto'
    joystickDirection: 'stop',

    // 收球
    isCollecting: false,

    // 发球
    serveMode: 'directional', // 'directional' | 'random'
    serveSpeed: 'low',        // 'low' | 'medium' | 'high'
    isServing: false,

    // 总开关
    isShutdown: false,
  },

  /**
   * 更新全局状态
   */
  setState(key, value) {
    if (this.globalData.hasOwnProperty(key)) {
      this.globalData[key] = value;
    }
  },

  /**
   * 切换电源状态
   */
  togglePower() {
    this.globalData.isPowered = !this.globalData.isPowered;
    if (!this.globalData.isPowered) {
      this.globalData.isCollecting = false;
      this.globalData.isServing = false;
    }
    return this.globalData.isPowered;
  },
});
