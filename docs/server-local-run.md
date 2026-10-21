# 本机起服（D1）

> **来源：** 本文按 2026-10-19《项目分析与启动指南》写成。端口、密码、路径和命令只取那份分析，不另补。  
> **D1 仍未勾选。** 分析记录的是当天那台开发机：中心服和游戏服起来了，跨服因讨伐团（`CRUSADE_GROUP_WORKER`）周期数据缺失而失败，大型跨服没有启动。本文没有在本机复验。倩确认本机进程在听之前，`PROJECT_PLAN.md` 里的 D1 保持 `[ ]`。  
> **客户端仍走 Mock。** 本仓库 H5 连服是 D2，用分析里的游戏服 WebSocket **13101**。D1 只写怎么把 Java 服拉起来。

`server/`、`config/` 是本机 junction，不在 Git 里。不要把 junction 背后的内容推进这个仓库。

## 已经确定的路径

| 用途 | 路径 |
|------|------|
| 工程根 | `F:\project\mxzg` |
| 新客户端 | `F:\project\mxzg\client`（Creator 3.8.8 打开这个目录） |
| 配置表 junction | `F:\project\mxzg\config` → `F:\mxzg-local` |
| Java 服 junction | `F:\project\mxzg\server` → `F:\源码\mj\program\server` |
| 旧工程参考 | `F:\源码\mj\program` |
| 构建和启动的工作目录 | `F:\源码\mj\program\server`（与上面的 junction 是同一目录） |
| 一键脚本 | `F:\源码\mj\program\start-services.bat`（在 `program` 目录，不在 `server` 里） |
| JDK 1.8 | `C:\dev\jdk1.8`（Temurin 1.8.0_504） |
| Maven 3.6.3 | `C:\dev\maven`（已配 `JAVA_HOME`、`MAVEN_HOME`、`PATH`） |
| MySQL 8.0.29 | `C:\dev\mysql`（Windows 服务 `MySQL80`，开机自启） |
| Redis 5.0.14 | `C:\dev\redis`（Windows 服务 `RedisDev`，开机自启） |
| 服读的策划表 | `F:\mxzg-local\gameconfig` |
| 策划表来源 | `F:\FansGameX\mxzg-h5\配置表\shared-config`（534 张，已复制服务端要的 232 张） |
| IP 归属地库 | `F:\mxzg-local\ip2region.db` |
| Maven 镜像 | `~/.m2/settings.xml` |
| 开服日口径 | `docs/day60-open-server.md`：开服当天 = 第 1 天 |

`.gitignore` 忽略了 `/config` 和 `/server`。

服读的是 `F:\mxzg-local\gameconfig`，不是整个 `F:\mxzg-local`，也不是新客户端用的 JSON。分析把表放在纯英文目录，避免中文路径在 properties 里出编码问题。客户端导出是 D4，分析没有说两份表是同一次导出。

## 客户端现在连的是 Mock

预览不需要起服。

- Boot 走 `mock://`，`MockTransport` 里一份 `MockGameSession`。
- 协议在 `client/assets/scripts/net/protocol/`。`CmdId` 是客户端占位号，**不是**旧服消息号。限时活动是 `2801`–`2804`，同样是占位。
- 编解码仍是明文对象。真 WebSocket 要改的是 `codec.ts` 和传输层，调用方继续用 `Proto.*`。
- 细节见 `docs/protocol-stubs.md` 和 `docs/mock-replay.md`。

D2 才把本仓库 H5 接到游戏服 WebSocket `13101`。在那之前不要改连接、占位号或场景。

2026-10-19 另有一套旧 H5，目录是 `F:\FansGameX\mxzg-h5\客户端\web`。`serve.ps1` 听 `127.0.0.1:8080`，`dev-platform.ps1` 听 `127.0.0.1:18070`，页面上的 WebSocket `/game/9902` 由 `serve.ps1` 桥到游戏服 TCP `9902`。那是旧客户端。本仓库 D2 用分析里的 WS `13101`，不走这套桥。

## 建议的联调顺序

`PROJECT_PLAN.md` 第 8 节已经定了顺序。第 1 步的命令在后面几节；后面几步仍是接协议的顺序，D1 不做。

