# X 发稿安排表

本目录是独立的浏览器扩展项目，与祖先目录的毛选应用无关。只处理本项目代码和文档。

- 默认简体中文；无运行时依赖，无服务器，不主动请求 X API，不发布、删除或更改 X 帖子。
- Chrome MV3 与 Firefox 使用独立清单。Safari 源可转换，但未经签名和实机验证不能称为可安装版本。
- 记录时间与确认定时分开；时间经过不等于已经发布；列表缺失不等于已取消。
- 按账号隔离；所有存储写入由 background 排队；备份先完整验证再写入。
- 主 Agent 集中运行 npm test、npm run test:browser、npm run check 和 python scripts/package.py。
- 变更同步版本、CHANGELOG、progress.md 和 feature_list.json。子 Agent 不运行测试或构建。
