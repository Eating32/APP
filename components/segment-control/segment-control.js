/**
 * Apple 风格分段选择器
 */
Component({
  properties: {
    items: {
      type: Array,
      value: [],
    },
    activeIndex: {
      type: Number,
      value: 0,
    },
  },

  methods: {
    onSelect(e) {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      if (index === this.properties.activeIndex) return;
      this.triggerEvent('change', {
        index,
        value: this.properties.items[index],
      });
    },
  },
});
