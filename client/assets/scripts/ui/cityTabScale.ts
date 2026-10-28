/**
 * 日服底栏是 UIMenuItemScale：点中的那一格放大，其余回到原大。
 * 96/78 是预制里战斗格相对其它格的尺寸。选中态用这个倍数，不再把战斗格做死成 96。
 */
export const TAB_REST_SIZE = 78;
export const TAB_SELECTED_SIZE = 96;
export const TAB_SELECTED_SCALE = TAB_SELECTED_SIZE / TAB_REST_SIZE;

export function tabVisualScale(selected: boolean): number {
  return selected ? TAB_SELECTED_SCALE : 1;
}
