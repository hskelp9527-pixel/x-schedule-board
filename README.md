# X 发稿安排表

在 X 上记下定时发稿时间，发下一篇之前看一眼，避免反复翻找已经占用的时间。

## 使用

- X 右上侧「发稿安排」打开时间表，支持未来安排 / 全部记录。
- 在 X 定时日期窗口点「记录此时间」，读取 Month / Day / Year / Hour / Minute 的实际选项。中英文表单都支持；不能识别时明确报错，改用「记时间」手动记录。
- 「记时间」只记录本地安排，不替你向 X 提交。仍要在 X 完成确认与定时发送。
- 点「扫描 X 定时列表」，正常打开 X 的已安排列表。扩展只观察 X 本身加载的列表响应，按当前账号补录；手机和电脑分别打开同一账号的列表，就能各自获取 X 中已有的安排。不会自动滚动，也不会额外调用 API。
- 列表为空、记录缺失、时间已经过去，都不当成“成功发布”或“已取消”。缺失项保留历史并显示待核实。
- 重复记录会去重；手动记录可改本地时间。从 X 读取的安排请在 X 内改期或取消，再重新打开列表更新。删除按钮只移除本地记录，不会取消 X 定时。
- 账号之间隔离。导出当前账号 JSON，导入合并，适合转移私人备注；没有账号系统或云同步。

列表响应结构改版后可能无法识别；未知格式不会当作空列表覆盖旧数据。已确认当前 X 的列表入口和空列表响应；非空列表与创建/改期响应通过模拟夹具覆盖，仍需真实账号有定时内容时验收。

## 安装与平台

在 [Releases](https://github.com/hskelp9527-pixel/x-schedule-board/releases) 下载打包文件。

| 平台 | 状态 / 安装 |
| --- | --- |
| Windows Chrome / Edge | 解压 `x-schedule-board.zip`，在 `chrome://extensions` / `edge://extensions` 开启开发者模式，加载包含 manifest.json 的目录；刷新 X |
| Firefox 桌面 / 安卓 | `x-schedule-board-firefox-unsigned.zip` 使用独立清单与 background scripts。尚未 Mozilla 签名、未经安卓真机验收，不能直接当成正式安装包。桌面可通过 about:debugging 临时加载；安卓开发验收见 docs/ACCEPTANCE.md |
| 安卓 Chrome / iPhone Chrome | 不支持运行本扩展；请改用支持扩展的浏览器 |
| iPhone Safari | `x-schedule-board-safari-source.zip` 是转换源文件，需 Apple 转换、签名、分发和实机验证，尚无可安装 Safari 成品 |
| X App | 无法加载浏览器扩展 |

Firefox Android 需要单独验证 MAIN world 脚本、账号识别、表单及触控。小屏浏览器测试仅证明布局，不代表手机扩展已经通过真机验收。Safari 可使用 Apple 的 Safari Web Extension Packager 转换；源 ZIP 不是已签名 App。

## 隐私和限制

仅 `storage` 权限，数据保存在本浏览器。无服务器、统计或运行时第三方依赖。不读取登录凭据，不自动发帖、改期或取消；不保证平台通知。摘要最多 1000 字。默认按本机时区显示，记录的是绝对时间；换时区后显示会变化。备份先完整验证再合并。

只处理页面加载后能够识别当前账号的定时响应；账号信息加载前错过的响应，需要重新打开列表。私人手动记录不会随 X 扫描自动转移。

## 开发与交付

Node.js 22+、Python 3，运行扩展无需构建。

```sh
npm ci
npm run check
npm test
npx playwright-core install --with-deps chromium
npm run test:browser
python scripts/package.py
```

Windows 浏览器测试优先使用系统 Edge，也可设置 BROWSER_PATH。使用临时资料和模拟 X，不登录或操作真实账号。检查与发布工作流都运行模型、消息权限、真实扩展浏览器测试和三个包的白名单校验。推送 `v*` tag 发布 Release。更新时覆盖原目录并重新加载，避免卸载丢失本地数据。

本地同时有两个同级项目目录时，可运行 `npm run test:integration` 验证三个扩展共存、两个网络观察器、编辑框、弹窗和层级。CI 仅依赖本仓库，分别验证各插件。

测试和实机验收边界见 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。MIT；与 X 无关联。
