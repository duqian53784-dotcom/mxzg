# mxzg 重做版架构与维护指南

决定日期：2026-10-29。首要标准是人能阅读、在编辑器中修改界面、追踪一次操作并独立排查错误。采用按功能组织的轻量 MVC 客户端和模块化单体后端，职责清晰优先于抽象数量。本文描述目标架构，现有代码尚未完成切换。

## 客户端采用轻量 MVC

每个功能集中放置 Model、Controller、Service 和 View，小功能允许合并不必要的文件，不创建只有转发作用的空壳。

- Model：该功能的数据与状态，提供只读快照和变更通知。一个业务数据只有一个所有者；不 import cc、View、UIManager 或旧 WireSession。
- View：Creator Component，绑定 Prefab 节点、渲染传入的展示数据、播放局部动画、转发用户意图。不直接请求服务器或决定业务跳转。
- Controller：普通 TypeScript，接收 View 意图，调用 Service，监听 Model 并生成展示数据；管理筛选、选中、加载反馈、错误提示与跳转意图。
- Service：执行功能用例，调用类型明确的接口，校验并将已接受的回包和推送提交给 Model。不操纵节点或弹窗。
- UIManager：只管理页面、弹窗、层级、返回、加载取消、复用与销毁。注册表在 app 中显式关联页面、Prefab 和 Controller 工厂，框架不硬编码具体业务。

这是结合组件式引擎的 MVC 分工，不套用 Web 服务端 MVC 的文件结构，也不额外引入完整的双向绑定或 ViewModel 框架。

以英雄页为例，目标文件是 `features/hero/HeroModel.ts`、`HeroService.ts`、`HeroController.ts` 和 `ui/HeroListView.ts`，对应 `assets/prefabs/ui/hero/`。复杂详情需要独立 Controller 时再拆。首层按功能寻找代码，功能内部再区分职责。

默认调用顺序：按钮 → View 回调 → Controller → Service → 网络接口；服务端结果 → Service 提交 Model → Controller 收到变更 → View.render。服务端推送由相同功能的 Service 更新同一个 Model。页面关闭后模型仍可接受有效回包，旧 View 不再渲染；已提交的扣费操作不能因为关页就被当作失败或在本地撤销。

## UI 必须能由人在 Creator 中维护

- 布局、层级、尺寸、锚点、图片、字体、按钮和滚动区保存在 Prefab；使用编辑器可见的属性绑定。
- View 启动时明确检查必需绑定，缺失就报告“哪个 Prefab 的哪个字段未绑定”，不静默生成替代界面。
- 列表使用可编辑 Cell Prefab。允许运行时实例化和渲染列表，不用脚本重建整页的固定结构。
- 使用明确的 Layout、Widget 与安全区规则适配屏幕，避免到处散落坐标补偿和按名字递归搜索。
- 命名对应实际作用，例如 heroList、upgradeButton、levelLabel；注释解释规则和原因，避免保留批次编号和历史补丁叙述。

