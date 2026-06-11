/**
 * Y-Evolution BLE 蓝牙管理模块
 * ATK-BLE04 从机模式 · 透传通信
 * 支持：扫描列表、RSSI、存储、自动重连
 */
const { BLEConfig, BLECommands } = require('./constants');

const STORAGE_KEY = 'ble_device_info';

// 状态枚举
const BLEState = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  ADAPTER_OFF: 'adapter_off',
};

class BLEManager {
  constructor() {
    this._state = BLEState.IDLE;
    this._deviceId = null;
    this._deviceName = '';
    this._deviceMac = '';
    this._deviceRSSI = 0;
    this._isScanning = false;
    this._discoveredDevices = [];      // { deviceId, name, RSSI }
    this._reconnectTimer = null;
    this._reconnectAttempts = 0;
    this._maxReconnect = 5;
    this._autoReconnect = true;
    this._listeners = {};
  }

  /** 注册事件回调 */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  /** 移除事件回调 */
  off(event, callback) {
    if (!this._listeners[event]) return;
    if (callback) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    } else {
      this._listeners[event] = [];
    }
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(cb => {
      try { cb(data); } catch (e) { console.error('[BLE] callback error:', e); }
    });
  }

  get state() { return this._state; }
  get deviceId() { return this._deviceId; }
  get deviceName() { return this._deviceName; }
  get deviceMac() { return this._deviceMac; }
  get deviceRSSI() { return this._deviceRSSI; }
  get discoveredDevices() { return this._discoveredDevices; }

  // ==================== 1. 初始化 ====================
  init() {
    return new Promise((resolve) => {
      wx.openBluetoothAdapter({
        success: () => {
          console.log('[BLE] 蓝牙适配器已打开');
          this._state = BLEState.IDLE;
          wx.onBluetoothAdapterStateChange((res) => {
            if (!res.available) {
              this._state = BLEState.ADAPTER_OFF;
              this._emit('adapterOff');
            } else {
              this._state = BLEState.IDLE;
              this._emit('adapterOn');
            }
          });
          resolve(true);
        },
        fail: (err) => {
          console.error('[BLE] 蓝牙打开失败:', err);
          this._state = BLEState.ADAPTER_OFF;
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

  /** 获取蓝牙适配器是否可用 */
  getAdapterAvailable() {
    return new Promise((resolve) => {
      wx.getBluetoothAdapterState({
        success: (res) => resolve(res.available),
        fail: () => resolve(false),
      });
    });
  }

  // ==================== 2. 搜索设备 ====================
  /** 开始扫描，发现所有 BLE 设备 */
  startScan(callback) {
    if (this._isScanning) return;
    this._isScanning = true;
    this._discoveredDevices = [];
    this._state = BLEState.SCANNING;
    this._emit('scanStart');

    wx.onBluetoothDeviceFound((res) => {
      const devices = res.devices || [];
      devices.forEach(device => {
        const name = device.localName || device.name || '未命名设备';
        const idx = this._discoveredDevices.findIndex(d => d.deviceId === device.deviceId);
        if (idx >= 0) {
          // 更新 RSSI
          this._discoveredDevices[idx].RSSI = device.RSSI;
          this._discoveredDevices[idx].name = name;
        } else {
          this._discoveredDevices.push({
            deviceId: device.deviceId,
            name: name,
            RSSI: device.RSSI,
          });
        }
      });
      this._emit('deviceFound', { devices: this._discoveredDevices });
      if (callback) callback(this._discoveredDevices);
    });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: () => console.log('[BLE] 开始搜索...'),
      fail: (err) => {
        console.error('[BLE] 搜索失败:', err);
        this._isScanning = false;
      },
    });
  }

  stopScan() {
    if (!this._isScanning) return;
    this._isScanning = false;
    wx.stopBluetoothDevicesDiscovery({ success: () => console.log('[BLE] 停止搜索') });
    wx.offBluetoothDeviceFound();
    this._state = BLEState.IDLE;
    this._emit('scanStop', { devices: this._discoveredDevices });
  }

  // ==================== 3. 连接设备 ====================
  async connect(deviceId, deviceInfo = {}) {
    if (this._state === BLEState.CONNECTED || this._state === BLEState.CONNECTING) {
      console.warn('[BLE] 已有连接，请先断开');
      return;
    }
    this._state = BLEState.CONNECTING;
    this._deviceId = deviceId;
    this._emit('connecting', { deviceId });

    try {
      await this._createConnection(deviceId);
      await this._getServices(deviceId);

      this._deviceName = deviceInfo.name || '';
      this._deviceMac = deviceInfo.mac || '';
      this._state = BLEState.CONNECTED;
      this._reconnectAttempts = 0;
      this._emit('connected', {
        deviceId,
        name: this._deviceName,
      });

      // 保存设备信息到本地存储
      this._saveDeviceInfo(deviceId, deviceInfo);

      // 监听断开
      wx.onBLEConnectionStateChange((res) => {
        if (!res.connected) {
          console.log('[BLE] 连接断开');
          this._state = BLEState.DISCONNECTED;
          this._emit('disconnected');
          if (this._autoReconnect) this._tryReconnect();
        }
      });

      // 读取 RSSI
      this._readRSSI(deviceId);
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

  _readRSSI(deviceId) {
    wx.getBLEDeviceRSSI({
      deviceId,
      success: (res) => {
        this._deviceRSSI = res.RSSI;
        this._emit('rssi', { RSSI: res.RSSI });
      },
    });
  }

  // ==================== 4. 存储 ====================
  _saveDeviceInfo(deviceId, deviceInfo) {
    const info = {
      deviceId,
      name: deviceInfo.name || this._deviceName || '',
      mac: deviceInfo.mac || '',
      timestamp: Date.now(),
    };
    try {
      wx.setStorageSync(STORAGE_KEY, info);
      console.log('[BLE] 设备信息已保存');
    } catch (e) {
      console.error('[BLE] 保存失败:', e);
    }
  }

  getSavedDevice() {
    try {
      return wx.getStorageSync(STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  forgetDevice() {
    try {
      wx.removeStorageSync(STORAGE_KEY);
      console.log('[BLE] 已忘记设备');
      return true;
    } catch (e) {
      return false;
    }
  }

  // ==================== 5. 发送指令 ====================
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
      success: () => console.log('[BLE] 发送成功:', char),
      fail: (err) => console.error('[BLE] 发送失败:', char, err),
    });
  }

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

  // ==================== 6. 断线重连 ====================
  enableAutoReconnect(enable) {
    this._autoReconnect = enable;
  }

  _tryReconnect() {
    if (!this._autoReconnect || this._reconnectAttempts >= this._maxReconnect) {
      console.log('[BLE] 重连结束');
      return;
    }
    this._reconnectAttempts++;
    console.log(`[BLE] 第 ${this._reconnectAttempts} 次重连...`);
    this._reconnectTimer = setTimeout(() => {
      if (this._deviceId && this._state === BLEState.DISCONNECTED) {
        this.connect(this._deviceId, {}).catch(() => {});
      }
    }, 2000);
  }

  // ==================== 7. 断开 & 清理 ====================
  disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAttempts = this._maxReconnect;

    if (this._deviceId) {
      wx.closeBLEConnection({ deviceId: this._deviceId });
    }
    this._deviceId = null;
    this._deviceName = '';
    this._discoveredDevices = [];
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
