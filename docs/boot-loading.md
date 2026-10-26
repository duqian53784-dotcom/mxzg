# 启动链

Boot 场景按旧工程的顺序走完才进 Main：logo、版本比较、热更层、加载资源、读表、登录、把主城要的包收回来，然后才 `director.loadScene("Main")`。

画面是 `prefabs/ui/login/LoadingLayer` 和 `UpdateLayer`。Prefab 只引用 `resources` 里的图。加载失败时用同一批图在代码里再搭一份，节点名不变。不再在 SafeFrame 上写「启动中 / 检查版本 / 热更占位 / 读取配置」，也不在登录壳上写「加载登录界面…」或「正在发送登录 1001」。

默认传输是真服 `ws://127.0.0.1:13111/game`。Mock 只在地址带 `?dev=mock`（或 `?transport=mock`）时打开。`skipLogin` 只在 Mock 下跳过选服。

## 顺序

每一段自己把进度从 0 走到 100。GameLog 的 `stage=` 和屏幕上的字对应如下。

| 顺序 | GameLog | 屏幕上的字 | 做什么 |
|---|---|---|---|
| 1 | | logo | 节点 `logo-scene_spr-logo` 淡入 1 秒、停 1 秒、淡出 0.5 秒。点一下跳过停留和淡出。`bgm-logo` 从淡入开始循环，进 Main 时停。字标文件仍是 3×3 时，画面改成左右饰纹拼的焰环 |
| 2 | `version` | 检查版本 | 读 `config/version` 的整数 `version`，再向 `platform_urls` 和 `download_urls` 要远程版本。拉不到不挡 |
| 3 | `hot-update` | 更新资源 | 远程更大才打开 UpdateLayer。相等、本地更新，或远程拉不到，则跳过下载 |
| 4 | `assets` | 加载资源 | 预加载底图、进度条、`spine/jindutiao`、`audio/bgm-logo` |
| 5 | `config` | 读取配置 | `ConfigLoader.loadAll`，进度按已完成张数 |
| 6 | `login` | 登录 | 加载登录 Prefab 时加载层还盖着。连上以后才露出选服 |
| 7 | `sync` | 同步角色 | 只在真服。见下面的包 |
| 8 | `enter-main` | | 停掉 logo 音乐，进入 Main |

旧 lua 不在仓库里。logo 这三段时间写在 `client/assets/scripts/ui/logoSplash.ts` 的 `LOGO_FADE_IN_SEC`、`LOGO_HOLD_SEC`、`LOGO_FADE_OUT_SEC`。

`logo-scene_spr-logo.png` 仍是失败的图集抽出：文件 69 字节，IHDR 3×3。宽或高不超过 `LOGO_SPECK_MAX`（8）就不显示这张。开机改用已经抽出的 `logo-scene_spr-parttern-l` / `logo-scene_spr-parttern-r`，拉到高 820、中间叠 210，拼成焰环。以后字标本身大于 8×8，就只显示那一张，不再叠饰纹。

## 版本和热更

客户端版本只来自 `config/version` 的 `version`（当前表是 `201191119`）。代码里不再写 `0.1.0-mock`。

远程地址按表里的 `platform_urls`、`download_urls` 各试四个：`version.json`、`version.manifest`、`version`，以及目录本身。能读出不少于 5 位的整数，或 JSON 里的 `version` / `remoteVersion` / `clientVersion` / `rows[0].version`，就拿来比。远程更大才打开 UpdateLayer。相等或本地更大则跳过下载，日志仍是 `stage=hot-update skip`。

地址是空的，或者这些请求都失败（网络错误、超时、404、CORS、读不出版本号），不挡启动，也不把加载层换成失败页。`fetchRemoteVersion` 返回 null，不抛「校验版本失败」。GameLog 打警告，文案是「本地已是最新 / 跳过热更」，然后继续加载资源、读表、登录。H5（`isH5Client()`：Creator 浏览器预览、手机浏览器、桌面浏览器）走这条：本机预览到不了表里的 CDN 时，检查版本最多等到请求超时（默认 4 秒），然后进入后面的阶段，不再停在 0% 的重试。其它平台拉不到同样不卡死。远程真的更大时，UpdateLayer 仍会出来。

本地版本表本身读失败时，加载层仍换成热更层，文案用 language `47741`（校验版本失败），按钮用 `110013`（重试）。点过这一次重试还失败，按钮改成 language `47647`（跳过）；这句还没读到时按钮写成「继续」。点下去同样按「本地已是最新 / 跳过热更」往下走，不再无限停在重试。

要更新时：

- 热更层先写 language `110029` 和 `110030`，按钮是「下载」。
- H5（浏览器预览、手机浏览器、桌面浏览器）按下之后只把进度条走完，不发下载请求。
- 其它平台用 XHR 下载 `download_urls`（没有则用平台地址）下的 `version.manifest`，进度写入进度条。失败可以重试。
- 下载到的字节不写入原生搜索路径。这个客户端没有 AssetsManager，搜索路径补丁不在这一步。

