/** Shell chrome, General-nav, and Eightfold marketplace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '关闭',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
  'market.armoury': 'Armoury',
  'market.treasury': 'Treasury',
  'market.armourySubtitle': '从 Eightfold Armoury 浏览并安装界面皮肤。',
  'market.treasurySubtitle': '从 Eightfold Treasury 浏览并安装功能和插件。',
  'market.search': '搜索',
  'market.refresh': '刷新',
  'market.loading': '正在加载目录…',
  'market.empty': '暂无已发布的项目。',
  'market.install': '安装',
  'market.update': '更新',
  'market.installed': '已安装',
  'market.setTheme': '设为主题',
  'market.activeTheme': '当前主题',
  'market.settingTheme': '正在应用…',
  'market.installing': '正在安装…',
  'market.updateAvailable': '有可用更新',
  'market.close': '关闭',
  'market.error': '无法加载目录。',
  'market.branch': '分支',
} satisfies Record<string, string>

/** The settings namespace key union. */
export type SettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Close',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
  'market.armoury': 'Armoury',
  'market.treasury': 'Treasury',
  'market.armourySubtitle': 'Browse and install presentation skins from Eightfold Armoury.',
  'market.treasurySubtitle': 'Browse and install capabilities and plugins from Eightfold Treasury.',
  'market.search': 'Search',
  'market.refresh': 'Refresh',
  'market.loading': 'Loading catalog…',
  'market.empty': 'No published items are available yet.',
  'market.install': 'Install',
  'market.update': 'Update',
  'market.installed': 'Installed',
  'market.setTheme': 'Set as theme',
  'market.activeTheme': 'Active theme',
  'market.settingTheme': 'Applying…',
  'market.installing': 'Installing…',
  'market.updateAvailable': 'Update available',
  'market.close': 'Close',
  'market.error': 'Could not load the catalog.',
  'market.branch': 'Branch',
} satisfies Record<SettingsKey, string>