1. 在本机把 `server` junction 指到的 Java 工程跑起来，确认进程在听端口。
2. 登录。客户端现在的 `login` / `role.enter` / `role.create` 先对齐字段，再改占位 ID。
3. 进主城。顶栏要能读到角色名、等级、金币、钻石、开服天。
4. 主线 `stage.enter` / `stage.result`。
5. 背包，然后一次只接一个系统。限时活动、礼包、商店都先留在 Mock，等登录到主城稳定后再换。

开服自然日用旧服 `ServerParamService.getOpenDays()`，不要用角色登录天代替。七日登录看的是角色登录天，和开服天是两套。2026-10-19 的分析没有写怎样把 `getOpenDays()` 调成第 1 天，本文不补命令。

## 2026-10-19 那次的结果

分析第十节记的是当天已经发生的事，不是 2026-10-21 的复验。

| 进程 | 结果 |
|------|------|
| `mxzg-center` | 成功。HTTP `9801`，TCP `11122` |
| `mxzg-gameserver` | 成功。TCP `9902`，WS `13101`，HTTP `9804` |
| `mxzg-cross` | 失败。讨伐团（`CRUSADE_GROUP_WORKER`）周期数据缺失，跨服玩法数据问题 |
| `mxzg-large-cross` | 未启动。分析写「同上」 |

单机玩只需要 center 和 gameserver。cross、large-cross 可以不启。

为了那天能编译、能启动，分析在服目录里做了 3 处改动（都在 junction 那边，不在本 Git 仓库）：

1. `mxzg-common` 补了仓库漏交的 `RandomUtils.java`，否则编译不过（见 Q8）。
2. gameserver 的 `application.properties`：`sensitive.server.lang` 去掉方括号；`sub.server.id` 保留方括号；`network.webSocket.sslFile` 和 `sslPassword` 置空（见 Q11、Q12）。
3. 配置表 `floatingislandstime.xlsx` 删掉重复的 stage 行（见 Q10）。

当天自动建出的表数量：`mxzg_center_data` 6 张，`mxzg_1_data` 244 张，`mxzg_1_log` 52 张，`mxzg_cross_data` 36 张。不需要手工建表 SQL。

## 前置软件

分析要求，且当天已经装好：

- JDK **1.8**。不能用更高版本。Spring Boot 2.1 对高版本 JDK 有兼容问题。路径 `C:\dev\jdk1.8`。
- Maven **3.6+**。当天是 3.6.3，路径 `C:\dev\maven`。`JAVA_HOME`、`MAVEN_HOME`、`PATH` 已配过。
- MySQL **8**。当天是 8.0.29，路径 `C:\dev\mysql`，服务名 `MySQL80`，开机自启，账号 `root` / `123456`。
- Redis。版本不限，客户端是 Lettuce。当天是 5.0.14，路径 `C:\dev\redis`，服务名 `RedisDev`，开机自启。
- `config.path` 指向的 Excel 目录存在，且里面是完整策划表。
- `ip2region.db` 存在。
- 本机能解析 `center.server.host`、`redis.host`、`platform.uri`。本机步骤把前两个写成 `127.0.0.1`。模板里的 `platform.uri` 是 `http://192.168.0.131:8070/`，步骤 4 没有要求改它。

技术栈（只作对照）：Java 8、Spring Boot 2.1.9、Maven 多模块、自研 Netty + Protostuff、MySQL 8 + Druid、Redis（Lettuce）、Protobuf 2.6.1。私有 Nexus 是 `http://192.168.1.131:8081`，外网不可达，构建改用下面的阿里云镜像。

## 工作目录

命令都在 `F:\源码\mj\program\server` 下执行。`F:\project\mxzg\server` 是指到这里的 junction，进哪一个都是同一目录。分析里的 `cd program/server` 就是这个目录。

不要在本 Git 仓库里找 `mxzg-server` 源码，GitHub 上没有这份服。

## 1. MySQL

先确认 Windows 服务 `MySQL80` 在跑。分析写它开机自启，没有另给启动命令。

库（都在 `127.0.0.1:3306`）：

| 谁用 | 库 | 配置文件 |
|------|----|----------|
| center | `mxzg_center_data` | `database.properties` |
| gameserver（`server.id` 默认 1） | `mxzg_1_data` 和 `mxzg_1_log` | `database-game.properties`、`database-log.properties` |
| cross | `mxzg_cross_data` | `database.properties` |
| large-cross | `mxzg_cross_data`（和 cross 同一个库） | 同 cross |

