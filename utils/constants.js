/**
 * Y-Evolution 网球机器人控制小程序
 * 全局设计常量
 */

// 主色板
const Colors = {
  brandBlue: '#3D7BFF',
  deepBlue: '#234A95',
  lightBlue: '#EAF2FF',
  statusGreen: '#25C06D',
  bgWhite: '#FFFFFF',
  textPrimary: '#1F3C75',
  textSecondary: '#8293B5',
  textSubtitle: '#7F90AF',
  navInactive: '#A0AEC8',

  // 状态胶囊
  idleBg: '#E9F9EF',
  idleText: '#25C06D',
  movingBg: '#EAF2FF',
  movingText: '#3D7BFF',
  collectBg: '#F3EFFF',
  collectText: '#7C3AED',
  serveBg: '#FFF4E6',
  serveText: '#F59E0B',
  shutdownBg: '#F1F3F5',
  shutdownText: '#8293B5',

  // 渐变
  blueGradient: 'linear-gradient(90deg, #4A8CFF, #2F66FF)',
  bgGradient: 'linear-gradient(180deg, #F4F8FF 0%, #EEF3FB 100%)',
  joystickGradient: 'linear-gradient(145deg, #FFFFFF, #EAF1FF)',
};

// 尺寸
const Sizes = {
  headerHeight: '160rpx',
  deviceCardHeight: '260rpx',
  statusCardHeight: '100rpx',
  joystickSize: '320rpx',
  navHeight: '120rpx',
  borderRadius: '28rpx',
  cardRadius: '32rpx',
  navRadius: '40rpx',
  pillRadius: '999rpx',
};

// 间距
const Spacing = {
  module: '20rpx',
};

// 阴影
const Shadows = {
  card: '0 10rpx 40rpx rgba(72, 104, 255, 0.08)',
  joystickOuter: '8rpx 8rpx 30rpx rgba(50, 90, 255, 0.12)',
  joystickInner: 'inset 6rpx 6rpx 18rpx rgba(0, 0, 0, 0.06)',
  powerBtn: '8rpx 8rpx 20rpx rgba(0, 0, 0, 0.08), -8rpx -8rpx 20rpx rgba(255, 255, 255, 0.9)',
  btnHover: '0 8rpx 24rpx rgba(61, 123, 255, 0.3)',
};

// 设备默认值
const DeviceDefaults = {
  deviceName: '设备已连接',
  deviceModel: 'ELF Tennis Robot',
  battery: 85,
  usageTime: '2h 36min',
  status: '待机中',
};

// 导航项
const NavItems = [
  { label: '控制', key: 'control' },
  { label: '状态', key: 'status' },
  { label: '设置', key: 'settings' },
  { label: '我的', key: 'profile' },
];

// BLE 蓝牙配置（ATK-BLE04 模块）
const BLEConfig = {
  serviceUUID: '0000FFF0-0000-1000-8000-00805F9B34FB',
  characteristicWriteUUID: '0000FFF2-0000-1000-8000-00805F9B34FB',  // 手机→设备
  characteristicNotifyUUID: '0000FFF1-0000-1000-8000-00805F9B34FB', // 设备→手机
  deviceName: 'ATK-BLE04',  // 扫描时匹配的设备名
};

// 蓝牙指令码（透传 ASCII 字符）
const BLECommands = {
  forward: '1',       // 前进（按下）
  backward: '4',      // 后退（按下）
  left: '2',          // 左转（按下）
  right: '3',         // 右转（按下）
  stop: '0',          // 松开停止
  stopAll: '5',       // 关闭所有模式
  serve: 'E',         // 开启发球模式
  collect: 'F',       // 开启收球模式
  speedLow: 'A',      // 低速球
  speedMedium: 'B',   // 中速球
  speedHigh: 'C',     // 高速球
  randomBall: 'D',    // 随机球
};

module.exports = {
  Colors,
  Sizes,
  Spacing,
  Shadows,
  DeviceDefaults,
  NavItems,
  BLEConfig,
  BLECommands,
};
