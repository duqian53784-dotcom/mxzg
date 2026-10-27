/**
 * 只给 skeleton-check 的 esbuild 解析 "cc"。
 * Creator 工程不引用这个文件。isBrowser 保持 false，用来覆盖预览里 sys.isBrowser 不准的情况。
 */
export const sys = {
  isBrowser: false,
  platform: "native",
  Platform: {
    MOBILE_BROWSER: "mobile-browser",
    DESKTOP_BROWSER: "desktop-browser",
    ANDROID: "android",
    IOS: "ios",
  },
  getSafeAreaRect(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 0, height: 0 };
  },
};

export class JsonAsset {
  json: object | null = null;
}

export const resources = {
  load(_path: string, _type: unknown, cb: (err: Error | null, asset: unknown) => void): void {
    cb(new Error("skeleton-check 不读 resources"), null);
  },
};
