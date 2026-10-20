import { JsonAsset, resources } from "cc";
import { ConfigTableFile, OpenConditionRow, SystemGateRow } from "./types";

/**
 * 读 assets/resources/config 下的 JSON。
 * 路径相对 resources，不带扩展名。xlsx 以后怎么导出见同目录 README.md。
 */
export const CONFIG_PATHS = {
  opencondition: "config/opencondition",
  systemGate: "config/system_gate",
};

export class ConfigDb {
  static current: ConfigDb | null = null;
  opencondition: OpenConditionRow[] = [];
  systemGate: SystemGateRow[] = [];
}

export class ConfigLoader {
  static loadJson<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => {
      resources.load(path, JsonAsset, (err, asset) => {
        if (err || !asset || asset.json == null) {
          reject(err ?? new Error("missing json " + path));
          return;
        }
        resolve(asset.json as T);
      });
    });
  }

  static async loadAll(): Promise<ConfigDb> {
    const opencondition = await ConfigLoader.loadJson<ConfigTableFile<OpenConditionRow>>(
      CONFIG_PATHS.opencondition
    );
    const systemGate = await ConfigLoader.loadJson<ConfigTableFile<SystemGateRow>>(CONFIG_PATHS.systemGate);
    const db = new ConfigDb();
    db.opencondition = Array.isArray(opencondition.rows) ? opencondition.rows : [];
    db.systemGate = Array.isArray(systemGate.rows) ? systemGate.rows : [];
    ConfigDb.current = db;
    console.log(
      "[Config] loaded opencondition=" + db.opencondition.length + " system_gate=" + db.systemGate.length
    );
    return db;
  }
}
