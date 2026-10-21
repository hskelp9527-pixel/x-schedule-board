# 验收边界

最低目标 8/10：核心功能 3、数据迁移 2、桌面与手机 2、异常并发 2、交付文档 1。关键数据丢失、假称定时成功或虚报手机兼容不得通过。

自动化覆盖手动记录、去重、从真实观察到的空列表 envelope 与模拟非空列表解析、时间单位、非法日期、未知格式、跨账号隔离、消息发送方限制、并发写入、导入原子性、X 按钮、小屏不溢出和摘要安全显示。

只读实站调查确认 X 使用 scheduleOption、scheduledConfirmationPrimaryAction 与 aria-labelledby 日期选项，已安排入口为 /compose/post/unsent/scheduled，FetchScheduledTweets 返回 data.viewer.scheduled_tweet_list。调查账号当时列表为空，未创建或删除真实定时帖。

待真实账号验证非空列表/新建/改期/取消响应。待 Android Firefox 真机或模拟器检查安装、MAIN world 观察、触摸、软键盘和页面切换。Firefox unsigned 包需通过 Mozilla 签名才能正式分发；可用 web-ext run -t firefox-android 做开发加载，不得在未连接设备时宣称通过。Safari 等待转换签名与 iPhone 验证。

最终集中测试结果与独立审查分数在 progress.md 记录。
