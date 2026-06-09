# Y-Evolution 网球陪练机器人控制小程序

基于微信小程序原生框架的智能网球机器人控制系统。

## 功能模块

- **设备信息卡** — 机器人图片、电量环形进度、已用时长
- **状态显示** — 待机中 / 运动中 / 收球中 / 发球中，动态颜色切换
- **移动控制** — 3D 玻璃拟态虚拟摇杆，支持拖拽方向控制，手动/自动模式切换
- **收球功能** — 一键开启/关闭收球
- **发球功能** — 定向球/随机球模式，低/中/高三档球速选择
- **总开关** — iOS 风格开关，一键关闭发球和收球
- **底部导航** — 控制 / 状态 / 设置 / 我的

## 技术栈

- 微信小程序原生框架（WXML + WXSS + JS）
- 组件化开发（4 个独立组件）
- CSS 变量设计系统
- 玻璃拟态 + 新拟态视觉风格

## 项目结构

```
APP/
├── app.js                          # 全局应用入口
├── app.json                        # 全局配置
├── app.wxss                        # 全局样式 + CSS 变量
├── project.config.json             # 项目配置
├── sitemap.json                    # 站点地图
├── pages/
│   └── index/                      # 主控制页面
│       ├── index.wxml
│       ├── index.wxss
│       └── index.js
├── components/
│   ├── joystick/                   # 3D 玻璃拟态摇杆组件
│   ├── device-card/                # 设备信息卡片组件
│   ├── segment-control/            # Apple 风格分段选择器
│   └── bottom-nav/                 # 磨砂玻璃底部导航
├── utils/
│   └── constants.js                # 颜色/尺寸/阴影常量
└── images/
    └── robot.png                   # 机器人图片
```

## 设计规范

| 属性 | 值 |
|---|---|
| 品牌蓝 | `#3D7BFF` |
| 深蓝 | `#234A95` |
| 状态绿 | `#25C06D` |
| 字体 | Microsoft YaHei, PingFang SC |
| 卡片圆角 | 24rpx |
| 卡片边框 | `1px solid #E6ECF7` |
| 按钮圆角 | 999rpx（胶囊形） |

## 快速开始

1. 下载微信开发者工具
2. 导入本项目目录
3. 替换 `project.config.json` 中的 `appid` 为你的小程序 AppID
4. 替换 `images/robot.png` 为实际机器人图片
5. 预览或真机调试

## License

MIT
