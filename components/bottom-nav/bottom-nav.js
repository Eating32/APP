/**
 * 磨砂玻璃底部导航栏
 */
Component({
  properties: {
    items: {
      type: Array,
      value: [],
    },
    activeKey: {
      type: String,
      value: 'control',
    },
  },

  methods: {
    onNavTap(e) {
      const key = e.currentTarget.dataset.key;
      if (key === this.properties.activeKey) return;
      this.triggerEvent('change', { key });
    },
  },
});