账号：各服务模板用户名都是 `root`。center、gameserver 模板密码是 `123456`。cross、large-cross 模板密码写的是 `root`。本机统一用 `123456` 时，把 cross、large-cross 的密码也改成 `123456`。

分析给出的 URL 形态（问号后的其余参数沿用 `.temp`，分析只写出时区）：

```
url=jdbc:mysql://127.0.0.1:3306/mxzg_center_data?...&serverTimezone=GMT%2B8
username=root
password=123456
```

gameserver 把库名换成 `mxzg_1_data`、`mxzg_1_log`，cross / large-cross 换成 `mxzg_cross_data`。Druid 模板值：`initialSize=5`、`maxActive=50`、`minIdle=10`。

不需要手工执行建表 SQL。服务启动时 `JDBCRepository` 按实体建表。

## 2. Redis

先确认 Windows 服务 `RedisDev` 在跑。分析写它开机自启，不用再手动拉进程。

本机 properties：

```
spring.redis.host=127.0.0.1
spring.redis.port=11001
spring.redis.password=^-^ayjsgame!@#redis&201912
```

端口是 `11001`，不是 6379。密码与模板相同。模板里的 host 是 `192.168.0.131`，本机改成 `127.0.0.1`。

## 3. 构建

### 3.1 阿里云镜像

pom 声明了内网 Nexus `http://192.168.1.131:8081`。外网会卡住。先在 `~/.m2/settings.xml` 写上：

```xml
<mirrors>
  <mirror>
    <id>aliyun-public</id>
    <url>https://maven.aliyun.com/repository/public</url>
    <mirrorOf>*</mirrorOf>
  </mirror>
</mirrors>
```

`game.common.version=1.3.3` 只定义了属性，没有依赖引用它，不需要这个包。

### 3.2 顺序

先装三个独立工程，再打包主工程。分析里的第一行 `cd program/server` 就是 `F:\源码\mj\program\server`。在这个目录执行后面四行：

```
cd mxzg-agent  && mvn clean install && cd ..
cd mxzg-common && mvn clean install && cd ..
cd mxzg-rpc    && mvn clean install && cd ..
cd mxzg-server && mvn clean package
```

各 pom 已经写了 `maven.test.skip=true`，命令里不要再加 `-Dmaven.test.skip=true`。PowerShell 会把未加引号的参数拆开，报 `Unknown lifecycle phase '.test.skip=true'`。真要传就整段加引号：`"-Dmaven.test.skip=true"`。

编译若报找不到 `com.ayjs.mxzg.common.util.RandomUtils`，先按 Q8 补类，再从 `mxzg-common` 重新 `mvn clean install`。

产物是瘦包，只有本模块的 class，没有 `Main-Class`，也没有依赖：

- `mxzg-server/mxzg-center/target/mxzg-centerserver.jar`
- `mxzg-server/mxzg-gameserver/target/mxzg-gameserver.jar`
- `mxzg-server/mxzg-cross/target/mxzg-crossserver.jar`
- `mxzg-server/mxzg-large-cross/target/mxzg-large-cross-server.jar`

不要用 `java -jar` 跑这些文件。

## 4. 配置

模块只带 `.temp`。运行前要有同名最终文件。分析没有给出这步的复制命令，在各模块的 `src/main/resources/` 里把模板复制成最终文件名即可。`log4j2.xml` 直接用，不用复制。

每个要启动的模块：

- `application.properties.temp` → `application.properties`
- `database.properties.temp` → `database.properties`

gameserver 另外两份：

- `database-game.properties.temp` → `database-game.properties`
- `database-log.properties.temp` → `database-log.properties`

分析第十节还记录：cross 和 large-cross 已有 `database-log.properties`；gameserver 还有 `application-dev.properties`。分析没有写这两份的 temp 文件名。目录里已经有就保留，不要新造。模板里有 `spring.profiles.active=dev`。

运行时读的是 `target/classes` 里的同名文件。第十节说当天已经同步过去。改完 `src\main\resources` 后按 Q13 再复制，或重新 `mvn package`。

### 4.1 本机要写成的值

