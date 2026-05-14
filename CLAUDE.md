# KHS耐力补碳计算器 (KHS Endurance Carb Calculator)

## 项目概述
纯客户端的耐力运动补碳计算器，基于 ACSM/ISSN/IOC 运动科学共识。
技术栈: Vite + React + TypeScript + Tailwind CSS v3。

## 开发规范文件路径
- **需求文档**: [dcs/需求文档.md](dcs/需求文档.md)
- **技术规格**: [dcs/技术规格.md](dcs/技术规格.md)
- **设计规范**: [dcs/设计规范.md](dcs/设计规范.md)
- **执行步骤**: [dcs/执行步骤.md](dcs/执行步骤.md)
- **开发日志**: [开发日志/](开发日志/)
- **类型定义**: [src/types/](src/types/)
- **计算引擎**: [src/engine/](src/engine/)
- **产品数据**: [src/data/](src/data/)

## 启动命令
```bash
npm run dev       # 开发服务器 (localhost:5173)
npm run build     # 生产构建
npm run test      # 运行测试
```

## 开发约定
1. UI 文本使用中文，代码标识符使用英文
2. 计算逻辑使用纯 TypeScript 函数，零副作用
3. 样式使用 Tailwind class，不创建额外 CSS 文件
4. 组件按功能分组: layout/ input/ strategy/ results/ ui/
5. 状态管理使用 React Context + useReducer
6. 每次开始新功能前先查看 dcs/ 下的规范文档
7. 每日开发结束后更新 开发日志/
8. 发现逻辑问题或设计缺陷时立即提请用户
