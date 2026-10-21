# X 发稿安排表

你在 X 成功提交定时稿，插件自动记一条；不需要再点“记录”。平时只显示一个约 26px 高的小时间按钮，点开才展开 252px 宽的紧凑清单。不改变 X 编辑区或定时表单布局。

## 使用

- 正常在 X 选择时间、确认并提交定时稿，插件观察成功结果并自动记录。仅选时间而未提交不记录；失败不记录。
- 打开 X 的“预排期的帖子”，自动扫描已有安排。首次点小挂件内的 ↻ 时，如果当前页尚未获取过列表，会另开标签页打开 X 列表完成扫描，保留当前编辑草稿。
- 当前页已有列表请求后，↻ 会直接重放 X 本身使用的 FetchScheduledTweets 只读 GET，刷新时间表，不再手填时间。成功新建、改期、取消后也会补读列表。
- 刷新复用 X 自身请求，不硬编码动态查询 ID。请求头只在页面内存中短暂保留，不传给扩展、不写入存储，不读取或导出 Cookie。
- 只显示未来待发布安排；缺失与已到时的记录仍保留备份，不推断发布成功。摘要悬停可看全文。
- ⋯ 中有导出/导入备份。按账号隔离，无账号系统和云同步；手机电脑分别扫描 X 列表获取平台已有安排。私人备注不随扫描转移。

## 安装

Windows Chrome/Edge：下载 [桌面 ZIP](https://github.com/hskelp9527-pixel/x-schedule-board/releases)，解压后在 chrome://extensions 或 edge://extensions 开启开发者模式，加载包含 manifest.json 的目录，再刷新 X。也可直接加载 E:/ClaudeCode/02-tools/x-schedule-board。更新覆盖原目录并重新加载，不要卸载丢失本地记录。

Firefox 使用独立清单，支持目标版本 142+；firefox-unsigned 包尚未 AMO 签名或安卓实机验收，由用户继续手机验收。安卓 Chrome、iPhone Chrome 和 X App 不加载本扩展。Safari ZIP 只是转换源，可使用 Apple 在线 Packager 或 Xcode 转换后签名验证，尚无可安装 Safari 成品。

## 验证与限制

Node.js 22+、Python 3。依次执行 npm ci、npm test、npm run check、npm run test:browser、python scripts/package.py。本地有两个同级插件目录时可运行 npm run test:integration。CI 检查和 tag 发布均执行逻辑、清单、真实扩展浏览器模拟测试及打包白名单检查。

模拟浏览器覆盖成功定时自动记录、失败不记、不新增表单按钮、小挂件尺寸、直接 GET 刷新、取消保留历史、账号隔离和安全文本。真实 X 只读确认列表入口、空列表返回与原有日期表单；非空真实列表/创建/改期/取消返回仍需用户实际使用核对。X 改版的未知格式不会当成空列表覆盖记录。

数据仅在本浏览器 storage.local，只有 storage 权限，无统计和服务器。主代码无第三方运行时依赖。MIT，与 X 无关联。