下面是步骤 4 和第十节给出的本机值。`config.path` 的反斜杠按分析原文写成双反斜杠。`ip2region.file` 的文件位置是 `F:\mxzg-local\ip2region.db`，properties 里用同样的双反斜杠写法。

center 和 gameserver 都要：

```
network.tcpSocket.ip=0.0.0.0
config.path=F:\\mxzg-local\\gameconfig
ip2region.file=F:\\mxzg-local\\ip2region.db
spring.redis.host=127.0.0.1
spring.redis.port=11001
spring.redis.password=^-^ayjsgame!@#redis&201912
```

库文件按第 1 节写到 `127.0.0.1:3306`，`username=root`，`password=123456`。

**中心服**的 TCP 用分析默认。步骤 4 把 `network.tcpSocket.port=9902` 写进本机字段，并注「每个实例端口不同」。第四节和步骤 5 把中心服默认口写成 `11122`，所以 `9902` 只写进 gameserver：

```
network.tcpSocket.port=11122
server.port=9801
```

步骤 5 写明中心服 TCP 听 `network.tcpSocket.port`，默认 `11122`。看到日志 `Center Server started...` 表示中心服起来了。

**游戏服**另写：

```
server.id=1
network.tcpSocket.port=9902
network.webSocket.port=13101
center.server.host=127.0.0.1
center.server.port=11122
sensitive.server.lang=1,2
sub.server.id=[1005,1105,7,8,9,10]
network.webSocket.sslFile=
network.webSocket.sslPassword=
```

`server.id=1` 对应库 `mxzg_1_data`、`mxzg_1_log`。多开区服就换 `server.id` 和 `network.tcpSocket.port`。模板示例 `server.id=1001` 不是这套已建库。

`sensitive.server.lang` 不能带方括号。`sub.server.id` 必须带方括号。两边的理由在 Q11。

游戏服 HTTP：第四节模板写 `server.port=9801`，第十节本机验证写成 **9804**。分析没有写出是哪一行改成 9804。校验时 center 看 9801，gameserver 看当天记下的 9804。本机若仍绑在别的口，以 netstat 为准，不要为了凑 9804 去发明一行分析里没有的配置。

**cross / large-cross**（可跳过）：同一组本机地址（`127.0.0.1`、`config.path`、Redis、`ip2region.file`），库 `mxzg_cross_data`，密码改成 `123456`。它们的 TCP 端口分析只写「配置」，本文不补数字。模板里 gameserver 去连大型跨服的项是 `large.server.host=192.168.0.140`、`large.server.port=11422`。步骤 4 没有要求改这两项。

步骤 4 没有要求改、就留在 `.temp` 里的还有：`server.debug=true`、`gm.cmd.open=true`、`server.platformId=1`、`server.lang=3`（1=cn，2=繁体，3=印尼，4=en，5=jp，6=kor，7=越南，8=泰国）、`network.tcpSocket.threads=10`、`network.tcpSocket.idle=60`、`platform.key=^-^ywgame!@#api`、`platform.uri=http://192.168.0.131:8070/`、`log.to.db=true`、`log.to.file=true`、`log.to.file.dir=gamelog`。center / cross / large-cross 的库文件键是 `database.game.file=classpath:database.properties`。gameserver 是 `database.game.file=classpath:database-game.properties` 和 `database.log.file=classpath:database-log.properties`。

模板里出现过、本机不要照抄的地址：TCP IP `192.168.0.199`、Redis `192.168.0.131`、策划表 `D:\config\gameconfig\config-test-xlsx`。

## 5. 启动

外部依赖先就绪，然后按这个顺序：MySQL、Redis → center →（可选）cross →（可选）large-cross → gameserver。

四个服的启动类都是同一套：`SpringApplication.run`，`DataSourceInitializer`，按 `Lifecycle` 拉起 RPC / TCP / 调度，注册 JVM 关闭钩子。Windows 下 `listenInput()` 接受输入 `stop`。

产物是瘦包。先把依赖拷到 `target/lib`，再用 classpath 启动。前面已经 `mvn` 过，依赖在本地仓库，所以 `copy-dependencies` 用 `-o`。`-D` 在 PowerShell 里要加引号。classpath 分隔符用分析里的分号（Windows）。

下面的 `cd` 相对 `F:\源码\mj\program\server`。构建结束时目录可能停在 `mxzg-server`，先回到 `F:\源码\mj\program\server` 再执行。

