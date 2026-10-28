import { UILayer } from "./UILayer";
import type { BaseView } from "./BaseView";

/** 一个正式界面：视图类、Prefab、页面 id 绑在一起。 */
export interface ViewSpec {
  id: string;
  /** 相对 assets，例如 prefabs/ui/backpack/BackpackLayer。 */
  prefab: string;
  layer: UILayer;
}

export type ViewClass<T> = new () => BaseView<T>;

const byCtor = new Map<Function, ViewSpec>();
const byId = new Map<string, Function>();

/** 类装饰器。和 @ccclass 一起写在视图上。 */
export function view(spec: ViewSpec): ClassDecorator {
  return (ctor) => {
    const previous = byId.get(spec.id);
    if (previous && previous !== ctor) {
      throw new Error("页面 id 重复 " + spec.id);
    }
    byCtor.set(ctor as unknown as Function, spec);
    byId.set(spec.id, ctor as unknown as Function);
    return ctor;
  };
}

export function viewSpecOf(ctor: Function): ViewSpec | null {
  return byCtor.get(ctor) || null;
}

export function viewCtorById(id: string): Function | null {
  return byId.get(id) || null;
}
