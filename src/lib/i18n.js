// 分类结构 + 双语文案
export const CATEGORIES = {
  humanities: {
    zh: '人文', en: 'Humanities',
    items: {
      portrait: { zh: '肖像', en: 'Portrait' },
      architecture: { zh: '建筑', en: 'Architecture' },
      urban: { zh: '城市风光', en: 'Urban' }
    }
  },
  nature: {
    zh: '自然', en: 'Nature',
    items: {
      creative: { zh: '创意照片', en: 'Creative' },
      animal: { zh: '动物', en: 'Animal' },
      landscape: { zh: '自然风光', en: 'Landscape' }
    }
  }
};

export const ALL_CATEGORIES = Object.values(CATEGORIES)
  .reduce((acc, g) => acc.concat(Object.keys(g.items)), []);

// zip 内文件夹名 -> 分类 key
export const FOLDER_MAP = {
  '城市': 'urban', '城市风光': 'urban',
  '肖像': 'portrait', '人像': 'portrait',
  '建筑': 'architecture',
  '创意': 'creative', '创意照片': 'creative',
  '动物': 'animal',
  '风光': 'landscape', '自然风光': 'landscape'
};

export const IMG_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic'];

export const UI = {
  zh: {
    siteTitle: 'GALLERY',
    siteSub: '画廊',
    langBtn: 'EN',
    importBtn: '批量导入',
    addPhoto: '添加照片',
    heroAll: '全部照片',
    heroAllDesc: '光影之间，记录世界的温度。',
    modalTitle: '添加照片',
    editTitle: '编辑说明',
    categoryLabel: '分类',
    imageLabel: '选择照片',
    capZhLabel: '说明（中文）',
    capEnLabel: '说明（English）',
    save: '保存',
    cancel: '取消',
    empty: '这里还没有照片',
    emptyHint: '点击右上角「添加照片」或「批量导入」开始记录',
    deleteConfirm: '确定要删除这张照片吗？',
    noFile: '请先选择一张照片',
    saved: '已保存',
    addedOn: '添加于',
    importDone: '导入完成',
    parsing: '正在解析压缩包...',
    importing: '正在导入',
    uploading: '正在上传...',
    lockBtn: '编辑',
    unlockBtn: '编辑中',
    unlockTitle: '输入编辑密码',
    unlockHint: '只有你能添加、修改或删除照片。输入密码后本标签页内无需重复输入。',
    pwLabel: '密码',
    wrongPw: '密码不对，再试一次',
    unlock: '解锁',
    needPw: '请先点右上角「编辑」输入密码',
    unlocked: '已解锁，可以编辑了',
    locked: '已锁定编辑',
    sessionExpired: '登录已过期，请重新输入密码',
    all: '全部'
  },
  en: {
    siteTitle: 'GALLERY',
    siteSub: '画廊',
    langBtn: '中文',
    importBtn: 'Import Zip',
    addPhoto: 'Add Photo',
    heroAll: 'All Photos',
    heroAllDesc: 'Between light and shadow, recording the warmth of the world.',
    modalTitle: 'Add Photo',
    editTitle: 'Edit Caption',
    categoryLabel: 'Category',
    imageLabel: 'Choose photo',
    capZhLabel: 'Caption (中文)',
    capEnLabel: 'Caption (English)',
    save: 'Save',
    cancel: 'Cancel',
    empty: 'No photos here yet',
    emptyHint: 'Click "Add Photo" or "Import Zip" in the top right to start',
    deleteConfirm: 'Delete this photo?',
    noFile: 'Please choose an image first',
    saved: 'Saved',
    addedOn: 'Added on',
    importDone: 'Import done',
    parsing: 'Parsing zip...',
    importing: 'Importing',
    uploading: 'Uploading...',
    lockBtn: 'Edit',
    unlockBtn: 'Editing',
    unlockTitle: 'Enter edit password',
    unlockHint: 'Only you can add, edit or delete photos. One password per browser tab.',
    pwLabel: 'Password',
    wrongPw: 'Wrong password, try again',
    unlock: 'Unlock',
    needPw: 'Click "Edit" in the top right and enter the password first',
    unlocked: 'Unlocked - you can edit now',
    locked: 'Editing locked',
    sessionExpired: 'Session expired, please enter the password again',
    all: 'All'
  }
};

export function catLabel(lang, key) {
  if (key === 'all') return UI[lang].heroAll;
  for (const g of Object.values(CATEGORIES)) {
    if (g.items[key]) return lang === 'zh' ? g.items[key].zh : g.items[key].en;
  }
  return key;
}
