/**
 * 设备信息卡片组件
 */
Component({
  properties: {
    deviceName: { type: String, value: '设备已连接' },
    deviceModel: { type: String, value: 'ELF Tennis Robot' },
    battery: { type: Number, value: 85 },
    usageTime: { type: String, value: '2h 36min' },
  },

  data: {
    imageLoaded: false,
  },

  methods: {
    onImageLoad() {
      this.setData({ imageLoaded: true });
    },
    onImageError() {
      this.setData({ imageLoaded: false });
    },
  },
});
