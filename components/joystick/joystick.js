/**
 * 高级 3D 玻璃拟态摇杆组件
 * 触摸拖动 + 自动回弹 + 水平仪跟随
 */
Component({
  properties: {
    size: { type: Number, value: 320 },
    disabled: { type: Boolean, value: false },
    // 自动模式：外部传入的摇杆偏移（水平仪）
    autoX: { type: Number, value: 0 },
    autoY: { type: Number, value: 0 },
  },

  data: {
    knobX: 0,
    knobY: 0,
    dragging: false,
    currentDirection: 'stop',
    isAuto: false,           // 是否处于自动模式
  },

  lifetimes: {
    attached() {
      const s = this.properties.size;
      this._outerRadius = s / 2;
      this._knobRadius = 65;        // 130rpx / 2，与 CSS 一致
      this._maxTravel = this._outerRadius - this._knobRadius - 12;
      this._threshold = this._maxTravel * 0.30;
    },
  },

  observers: {
    'autoX, autoY'(x, y) {
      // 自动模式：水平仪数据驱动摇杆位置
      if (this.data.dragging) return;  // 手动拖拽时不让自动覆盖
      const dx = this._clamp(x || 0);
      const dy = this._clamp(y || 0);
      const direction = this._getDirection(dx, dy);
      this.setData({ knobX: dx, knobY: dy, currentDirection: direction });
      if (direction !== this._lastEmitted) {
        this._lastEmitted = direction;
        this.triggerEvent('direction', { direction });
      }
    },
  },

  methods: {
    // ==================== 手动拖拽 ====================
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
      // 第一步：结束拖拽状态，启用 CSS 回弹过渡
      this.setData({ dragging: false });
      // 第二步：延迟一帧后归零，触发回弹动画
      setTimeout(() => {
        if (!this.data.dragging) {
          this.setData({ knobX: 0, knobY: 0, currentDirection: 'stop' });
          if (this._lastEmitted && this._lastEmitted !== 'stop') {
            this._lastEmitted = 'stop';
            this.triggerEvent('direction', { direction: 'stop' });
          }
        }
      }, 30);
    },

    // ==================== 方向计算 ====================
    _getDirection(dx, dy) {
      const t = this._threshold;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < t && ady < t) return 'stop';
      if (ady > adx) return dy < -t ? 'forward' : 'backward';
      return dx < -t ? 'left' : 'right';
    },

    _clamp(val) {
      return Math.max(-this._maxTravel, Math.min(this._maxTravel, val));
    },
  },
});
