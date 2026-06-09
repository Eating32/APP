/**
 * 高级 3D 玻璃拟态摇杆组件
 * 触摸拖动，输出方向指令
 */
Component({
  properties: {
    size: { type: Number, value: 320 },
    disabled: { type: Boolean, value: false },
  },

  data: {
    knobX: 0,
    knobY: 0,
    dragging: false,
    currentDirection: 'stop',
  },

  lifetimes: {
    attached() {
      const s = this.properties.size;
      this._outerRadius = s / 2;
      this._knobRadius = 60;        // 120rpx / 2，与 CSS 一致
      this._maxTravel = this._outerRadius - this._knobRadius - 12;
      this._threshold = this._maxTravel * 0.30;
    },
  },

  methods: {
    onTouchStart(e) {
      if (this.properties.disabled) return;
      this.setData({ dragging: true });
    },

    onTouchMove(e) {
      if (this.properties.disabled || !this.data.dragging) return;

      const touch = e.touches[0];
      const query = this.createSelectorQuery();
      query.select('.joystick-wrap').boundingClientRect((rect) => {
        if (!rect) return;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;

        const scale = this._outerRadius / (rect.width / 2);
        dx *= scale;
        dy *= scale;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this._maxTravel) {
          const r = this._maxTravel / dist;
          dx *= r;
          dy *= r;
        }

        const direction = this._getDirection(dx, dy);

        this.setData({ knobX: dx, knobY: dy, currentDirection: direction });

        if (direction !== this._lastEmitted) {
          this._lastEmitted = direction;
          this.triggerEvent('direction', { direction });
        }
      }).exec();
    },

    onTouchEnd() {
      if (this.properties.disabled) return;
      this.setData({ dragging: false, knobX: 0, knobY: 0, currentDirection: 'stop' });
      this._lastEmitted = null;
      this.triggerEvent('direction', { direction: 'stop' });
    },

    _getDirection(dx, dy) {
      const t = this._threshold;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < t && ady < t) return 'stop';
      if (ady > adx) return dy < -t ? 'forward' : 'backward';
      return dx < -t ? 'left' : 'right';
    },
  },
});
