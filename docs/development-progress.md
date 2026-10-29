# mxzg 重做版开发进度

更新日期：2026-10-29。本文件记录实际完成情况与接续工作，架构意图见 architecture.md。

当前用户要求：不自动操作或检查其 Creator 窗口；视觉验收由用户提供截图。后续自动任务继续代码、类型、绑定、接口与构建检查，不自行恢复桌面操作。

## 已完成

- backend 独立 Java 21/Spring Boot 工程、Maven Wrapper、JDBC 与 Flyway；local 使用隔离 H2，保留原 Java 8 服务。
- 开发登录、角色资料、持久会话哈希、过期校验、生产环境排除开发身份入口。
- 后端 7 项测试通过，覆盖真实 HTTP、重复和并发登录、状态保存、身份隔离、过期、生产入口隔离，以及 Creator 本地预览的 CORS 预检与未知来源拒绝。
- 客户端 account 功能的 Model、Controller、Service、API 边界与平台 HTTP 适配；不引用旧 WireSession。
- 登录检查覆盖数据校验、会话恢复、退出后的迟到响应、交错登录、网络失败与 401 的区别，以及 Controller 绑定与退订。
- AccountLogin.prefab 与独立 Remake.scene，显式绑定 View、输入框、按钮和标签，可在 Creator 中编辑。
- 新客户端代码通过 Creator 3.8.8 自带 TypeScript 编译器与引擎声明的 strict 类型检查，Prefab/scene 脚本绑定检查通过。
- 同一 AccountService/AccountApi 已通过 Node 测试 HTTP 适配器实连打包后的新后端，开发登录与会话恢复通过。实连使用隔离 H2 内存库；第一次服务启动等待 30 秒超时，后以更长等待及隔离库完成验证，不能据此判定原文件库故障。
- 已启用当前聊天每 30 分钟持续推进任务，仅有实质进展、完成、失败或需要用户行动时通知。
- 新登录与基础主城使用同一个既有 UIManager。应用显式注册 View、Prefab 加载与 Controller 工厂；Controller 生命周期随框架打开/关闭，旧页面路径不强制切换。
- 角色同步成功进入 RemakeHome，显示账户 Model 的真实资料；退出返回登录，不复制第二份角色状态。视图与注册、导航引用在关闭/销毁时清理，过时的打开意图作废。
- 新增 remake-navigation 检查，覆盖重复打开、页面替换、加载失败保留旧页、取消、Controller 初始化失败清理、常驻层生命周期、注册所有权清理、退出与主城绑定。
- 统一检查当前 7/9 通过：account、remake-navigation、architecture、bindings、hero、city、battle；旧 backpack 与 legacy 的背包布局失败与原基线相同。
- 新后端增加可双击入口 scripts/start-remake-backend.bat，以子进程 ExecutionPolicy Bypass 避免 Windows 默认策略阻止本机开发脚本，不修改系统策略。

## 现在如何查看