### 5.1 中心服

```
cd mxzg-server/mxzg-center
mvn -o dependency:copy-dependencies "-DoutputDirectory=target/lib"
java -Xms512m -Xmx2048m -cp "target/classes;target/lib/*" com.ayjs.mxzg.center.CenterBootstrap
```

成功日志：`Center Server started...`。TCP 默认 `11122`，HTTP `9801`。

### 5.2 跨服（可跳过）

单机可以不启。2026-10-19 这一步失败，原因是讨伐团周期数据，不是端口。

```
cd mxzg-server/mxzg-cross
mvn -o dependency:copy-dependencies "-DoutputDirectory=target/lib"
java -Xms512m -Xmx2048m -cp "target/classes;target/lib/*" com.ayjs.mxzg.cross.CrossBootstrap
```

大型跨服同样方式，启动类是 `com.ayjs.mxzg.largecross.LargeCrossBootstrap`。当天没有启动它。

旧 H5 日志里每 5 秒一次「连接 127.0.0.1:11422 失败」，分析解释为 `mxzg-cross` 没启动，不影响单机。

### 5.3 游戏服

center 起来之后再开。

```
cd mxzg-server/mxzg-gameserver
mvn -o dependency:copy-dependencies "-DoutputDirectory=target/lib"
java -Xms512m -Xmx2048m -cp "target/classes;target/lib/*" com.ayjs.mxzg.gameserver.Bootstrap
```

它会连 `center.server.host:center.server.port`，也就是 `127.0.0.1:11122`。

### 5.4 一键脚本

也可以双击 `F:\源码\mj\program\start-services.bat`。它会依次打开 center 和 gameserver，各一个窗口。不含 cross。

### 5.5 仓库里的 Linux 部署（不要拿来在本机跑）

原始部署在 Linux 上，由 `mxzg-deploy` 组装：`template/` 是模板（lib、启动脚本、配置模板），`serverconfig.txt` 是每个区服的 JSON（id、tcpPort、webPort、数据库地址）。`Deployer` 复制成 `service_1`、`service_2` 等，替换 `##tcpPort##`、`##gameDbUrl##` 这类占位符。`template/` 里的 lib 和启动脚本没有提交。本机用上面的 classpath。

## 6. 端口

| 服务 | 启动类 | HTTP | TCP | WebSocket |
|------|--------|------|-----|-----------|
| center | `com.ayjs.mxzg.center.CenterBootstrap` | `9801` | `11122` | 无 |
| gameserver | `com.ayjs.mxzg.gameserver.Bootstrap` | 模板 `9801`；2026-10-19 实测 `9804` | `9902` | `13101` |
| cross | `com.ayjs.mxzg.cross.CrossBootstrap` | 模板 `9801` | 分析只写「配置」 | 无 |
| large-cross | `com.ayjs.mxzg.largecross.LargeCrossBootstrap` | 模板 `9801` | 分析未单列监听口；模板里 gameserver 去连的是 `11422` | 无 |

本仓库 H5 以后接的是游戏服 WS `13101`（D2）。D1 不改客户端。center 给 gameserver / cross 连的口是 TCP `11122`。

## 7. 验证

分析步骤 8 的 HTTP 检查（各服务都有 actuator）：

```
curl http://127.0.0.1:9801/actuator/health
```

第十节把 gameserver 的 HTTP 记成 `9804`，路径仍是这个 actuator：

```
curl http://127.0.0.1:9804/actuator/health
```

TCP / WebSocket 监听：

```
netstat -ano | findstr "11122 9902 13101"
```

这条 `findstr` 不含 `9801`、`9804`、`3306`、`11001`。HTTP 用上面的 curl。

下面这项留给倩在开发机上打勾。本文写作时没有跑这些命令，所以 D1 不勾。

- [ ] `MySQL80`、`RedisDev` 已在跑
- [ ] center 日志有 `Center Server started...`
- [ ] `curl http://127.0.0.1:9801/actuator/health` 有响应
- [ ] gameserver 已启动；按第十节再看 `curl http://127.0.0.1:9804/actuator/health`
- [ ] `netstat -ano | findstr "11122 9902 13101"` 能看到 center 的 `11122`、gameserver 的 `9902` 和 `13101`
- [ ] 新客户端预览仍走 Mock，没有改去连 `13101`

