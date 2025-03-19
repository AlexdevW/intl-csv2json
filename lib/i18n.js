const fs = require('fs');
const path = require('path');

// 语言包
let messages = {};

// 加载语言文件
function loadMessages() {
  const localesDir = path.join(__dirname, '../locales');
  
  try {
    // 加载中文语言包
    const zhPath = path.join(localesDir, 'zh.json');
    if (fs.existsSync(zhPath)) {
      messages.zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    }
    
    // 加载英文语言包
    const enPath = path.join(localesDir, 'en.json');
    if (fs.existsSync(enPath)) {
      messages.en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading language files:', error);
    // 如果加载失败，使用内置的默认语言包
    messages = {
      zh: require('../locales/zh.json'),
      en: require('../locales/en.json')
    };
  }
}

// 初始化时加载语言文件
loadMessages();

// 获取系统语言
function getSystemLanguage() {
  // 尝试从环境变量获取语言设置
  const envLang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES;
  console.log(envLang, 'envLang');
  if (envLang) {
    const lang = envLang.split('_')[0].toLowerCase();
    return lang === 'zh' ? 'zh' : 'en';
  }
  return 'en'; // 默认英文
}

// 当前语言
let currentLang = getSystemLanguage();

// 设置语言
function setLanguage(lang) {
  currentLang = (lang === 'zh') ? 'zh' : 'en';
}

// 获取翻译
function t(key, params = {}) {
  const langMessages = messages[currentLang] || messages.en;
  let message = langMessages[key] || key;
  
  // 替换参数
  Object.keys(params).forEach(param => {
    message = message.replace(`{${param}}`, params[param]);
  });
  
  return message;
}

module.exports = {
  t,
  setLanguage,
  getSystemLanguage
}; 