1. 双击 scripts/start-remake-backend.bat，启动本机新后端，默认 18080。或执行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "F:\project\mxzg\backend\dev.ps1" run`。当前是游戏 API，尚无网页管理后台。
2. Creator 3.8.8 打开 client，等待导入后打开 `assets/scenes/Remake.scene` 并预览当前场景。原 Boot 入口未切换。
3. 资源加载完成后停留登录页，默认开发账号 player_1；已恢复身份时点击“开始游戏”会重新校验会话，否则使用输入的开发账号登录，成功后进入主城。右上角“开发账号”可恢复或清除本机会话；已有身份时清除会话可重新输入并切换账号。刷新可以准备保存的身份，但不会自动进入主城。主城“账号”面板可退出，仅清除本机会话，不代表服务端全局撤销。
4. 调整界面打开 `assets/prefabs/ui/account/AccountLogin.prefab`；按钮流程看 AccountController，状态看 AccountModel，请求与会话流程看 AccountService/AccountApi，依赖装配看 app/remake/RemakeApp。

仅允许本机 Creator 标准预览来源 http://localhost:7456 和 http://127.0.0.1:7456；使用其他端口或域名时需显式调整 LocalPreviewConfiguration 并验证，不直接放开所有来源。

## 可复跑检查

- 后端：`backend/dev.ps1 test`；打包 `backend/dev.ps1 package`。
- 客户端：`node client/tools/check-project.mjs --suite account`，esbuild 使用 client 开发依赖或 MXZG_ESBUILD_MODULE 指定的现有模块。
- UI 生命周期与主城：`node client/tools/check-project.mjs --suite remake-navigation`。
- 登录资源、旧控件复用与真实 Spine 数据兼容：`node client/tools/check-project.mjs --suite login-presentation`。
- 绑定：`python client/tools/check_script_type_ids.py`。
- 新代码 strict 检查：使用 Creator 自带 TypeScript 编译器执行 `-p client/tools/tsconfig.remake.json`；先让编辑器生成 client/temp/declarations。
- 实际 Service 联调：先启动新后端，将 MXZG_REMAKE_API 设为 http://127.0.0.1:18080，再执行 account 检查。Node 使用 fetch 作为测试适配器，业务 Model/Service/API 与样板共用。

## 尚未验收

用户截图已确认浏览器登录后可进入角色资料页。登录美术首轮接入后仍需 Creator 实际预览，检查角色动画、窄屏裁切、开发面板和输入；严格类型、绑定与无引擎检查不能代替渲染。原生和微信 HTTP/存储适配、三端构建、正式渠道身份与 MySQL 8.4 集成尚未完成。资料联调页不是正式主城，登录也尚未完成最终视觉验收。

已有接口类型与运行时校验按当前 Java DTO 对齐；OpenAPI 的类型生成流程尚未接入。下一步先冻结最小接口契约，再建立生成与同步检查，避免扩展更多手工重复类型。

旧综合检查和旧背包检查的失败仍属于既有基线，不能归为新样板通过或失败，也不能静默删除。

## 接续顺序

1. 用户要求在此前进度上改进，而不是另起简陋页面。已有登录 Prefab 控件、日服背景与角色动画已接入同一个 AccountLogin.prefab，输入锚点已修正；下一步根据用户预览截图验收动态美术、窄屏与输入，并继续核查缺失 Logo。Creator 窗口操作已由用户要求停止。
2. 新 MVC 页面已接入统一 UIManager；后续扩展功能继续使用显式注册和同一生命周期，不另建管理器。
3. 固定并生成最小 API 类型，完善新主城的功能入口。
4. 新后端英雄、出阵、一次战斗与结算用例，复用规则必须先有输入/输出对照。
5. MySQL 持久化和三端样包验证，再逐步替换旧入口。

自动任务应先核对当前 Git 状态与本文件，延续而非重做已完成事项；保留用户已有修改，不清库、不擅自部署或购买服务。

## 登录视觉修正依据（2026-10-29）

- 日服实际入口是 `jp-overlay/src/scene/LogoSceneCtr.lua`，不是开发用的 UserLoginCtr。它使用 `ccbi-res/map-bg-loading.jpg` 铺底、`spine/jiemian` 的 `stand` 循环、Logo、区服条和开始游戏按钮；应以此为视觉基准，保留新 MVC 与后端会话逻辑。
- 当前客户端已找到 `resources/ui/maps/map-bg-loading.jpg`、`resources/spine/jiemian`、`resources/ui/login/logo-scene_btn-start-game-1.png` 等资源。开始游戏图片本身为简体中文；`logo-scene_spr-logo.png` 目前是 3×3 透明占位，须核查日服实际资源来源，不能当成有效 Logo。
- 开发账号、恢复会话和本机联调状态属于开发工具，应与玩家登录主体区分。正式界面修改必须保存为可编辑 Prefab，不能靠运行时拼节点替代。
- 输入溢出的原因已查明：Creator EditBox 自动将文字定位到输入框左上角，而样板文字子节点采用中心锚点。应将 Text 与 Placeholder 改为左上锚点和左对齐，再验证输入。

## 本批完成：复用已有登录成果（2026-10-29）

- 保留 AccountLogin.prefab 的资源 UUID 和 Remake.scene 绑定，替换临时浅灰布局；直接复用 LoginPanel.prefab 已有的 AccountField、BtnEnter（包含按下态贴图）与 ServerBg，原 LoginPanel、Boot 和旧登录链路未改动。
- 背景引用日服 map-bg-loading，角色引用现有 jiemian/stand。LoginArtwork 只负责屏幕尺寸适配，资源、节点和设计布局仍保存在可编辑 Prefab。
- 原 Spine 3.7 JSON 兼容转换提取到 framework/assets/SpineJson，旧 spineUpgrade 保留重导出，旧战斗与新登录共用一份转换实现；新 CompatibleSpine 用独立内存副本播放，并在销毁时清理，不改资源原文件。
- 开发账号与会话按钮默认折叠在右上角“开发账号”面板，默认 player_1；开始游戏仍调用已完成的新 AccountService。未添加假区服列表或假公告接口。主城仍是资料联调页，尚未迁回已有主城 UI。
- Text/Placeholder 已修正为左上锚点、左对齐和单行；错误/连接状态显示在开始按钮下方。
- 验证：Creator 3.8.8 strict 编译通过，脚本绑定与 Prefab 图引用检查通过；account、remake-navigation、login-presentation、architecture、bindings、hero、city、battle 通过。backpack 与 legacy 仍在既有背包布局断言失败。新登录资源测试最初错误地要求转换前后曲线编码相同，修正为验证非曲线动画内容保持一致后通过；不声称引擎渲染已验收。
- 待完成：有效 Logo 来源、实际动画与裁切截图验收、已有主城 UI 与新服务端能力逐步整合；启动入口尚未合并。

## 场景目录整理（2026-10-29）

- 顶层保留 Remake.scene，作为当前新后端开发入口。
- 旧 Boot.scene 与 Main.scene 移到 scenes/legacy；Boot 登录后按场景名加载 Main 并添加 MainApp，因此二者继续保留。Main 单独预览不能初始化旧主城。
- 未被代码加载、未挂战斗脚本的 Battle.scene 移到 scenes/legacy/placeholders；现有战斗走主城页面，不走该场景。
- 所有场景与 .meta 成对移动，UUID 与文件内容保留；同步本机构建历史中的资源 URL、Boot 注释和旧预览说明，不改构建任务的原参数或首场景 UUID。
- scenes/README.md 已重写为实际入口说明，覆盖新旧服务器、预览方式、场景生命周期与构建选择。后续页面继续使用 Prefab，而非每页增加场景。

## 修复登录页切换时的 Spine 销毁异常（2026-10-29）

- 用户截图显示：自动恢复会话后已打开 RemakeHome，销毁 AccountLogin 时 CompatibleSpine.onDestroy 调用 skeletonData setter，进入引擎 Skeleton._updateUITransform 后读到已销毁的 UITransform 数据，触发 width 空引用及后续重复销毁提示。
- 移除 onDestroy 中的 skeletonData 赋值；渲染组件由引擎清理，运行时 SkeletonData 在下一次任务回调中释放，确保当前节点的组件销毁完成。回调捕获资源前先清除所有权，重复清理不会再次调度释放；每份运行时数据使用独立 UUID，避免快速重开与上一份释放回调碰撞。
- login-presentation 回归检查模拟 UITransform 已销毁但 Skeleton.isValid 仍为 true 的顺序，验证不调用数据 setter、资源晚于渲染器释放、重复清理只释放一次、快速重开使用独立缓存键；同时保留真实 jiemian 数据转换与 Prefab 检查。
- 测试替身的 property 装饰器补齐裸 @property 形式，避免测试实例中的 clip 被错误定义为只读。login-presentation、remake-navigation、account 与真实 Creator 声明的 strict 检查通过；实际预览需刷新验证，不声称已操作 Creator 或完成渲染验收。

## 复用已有主城与分辨率核查（2026-10-29）

- 用户询问日服设计尺寸及 640/720 的区别。已从日服 engine_changes.patch 的 AppDelegate 启动代码确认：通常设置 640×1280 FIXED_HEIGHT；height/width <= 1.34 时分支设置 768×1280 FIXED_HEIGHT。当前 Creator 已是 640×1280、仅 Fit Height，保持一致；新功能逻辑坐标以 640 为准，高清素材另行定义像素倍率。详见 safe-area.md 的证据与适配说明。没有修改全局分辨率。
- RemakeHome.prefab 保留原 UUID，直接引用 canonical CityHub.prefab 与 CityChrome.prefab，不复制两套地图/顶底栏，不启动旧 MainApp、旧会话或 WebSocket。UIManager 继续管理 Home 页面；Home 负责这两个既有子 View 的打开、等待和销毁。
- 昵称、等级、金币与钻石直接来自同一 AccountModel；不编造战力、头像、开服天数或玩法进度。未接入的业务入口提示暂未开放；旧运营活动与月卡入口暂不展示。账号详情与退出收在独立面板。
- 处理 CityHubView 的 private start 与引擎自动 start 同名问题，改为 initializeCity，仅由 onOpen 初始化；配置加载结束时检查 cleaned，阻止关闭后再启动特效和绑定事件。退出时子 View 清理只执行一次，加载中关闭会结束父页面的等待。
- 既有 battleSpine 与 visibleFit 的两个类型边界补齐注解，未改其业务行为，使复用的主城代码纳入真实 Creator 声明的 strict 检查。
- 新增 home-presentation 检查：真实角色字段/零货币、未开放提示、既有 Prefab 引用、页面关闭、加载中关闭、640×1280 基准及引擎 start 冲突检查；account、remake-navigation、login-presentation、home-presentation、architecture、bindings、hero、city 通过。综合检查中的旧 backpack/legacy 仍存在原有背包布局失败，不静默跳过。
- 新主城实际渲染、地图拖动、窄屏和安全区仍待 Creator 预览；原生/微信适配与英雄、主线等新后端业务仍未完成。主城加载失败会保留账号退出途径与可见提示。

## 恢复启动加载与过渡（2026-10-29）

- 用户指出新入口立即进主城，遗漏此前完成的读配置、加载数据、进度条与渐进动画。本批复用既有 playLogoSplash、BootChrome 和原 LoadingLayer.prefab，不另造加载画面。
- Remake.scene 增加显式 PageHost / StartupHost 绑定；启动层位于页面之上，阻挡加载期间点击，加载 Prefab 也由场景引用以保留依赖与编辑入口。需重新打开更新后的 Remake.scene 再预览，避免旧场景内存快照缺少新绑定。
- 启动任务按顺序读取配置（manifest 当前 536 张表）、预载界面资源、恢复账号与角色、等待目标页面就绪。只有实际任务完成才推进加权进度，核心配置失败不会进入目标页；失败可重试，无会话则进登录，有会话也先显示启动加载再进主城。
- 复用原开场淡入/停留/淡出；目标页准备完成后等待两次真实 EVENT_AFTER_DRAW，再以 0.3 秒淡出加载层。手动登录同步角色和切换主城也使用该加载层。淡出可被后续加载或销毁取消，过期路由不能把新加载层藏掉；销毁时清理音乐、动画、重试等待和绘制等待。
- BootChrome 兼容旧调用，新增可注入 Prefab 加载器与可取消淡出；旧链路仍保留原顺序。未接入旧服的远程版本/热更地址，不假称已有线上更新校验。
- 新增 startup 检查，验证角色恢复等待、真实/单调进度、失败阻断、过时回调、取消、旧加载资源引用、绘制等待、淡出取消和场景销毁清理。真实 Creator strict 编译通过，综合检查 10/12 通过；仅原有 backpack/legacy 背包布局断言失败。实际 Creator 动画与加载效果仍需预览确认。

## 按正式服顺序保留登录确认（2026-10-29）

- 用户明确要求：资源加载完成后显示登录页，玩家点击登录才进入主城。此要求覆盖上一批“有效会话自动进城”的行为；后续不得以会话恢复成功为由跳过登录页。
- 新增 LoginEntry，区分已准备的角色身份与玩家进入确认；初始、刷新和开发面板恢复会话均保持登录路由。AccountController 只在“开始游戏”请求成功、且当前 Controller 仍打开时发出进入确认。退出或身份清空后重置确认。
- 已准备身份时点击开始重新校验当前会话，不把保存的身份替换为输入框默认 player_1；开发账号输入框在身份已准备时隐藏，清除会话后可换账号。恢复失败或登录失败保持登录页与可见错误。
- 账号检查新增保存会话不跳过登录、恢复按钮不进城、显式开始且重新校验后进城、失败不进城、页面关闭后的晚到请求不进城等用例；account、startup、remake-navigation 和 Creator strict 检查通过。实际按钮与页面效果仍需预览确认。
