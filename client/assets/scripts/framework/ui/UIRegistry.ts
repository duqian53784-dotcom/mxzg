import { Node, Prefab } from "cc";
import { UILayer } from "./UILayer";
import type { BaseView } from "./BaseView";

/** 把预制挂进页面宿主。背包的店内底图放在自己的挂载里，不写进 UIManager。 */
export type ViewMount = (host: Node, prefab: Prefab) => Node | Promise<Node>;

/** 一个正式界面：视图类、Prefab、页面 id 绑在一起。 */
export interface ViewSpec {
  id: string;
  /** 相对 assets，例如 prefabs/ui/backpack/BackpackLayer。 */
  prefab: string;
  layer: UILayer;
  /** 关掉后如果节点还在，留着实例，下次不再加载。 */
  cache: boolean;
  /** 同一页面能否叠两份。不能时，进行中的打开共用一次，只压一层。 */
  allowMultiple: boolean;
  /**
   * 非 Page 挂到哪一个常驻宿主。
   * 宿主由 UIManager.setResidentHost 登记，注册表只存字符串。
   */
  hostId?: string;
  /** 不写就直接生成在宿主下。 */
  mount?: ViewMount;
}

export type ViewClass<T> = new () => BaseView<T>;

const byCtor = new Map<Function, ViewSpec>();
const byId = new Map<string, Function>();

/** 类装饰器。和 @ccclass 一起写在视图上。 */
export function view(spec: ViewSpec): ClassDecorator {
  const stored: ViewSpec = {
    id: spec.id,
    prefab: spec.prefab,
    layer: spec.layer,
    cache: spec.cache === true,
    allowMultiple: spec.allowMultiple === true,
    hostId: spec.hostId,
    mount: spec.mount,
  };
  return (ctor) => {
    const previous = byId.get(stored.id);
    if (previous && previous !== ctor) {
      throw new Error("页面 id 重复 " + stored.id);
    }
    byCtor.set(ctor as unknown as Function, stored);
    byId.set(stored.id, ctor as unknown as Function);
    return ctor;
  };
}

export function viewSpecOf(ctor: Function): ViewSpec | null {
  return byCtor.get(ctor) || null;
}

export function viewCtorById(id: string): Function | null {
  return byId.get(id) || null;
}