Creator 的 Prefab 与 Inspector 支持节点、组件与属性的编辑和保存，布局以此为基础，见官方[Prefab](https://docs.cocos.com/creator/3.8/manual/en/asset/prefab.html)和[Inspector](https://docs.cocos.com/creator/3.8/manual/en/editor/inspector/)。表现与领域分离的取舍参考 [Separated Presentation](https://martinfowler.com/eaaDev/SeparatedPresentation.html)，实际分工以本文为准。

## UIManager 的具体职责

统一接收显式页面 id 和参数，管理 Page、Popup、Hud、Toast 等层，处理返回与遮罩。页面工厂在应用启动时装配依赖，优先直接构造，不引入反射式依赖注入容器或必须理解自定义装饰器才能追踪的业务注册。

生命周期只有一套：创建并校验 View → 绑定 Controller → 打开 → 关闭并解除本次订阅 → 按缓存策略复用或销毁。引擎 onLoad/start/onDestroy 与框架钩子的映射写在基础类中，业务不同时在两处启动相同工作。

同页并发打开共用一次加载；切页使过时的打开意图失效；失败不能入栈；关闭移除输入与订阅；销毁释放持有资源。资源加载作为独立服务，UIManager 不维护业务 UUID 大表，也不实现账号、养成或战斗规则。

当前 UIManager 的统一管理意图保留，具体实现按目标审查。当前 HeroListView 仍引用 WireSession、业务列表构造和详情打开；BackpackView 同时读取 GameStore、监听网络和加载子预制。已有 View 命名不代表已经完成上述分层，后续按功能切换拆出 Controller。

## 后端决定

采用新的 Java/Spring Boot 模块化单体工程，按验证结果提取旧规则。新工程计划位于仓库 `backend/`；现有 `server/` 是外部目录联接，继续仅作对照，不在其中直接重建新后端。

首期一个游戏应用加 MySQL，由功能模块划分账号、角色、英雄、物品、战斗、主线/挂机、邮件和订单。定时任务先在应用内执行，并具备持久状态与幂等。跨服、独立战斗进程和消息中间件等在功能、容量与隔离需求明确后再拆。

初始技术基线：Java 21、Spring Boot 4.1 维护分支、MySQL 8.4 LTS、Maven Wrapper。具体补丁版本在新工程建立时锁定并验证，现有机器的 Java 8/MySQL 环境不在本轮升级。首期使用 Spring JDBC 和显式 SQL，数据库变更采用版本化迁移；Redis 仅在会话共享、缓存或限流需要时引入，不作为核心资产的唯一持久存储。

选择 Java 是为了可读的业务实现和旧规则的提取成本，不代表继续引入旧版 Spring、Netty、Akka、自建命令总线和自建持久化框架。新应用不直接依赖整套旧 common/agent JAR。

官方依据：[Spring Boot 系统要求](https://docs.spring.io/spring-boot/system-requirements.html)目前列出的 4.1.2 支持 Java 21；[MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/faqs-general.html)属于 LTS 系列。按业务模块而非立即拆进程的组织方式参考 [Spring 模块化应用说明](https://docs.spring.io/spring-modulith/reference/fundamentals.html)，不因此默认引入所有相关扩展。

## 后端一条业务链只有清晰的几层

- Controller：鉴权后的身份、参数验证、调用用例和映射响应；不计算奖励或直接写数据库。
- Service：组织一次业务操作、事务和跨模块协作。
- Rules：需要独立表达的战斗、掉落和养成规则，尽量无框架依赖；简单功能不强制再建一层。
- Repository：明确的查询、锁和持久化，不触发隐藏业务副作用。

例如升级英雄从 `hero/HeroController` 到 `HeroService`，读取规则、验证条件、在事务中扣除消耗与更新英雄，再返回新状态。角色身份来自服务端会话，不信任客户端传入的角色所属关系。

首期按功能包组织，保留单一启动入口。模块间通过明确 Service API 协作，不直接操作彼此的数据表和内部 Repository；需要跨模块扣费和发奖时由同一事务内的用例协调，不把一致性寄托在异步事件上。

## 接口与数据

新业务优先 HTTPS JSON `/api/v1` 接口，维护 OpenAPI 契约并生成客户端类型；服务端主动推送确有需要时使用 WSS。战报若测得体积与解析成本构成瓶颈，再选择二进制编码，不把旧 opcode 和字段号作为新接口。

返回数据明确区分未同步、空集合、零和错误。请求具有可追踪标识；关键写操作有业务幂等键，重复请求返回同一操作结果。超过 JavaScript 安全整数范围的 id 用字符串跨端传输，货币采用整数最小单位，服务端统一定义时间口径。

同一角色的并发写入通过数据库事务及明确的锁/版本规则控制。扣费、发奖、关卡推进和订单发货必须原子或具有可恢复的持久状态。支付回调经服务端验证且订单唯一约束防重复发货，通知在提交后执行；失败要可查询和重试。

战斗由服务端权威结算，客户端负责交互和表现。战斗运算使用有界执行资源，避免无界计算阻塞登录与资料请求。挂机以服务端时间和持久记录计算，恢复后不能重复领取。

数据库建表与变更写入版本化迁移。配置、账号与业务数据分开；生产数据修改具有审计与恢复办法。首期先在独立开发数据上验证新结构，不将现有数据库直接改为新模型。

## 旧服取舍与证据

旧仓库 POM 声明 Java 8、Spring Boot 2.1.9、Protobuf 2.6.1，common 还声明 Akka 2.3.3；父工程有 gameserver、center、cross 等多个模块，构建声明旧内网 Maven 仓库且默认跳过测试。这些是源码中的配置事实，未核定实际运行依赖或进行漏洞结论。

旧业务已经存在 HeroHandler、HeroService、HeroDao 及独立 battle 模块，但 HeroService 依赖多个高级养成系统与命令/事件基础设施，battle 依赖旧 common、config 和 protocol。因此复用规则需要提取和对照验证，不能假设复制一段代码或引用 battle JAR 即可独立运行。

优先提取经新策划确认的战斗公式、技能/状态规则、掉落和养成计算及数值配置；旧登录、网络接入、全局分发、持久化、构建与部署重新建立。确需过渡使用旧服时加适配器，客户端仍依赖新接口；旧服不得凭同一请求号或客户端超时而盲目重试扣费。

以固定输入、规则版本和可控随机源建立对照；无法控制旧随机源时先建立规则不变量与可观察用例，不宣称输出完全一致。玩法有意改变时更新新规则与验收。新实现通过核心操作与持久化验证后才切换入口，再删除不再使用的旧路径。

## 人如何接手修改

- 调整排版、图片或按钮位置：打开对应 Prefab。
- 调整点按钮后的流程：找该页 Controller。
- 查看当前英雄、背包或章节状态：找该功能 Model。
- 查看客户端请求和回包处理：找该功能 Service 与生成的接口类型。
- 新增页面：添加 View/Controller，在 app 的显式页面表登记。
- 修改开关、返回或页面释放：查看 UIManager 的统一契约。
- 修改服务端升级或发奖：查看对应功能 Service、Rules 与 Repository。
- 查询表结构和数据变更：查看数据库迁移与该模块 Repository。

验收要求：能从页面名找到 Prefab、View、Controller、Model、Service 和接口；能从一个请求标识追踪到服务端操作、错误和结果。每个功能入口说明只记录实际文件与关键规则，不复制长篇历史迭代。

## 落地边界

资源底座第一批已接入 `framework/assets/ResourcePool.ts` 与 `app/remake/StartupResources.ts`。前者只处理请求去重、作用域持有、失败重试及关闭后拒绝迟到结果；后者登记四项启动资源并适配 Creator，RemakeApp 持有作用域并在销毁时关闭。新资源先登记用途与生命周期，页面布局仍由 Prefab 维护。

当前退出作用域只撤销自身 addRef，并以 decRef(false) 保留引擎缓存；旧页面尚未全部迁移，不主动释放共享纹理/Spine。Bundle 归属、配置按需加载、主动淘汰及内存预算对应主计划 P2-04–P2-09，不能因 ResourcePool 存在就视为全部完成。后续进度以 restructuring-plan.md 与 development-progress.md 顶部快照为准。

先完成新架构下的登录、主城和一场战斗切片，再接入完整主循环。先用一个功能证明分层和人工修改体验，再调整框架；不在没有具体功能时一次生成大量基类、Manager 和空目录。

新后端已在 backend 建立首个开发登录与角色资料切片，包含 JDBC 持久化、Flyway 迁移和独立测试。开发及当前集成测试使用隔离 H2，MySQL 8.4、正式渠道身份与新客户端 MVC 接入尚待验证；旧服与原数据库未切换。实际运行方法见 backend/README.md。旧工程检查结果保留为现状记录，与新后端测试分开报告。