cross 失败不挡住这张清单。单机不要求它在听。

## 8. 停止

Windows：在该服务的命令行窗口输入 `stop` 然后回车。一键脚本也是在各自窗口里输入 `stop`。

停止顺序与启动相反：gameserver → large-cross → cross → center。

分析把 Linux 的停法写成 `kill <pid>`。本机是 Windows，用 `stop`。端口被占时用 Q7。

## 坑（Q1–Q13）

| | 现象 | 处理 |
|--|------|------|
| Q1 | `Could not find artifact com.ayjs.mxzg:mxzg-common` | 先在 `F:\源码\mj\program\server` 对 `mxzg-agent`、`mxzg-common`、`mxzg-rpc` 执行 `mvn clean install`，再构建 `mxzg-server` |
| Q2 | 依赖下载卡住，或 Nexus 超时 | 内网 `http://192.168.1.131:8081` 外网不可达。用第 3.1 节的阿里云 `<mirrorOf>*</mirrorOf>`。`game.common.version=1.3.3` 没有被引用 |
| Q3 | `DataSource` 初始化失败 | 查 `database*.properties` 的地址、账号、库名，以及 MySQL 是否已启动 |
| Q4 | gameserver 连不上 center | 查 `center.server.host` / `center.server.port`。center 要先起来，防火墙不要拦它的 TCP |
| Q5 | `config.path` 找不到配置 | 目录必须存在，且含策划 Excel/CSV。本机是 `F:\mxzg-local\gameconfig` |
| Q6 | Redis 超时 | `spring.redis.host` / `port` / `password` 要和 Redis 一致。本机是 `127.0.0.1`、`11001`、`^-^ayjsgame!@#redis&201912` |
| Q7 | 端口被占用 | `netstat -ano \| findstr <port>` 看 PID，`taskkill /PID <pid> /F`，或改 properties 里的端口 |
| Q8 | 找不到符号 `RandomUtils`（`com.ayjs.mxzg.common.util`） | `mxzg-config`、`mxzg-battle`、`mxzg-cross` 共 36 处引用它，仓库里原来只有 `RandomUtil`。在 `mxzg-common/src/main/java/com/ayjs/mxzg/common/util/RandomUtils.java` 补一个类，内部委托 `RandomUtil` 做 `isHit` / `nextInt`，再 `mvn install` |
| Q9 | `没有主清单属性` | 瘦包不能 `java -jar`。用第 5 节：`mvn -o dependency:copy-dependencies "-DoutputDirectory=target/lib"`，再 `java -cp "target/classes;target/lib/*" <启动类全名>` |
| Q10 | `加载 [xxx] 时出现错误` / `时出现重复的ID` | 表结构和服代码版本不一致。当天是 `floatingislandstime`（浮空岛时段）：每个 stage 按周几重复，代码要求 stage 唯一。每个 stage 只留第一行。只影响浮岛时段 |
| Q11 | `TypeMismatchException: Failed to convert String to int[]`，输入字符串 `"[1"` | `sensitive.server.lang=[1,2]` 被 Spring 注入 `int[]`，按逗号拆，不认方括号。改成 `sensitive.server.lang=1,2`。`sub.server.id` 相反：注入 `String` 后由 `ServerConfig.getSubServerIds()` 用 Gson 按 JSON 数组解析，必须保留方括号，写成 `sub.server.id=[1005,1105,7,8,9,10]`。删掉方括号时，点「开始游戏」会报 `JsonSyntaxException: Expected BEGIN_ARRAY but was NUMBER`，栈在 `getSubServerIds` / `matchServerId` / `LoginHandler.login`。2026-10-19 两个字段一起去掉方括号时，进程能起，客户端登录必现 1005，补回 `sub.server.id` 的方括号后登录成功 |
| Q12 | `FileNotFoundException: \project_home\xxx.jks` | 本地不要 wss。置空：`network.webSocket.sslFile=` 和 `network.webSocket.sslPassword=` |
| Q13 | 改了 `src/main/resources` 的 properties，启动后没生效 | 进程读 `target/classes`。改完后执行 `Copy-Item src\main\resources\application.properties target\classes\ -Force`，或重新 `mvn package` |
