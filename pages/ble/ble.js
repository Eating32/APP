/**
 * 蓝牙连接页面
 */
const { BLEState, bleManager } = require('../../utils/ble');

Page({
  data: {
    adapterAvailable: false,
    bleState: BLEState.IDLE,
    devices: [],
    connectedDevice: null,
    connectingDeviceId: '',
  },

  onLoad() {
    this._checkAdapter();
    this._bindBLEEvents();
  },

  onShow() {
    this._checkAdapter();
    this._syncState();
  },

  onUnload() {
    this._unbindBLEEvents();
  },

  // ==================== 蓝牙适配器 ====================
  async _checkAdapter() {
    const available = await bleManager.getAdapterAvailable();
    this.setData({ adapterAvailable: available });
  },

  onAdapterToggle(e) {
    if (e.detail.value) {
      bleManager.init().then((ok) => {
        this.setData({ adapterAvailable: ok });
        if (ok) this._syncState();
      });
    } else {
      bleManager.close();
      this.setData({ adapterAvailable: false, bleState: BLEState.IDLE, devices: [] });
    }
  },

  // ==================== 扫描 ====================
  onScanToggle() {
    if (this.data.bleState === BLEState.SCANNING) {
      bleManager.stopScan();
      this.setData({ bleState: bleManager.state });
      return;
    }
    if (this.data.bleState === BLEState.CONNECTED) return;

    // 确保适配器可用
    bleManager.init().then((ok) => {
      if (!ok) {
        this.setData({ adapterAvailable: false });
        return;
      }
      this.setData({ adapterAvailable: true });
      bleManager.startScan((devices) => {
        this.setData({ devices });
      });
      // 30 秒后自动停止扫描
      this._scanTimer = setTimeout(() => {
        if (bleManager.state === BLEState.SCANNING) {
          bleManager.stopScan();
          this._syncState();
        }
      }, 30000);
    });
  },

  // ==================== 设备点击 ====================
  onDeviceTap(e) {
    const device = e.currentTarget.dataset.device;
    if (!device || !device.deviceId) return;
    if (this.data.bleState === BLEState.CONNECTED || this.data.bleState === BLEState.CONNECTING) return;

    this.setData({ connectingDeviceId: device.deviceId, bleState: BLEState.CONNECTING });
    bleManager.stopScan();

    bleManager.connect(device.deviceId, { name: device.name }).catch((err) => {
      wx.showToast({ title: '连接失败', icon: 'none' });
      this._syncState();
    });
  },

  // ==================== 断开 & 忘记 ====================
  onDisconnect() {
    wx.showModal({
      title: '断开连接',
      content: '确定要断开蓝牙连接吗？',
      success: (res) => {
        if (res.confirm) {
          bleManager.enableAutoReconnect(false);
          bleManager.disconnect();
          this.setData({ connectedDevice: null });
          this._syncState();
        }
      },
    });
  },

  onForgetDevice() {
    wx.showModal({
      title: '忘记设备',
      content: '将清除已保存的设备信息',
      success: (res) => {
        if (res.confirm) {
          bleManager.enableAutoReconnect(false);
          bleManager.disconnect();
          bleManager.forgetDevice();
          this.setData({ connectedDevice: null });
          this._syncState();
        }
      },
    });
  },

  // ==================== 返回 ====================
  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  // ==================== BLE 事件 ====================
  _bindBLEEvents() {
    this._onConnected = (data) => {
      const saved = bleManager.getSavedDevice();
      this.setData({
        bleState: BLEState.CONNECTED,
        connectingDeviceId: '',
        connectedDevice: {
          deviceId: bleManager.deviceId || (data && data.deviceId),
          name: bleManager.deviceName || (data && data.name) || (saved && saved.name) || 'ATK-BLE04',
          rssi: bleManager.deviceRSSI || -50,
        },
      });
      wx.showToast({ title: '连接成功', icon: 'success', duration: 1500 });
    };

    this._onDisconnected = () => {
      this._syncState();
    };

    this._onConnecting = () => {
      this.setData({ bleState: BLEState.CONNECTING });
    };

    this._onError = () => {
      this.setData({ bleState: BLEState.ERROR, connectingDeviceId: '' });
    };

    this._onAdapterOff = () => {
      this.setData({ adapterAvailable: false, bleState: BLEState.ADAPTER_OFF });
    };

    this._onAdapterOn = () => {
      this.setData({ adapterAvailable: true });
      this._syncState();
    };

    bleManager.on('connected', this._onConnected);
    bleManager.on('disconnected', this._onDisconnected);
    bleManager.on('connecting', this._onConnecting);
    bleManager.on('error', this._onError);
    bleManager.on('adapterOff', this._onAdapterOff);
    bleManager.on('adapterOn', this._onAdapterOn);
  },

  _unbindBLEEvents() {
    bleManager.off('connected', this._onConnected);
    bleManager.off('disconnected', this._onDisconnected);
    bleManager.off('connecting', this._onConnecting);
    bleManager.off('error', this._onError);
    bleManager.off('adapterOff', this._onAdapterOff);
    bleManager.off('adapterOn', this._onAdapterOn);
    if (this._scanTimer) clearTimeout(this._scanTimer);
  },

  _syncState() {
    this.setData({
      bleState: bleManager.state,
      adapterAvailable: this.data.adapterAvailable,
    });
    if (bleManager.state === BLEState.CONNECTED) {
      const saved = bleManager.getSavedDevice();
      this.setData({
        connectedDevice: {
          deviceId: bleManager.deviceId || (saved && saved.deviceId),
          name: bleManager.deviceName || (saved && saved.name) || 'ATK-BLE04',
          rssi: bleManager.deviceRSSI || -50,
        },
      });
    }
    if (bleManager.state !== BLEState.CONNECTING) {
      this.setData({ connectingDeviceId: '' });
    }
  },
});