## 读表

`ConfigLoader.loadAll(onProgress)` 先读 manifest，再 24 张一批。`onProgress(loaded, total)` 在每张结束时调用，失败的表也算进已完成张数。

这六张是核心表：`opencondition`、`system_gate`、`language`、`chapter`、`version`、`loadingtips`。缺任何一张，`loadAll` 抛「核心配置读取失败：…」，并且不把半套表放进 `ConfigDb.current`。Boot 停在加载层，重试会再读一遍。其余表失败仍只打警告并跳过。

`MainApp` 仍调用 `loadAll()`，不传进度回调。

加载提示在读表前后就会去读 `loadingtips` 和 `language`。`loadingtips` 的 `tips` 是 3701–3705，对到 language，去掉 `<font>` 之后随机换，约 3.5 秒一条，不连着重复同一条。颜色沿用 `#ffeeb2`。

## 登录

登录 Prefab 挂上之前，加载层保持「登录」，不再写「加载登录界面…」。连上桥之后加载层收起，选服露出来。心跳 1004 只写 GameLog，不写到面板上，也不 Toast。

点进入游戏之后加载层再盖上来，字仍是「登录」。协议号、uid、字段号只留在 GameLog。

面板上还留这些给玩家看的结果：服未启动、连接已关闭、正在重连、已改走 Mock，以及登录或创角失败时的那一行。空的状态行不会弹出 ErrorLayer。

创角面板不再写「登录 1001 回包是空的…」。确认发送时同样盖上加载层。

`?dev=mock` 的登录不等真服的包，角色进了就进 Main。

## 进主城前的包

真服登录确认有角色之后，顺序仍是原来的三下，中间不插别的号：

1. `WireSession.pullRoleProfile()`：空的 c2s 2001，紧接着空的 c2s 5001
2. `WireSession.pullChapter()`：空的 c2s 3007
3. `WireSession.pullIdle()`：空的 c2s 3004，以及它后面原来那串活动号

`prepareCity` 然后 `flush` 只在第一次进同步时做。登录过程里先到的包会在 flush 时写上。

加载层停在「同步角色」，直到 `WireSession.citySyncMissing()` 为空才进 Main。解不开的包不算。

| 包 | 判定 |
|---|---|
| 2001 | 顶栏写进名字、等级、金币、钻石至少一项。空包和解不开的不算 |
| 5001 | `hasBag()`。空背包算到了 |
| 3007 | `hasChapter()`。至少有一个 idx，最高 idx 为 0 也算。没有 idx 的包不算 |
| 3004 | `hasIdle()`。出现过上次领取时间或最大挂机时间。两个时间都没有的包不算 |
| 4001 | `hasHero()`。空名册算到了。空体和解不开的不算 |
| 15000 | `hasMail()`。空邮件表算到了 |
| 3101 | `hasLineUp()`。空包体算到了 |
| 3099 | `hasFormation()`。空包体算到了 |

`pullIdle` 里更后面的活动号照旧发，不挡切场景。

18 秒还缺包，加载层写出缺的号，按钮重试。重试再发上面那三下，不调用 `prepareCity`，已经进会话的包留着。Mock 不走这段等待。

## 画面铺满

加载层和热更层抵消 Boot `SafeFrame` 在窄屏上的缩小（`fitVisibleRoot`），按可见尺寸铺。`Bg` 用 cover：取可见宽 / 图宽、可见高 / 图高里更大的那个，多出来的裁掉，不留黑边。设计分辨率仍是 720×1280。不改 Fit Height，也不调用 `view.setDesignResolutionSize`。

中间人物是 `spine/jiemian` 的 `stand`。节点 `BootCast`，约 0.7 倍，放在背景之上、进度条之下。`bg-loading.jpg` 只有水底，不含这组人物。套没挂上打「loading cast miss spine/jiemian」，底图和进度条仍在。

左上角分辨率行默认不画。要看时加 `?safeDebug=1`，或 `localStorage.setItem("mxzg.safeDebug","1")`。刘海预览仍是 `mxzg.safe`。

## 相关文件

- `client/assets/scripts/core/Boot.ts`
- `client/assets/scripts/core/clientVersion.ts`
- `client/assets/scripts/ui/logoSplash.ts`
- `client/assets/scripts/ui/bootChrome.ts`
- `client/assets/prefabs/ui/login/LoadingLayer.prefab`
- `client/assets/prefabs/ui/login/UpdateLayer.prefab`
- `client/tools/gen_loading_prefab.py`
- 和 ccbi 对不上的地方：`docs/prefab-1to1-deviations.md` 末尾「启动加载 / 热更」
