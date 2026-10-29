import { by, cssString, type LocatorMap } from './LocatorHelper';

/** Dashboard: /dashboard/index */
export const DashboardLocators = {
  widgetTitles: by.css('.orangehrm-dashboard-widget-name'),
  /** The widget card. Its grid wrapper has the same class, hence `.oxd-sheet`. */
  widget: (title: string) =>
    by.css(`.oxd-sheet.orangehrm-dashboard-widget:has(.orangehrm-dashboard-widget-name :text-is(${cssString(title)}))`),
} satisfies LocatorMap;
