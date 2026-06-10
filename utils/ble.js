/**
 * Y-Evolution BLE 蓝牙管理模块
 * ATK-BLE04 从机模式 · 透传通信
 */
const { BLEConfig, BLECommands } = require('./constants');

// 状态枚举
const BLEState = {
  IDLE: 'idle',           // 未初始化
  SCANNING: 'scanning',   // 搜索中
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

class BLEManager {
  constructor() {
    this._state = BLEState.IDLE;
    this._deviceId = null;
    this._isScanning = false;
    this._reconnectTimer = null;
    this._reconnectAttempts = 0;
    this._maxReconnect = 5;
    this._listeners = {};
  }

  /** 注册事件回调 */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(cb => {
      try { cb(data); } catch (e) { console.error('[BLE] callback error:', e); }
    });
  }

  get state() { return this._state; }

  // ==================== 1. 初始化 ====================
  init() {
    return new Promise((resolve) => {
      wx.openBluetoothAdapter({
        success: () => {
          console.log('[BLE] 蓝牙适配器已打开');
          this._state = BLEState.IDLE;
          // 监听适配器状态变化
          wx.onBluetoothAdapterStateChange((res) => {
            if (!res.available) {
              this._state = BLEState.ERROR;
              this._emit('adapterOff');
            }
          });
          resolve(true);
        },
        fail: (err) => {
          console.error('[BLE] 蓝牙打开失败:', err);
          this._state = BLEState.ERROR;
          // 微信可能需要用户授权
          if (err.errCode === 10001) {
            wx.showModal({
              title: '蓝牙未开启',
              content: '请在手机设置中打开蓝牙',
              showCancel: false,
            });
          }
          resolve(false);
        },
      });
    });
  }

  // ==================== 2. 搜索设备 ====================
  startScan(callback) {
    if (this._isScanning) return;
    this._isScanning = true;
    this._state = BLEState.SCANNING;
    this._emit('scanStart');

    // 监听新设备发现
    wx.onBluetoothDeviceFound((res) => {
      const devices = res.devices || [];
      devices.forEach(device => {
        const name = device.localName || device.name || '';
        // 只匹配 ATK-BLE 系列设备
        if (name && (name.includes('ATK-BLE') || name.includes('BLE04'))) {
          console.log('[BLE] 发现目标设备:', name, device.deviceId);
          this.stopScan();
          if (callback) callback(device);
        }
      });
    });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => console.log('[BLE] 开始搜索...'),
      fail: (err) => console.error('[BLE] 搜索失败:', err),
    });
  }

  stopScan() {
    if (!this._isScanning) return;
    this._isScanning = false;
    wx.stopBluetoothDevicesDiscovery({
      success: () => console.log('[BLE] 停止搜索'),
    });
    wx.offBluetoothDeviceFound();
  }

  // ==================== 3. 连接设备 ====================
  async connect(deviceId) {
    if (this._state === BLEState.CONNECTED || this._state === BLEState.CONNECTING) {
      return;
    }
    this._state = BLEState.CONNECTING;
    this._deviceId = deviceId;
    this._emit('connecting');

    try {
      await this._createConnection(deviceId);
      await this._getServices(deviceId);
      this._state = BLEState.CONNECTED;
      this._reconnectAttempts = 0;
      this._emit('connected', { deviceId });

      // 监听断开
      wx.onBLEConnectionStateChange((res) => {
        if (!res.connected) {
          console.log('[BLE] 连接断开');
          this._state = BLEState.DISCONNECTED;
          this._emit('disconnected');
          this._tryReconnect();
        }
      });
    } catch (err) {
      console.error('[BLE] 连接失败:', err);
      this._state = BLEState.ERROR;
      this._emit('error', err);
      throw err;
    }
  }

  _createConnection(deviceId) {
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId,
        timeout: 10000,
        success: () => {
          console.log('[BLE] 连接成功');
          resolve();
        },
        fail: (err) => reject(err),
      });
    });
  }

  _getServices(deviceId) {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        deviceId,
        success: (res) => {
          const target = res.services.find(
            s => s.uuid.toUpperCase().includes('FFF0')
          );
          if (!target) {
            reject(new Error('未找到服务 FFF0'));
            return;
          }
          console.log('[BLE] 找到目标服务:', target.uuid);
          resolve(target.uuid);
        },
        fail: (err) => reject(err),
      });
    });
  }

  // ==================== 4. 发送指令 ====================
  /**
   * 发送单字符指令到机器人
   * @param {string} char - 单个 ASCII 字符，如 '1' 'A' 'E'
   */
  sendCommand(char) {
    if (this._state !== BLEState.CONNECTED || !this._deviceId) {
      console.warn('[BLE] 未连接，无法发送:', char);
      return;
    }
    const buffer = this._str2ab(char);
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: BLEConfig.serviceUUID,
      characteristicId: BLEConfig.characteristicWriteUUID,
      value: buffer,
      success: () => {
        console.log('[BLE] 发送成功:', char);
      },
      fail: (err) => {
        console.error('[BLE] 发送失败:', char, err);
      },
    });
  }

  /** 发送多字符序列（顺序发送，间隔 50ms） */
  sendSequence(chars, interval = 50) {
    if (this._state !== BLEState.CONNECTED) return;
    chars.split('').forEach((c, i) => {
      setTimeout(() => this.sendCommand(c), i * interval);
    });
  }

  _str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i);
    }
    return buf;
  }

  // ==================== 5. 断线重连 ====================
  _tryReconnect() {
    if (this._reconnectAttempts >= this._maxReconnect) {
      console.log('[BLE] 重连次数已达上限');
      return;
    }
    this._reconnectAttempts++;
    console.log(`[BLE] 第 ${this._reconnectAttempts} 次重连...`);
    this._reconnectTimer = setTimeout(() => {
      if (this._deviceId && this._state === BLEState.DISCONNECTED) {
        this.connect(this._deviceId).catch(() => {});
      }
    }, 2000);
  }

  // ==================== 6. 断开 & 清理 ====================
  disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAttempts = this._maxReconnect; // 禁止自动重连

    if (this._deviceId) {
      wx.closeBLEConnection({ deviceId: this._deviceId });
    }
    this._deviceId = null;
    this._state = BLEState.IDLE;
    this._emit('disconnected');
  }

  close() {
    this.disconnect();
    this.stopScan();
    wx.closeBluetoothAdapter();
    this._state = BLEState.IDLE;
    console.log('[BLE] 蓝牙适配器已关闭');
  }
}

// 单例
const bleManager = new BLEManager();

module.exports = {
  BLEState,
  BLECommands,
  bleManager,
};
