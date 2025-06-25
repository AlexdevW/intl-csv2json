const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { parse } = require("csv-parse/sync");
const { t } = require("./i18n");

/**
 * 处理多语言 CSV 文件并生成对应的 JSON 文件
 * @param {Object} options - 处理选项
 * @param {string} options.csvPath - CSV 文件路径
 * @param {string} options.templatePath - 模板文件路径
 * @param {string} options.outputDir - 输出目录
 * @param {string} options.groupKey - 组键名
 * @param {boolean} options.trim - 是否trim处理
 * @param {string[]} options.langCodes - 语言代码列表
 * @param {boolean} options.useTemplateAsDefault - 无翻译时是否使用模板值作为默认值
 */
async function processMultiLanguage(options) {
  const {
    csvPath,
    templatePath,
    outputDir,
    groupKey = "",
    trim = false,
    langCodes = ["zh", "en"],
    useTemplateAsDefault = false,
  } = options;

  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      console.log(chalk.yellow(t("outputDirNotExist", { dir: outputDir })));
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. 读取模板 JSON 文件
    let templateJson;
    try {
      templateJson = JSON.parse(fs.readFileSync(templatePath, "utf8"));
    } catch (error) {
      throw new Error(t("templateParseError", { message: error.message }));
    }

    // 修改组键存在性检查逻辑
    if (groupKey) {
      if (!templateJson[groupKey]) {
        throw new Error(t("groupKeyNotExist", { key: groupKey }));
      }
    } else {
      console.log(chalk.blue(t("processingRoot")));
    }

    // 2. 读取 CSV 文件
    let csvContent;
    try {
      csvContent = fs.readFileSync(csvPath, "utf8");
      // 校验文件扩展名
      if (path.extname(csvPath).toLowerCase() !== ".csv") {
        throw new Error(t("notCsvFormat", { path: csvPath }));
      }
    } catch (error) {
      throw new Error(t("csvReadError", { message: error.message }));
    }

    // 抽取 CSV 解析逻辑到单独的函数
    const { zhToLangMap, translationContexts, recordCount } = parseCSVContent(
      csvContent,
      langCodes,
      trim
    );

    console.log(chalk.blue(t("csvRowCount", { count: recordCount })));

    // 抽取文件处理逻辑到单独的函数
    const stats = await processLanguageFiles(
      langCodes,
      outputDir,
      templateJson,
      zhToLangMap,
      translationContexts,
      templatePath,
      groupKey,
      useTemplateAsDefault
    );

    // 输出统计信息
    logProcessingResults(stats);
  } catch (error) {
    console.error(chalk.red(t("processingError")), chalk.red(error.message));
    throw error;
  }
}

function parseCSVContent(content, langCodes, trim) {
  const records = parse(content, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    trim,
    bom: true, // 启用 BOM 标记自动处理
  });

  if (records.length < 1) {
    throw new Error(t("csvFormatError"));
  }

  const zhToLangMap = new Map();
  const translationContexts = new Map(); // 存储翻译的上下文信息

  // 处理每一行翻译
  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    if (!values[0]) continue;

    const zhText = values[0];
    
    // 计算当前行的上下文特征
    const contextFeatures = calculateRowContext(records, i);
    
    for (let j = 0; j < Math.min(langCodes.length, values.length); j++) {
      const translation = values[j];
      if (translation && translation.trim() !== '') {
        const langCode = langCodes[j];
        
        if (!zhToLangMap.has(langCode)) {
          zhToLangMap.set(langCode, new Map());
        }
        
        if (!translationContexts.has(langCode)) {
          translationContexts.set(langCode, new Map());
        }
        
        const langMap = zhToLangMap.get(langCode);
        const contextMap = translationContexts.get(langCode);
        
        // 存储翻译数组，支持同一中文文本的多个翻译
        if (!langMap.has(zhText)) {
          langMap.set(zhText, []);
          contextMap.set(zhText, []);
        }
        
        langMap.get(zhText).push(translation);
        contextMap.get(zhText).push(contextFeatures);
      }
    }
  }

  return { zhToLangMap, translationContexts, recordCount: records.length - 1 };
}

/**
 * 计算CSV行的上下文特征
 */
function calculateRowContext(records, currentIndex) {
  const context = {
    rowIndex: currentIndex,
    adjacentTexts: [],
    beforeTexts: [],
    afterTexts: [],
  };
  
  // 获取前后各2行的文本
  const contextRange = 2;
  
  // 前面的行
  for (let i = Math.max(1, currentIndex - contextRange); i < currentIndex; i++) {
    if (records[i] && records[i][0]) {
      context.beforeTexts.push(records[i][0]);
      context.adjacentTexts.push(records[i][0]);
    }
  }
  
  // 后面的行
  for (let i = currentIndex + 1; i <= Math.min(records.length - 1, currentIndex + contextRange); i++) {
    if (records[i] && records[i][0]) {
      context.afterTexts.push(records[i][0]);
      context.adjacentTexts.push(records[i][0]);
    }
  }
  
  return context;
}

/**
 * 分析JSON路径的上下文特征
 */
function analyzeJsonContext(templateJson, currentPath, sourceValue) {
  const context = {
    adjacentKeys: [],
    adjacentValues: [],
    beforeKeys: [],
    afterKeys: [],
    sectionKeys: [],
  };
  
  // 获取当前节点的父级对象
  let parentObj = templateJson;
  for (let i = 0; i < currentPath.length - 1; i++) {
    parentObj = parentObj[currentPath[i]];
  }
  
  if (typeof parentObj === 'object' && parentObj !== null) {
    const keys = Object.keys(parentObj);
    const currentKey = currentPath[currentPath.length - 1];
    const currentIndex = keys.indexOf(currentKey);
    
    // 获取相邻的keys和values
    const contextRange = 2;
    
    // 前面的keys
    for (let i = Math.max(0, currentIndex - contextRange); i < currentIndex; i++) {
      const key = keys[i];
      const value = parentObj[key];
      if (typeof value === 'string') {
        context.beforeKeys.push(key);
        context.adjacentKeys.push(key);
        context.adjacentValues.push(value);
      }
    }
    
    // 后面的keys  
    for (let i = currentIndex + 1; i <= Math.min(keys.length - 1, currentIndex + contextRange); i++) {
      const key = keys[i];
      const value = parentObj[key];
      if (typeof value === 'string') {
        context.afterKeys.push(key);
        context.adjacentKeys.push(key);
        context.adjacentValues.push(value);
      }
    }
    
    // 获取同一section内的所有keys
    context.sectionKeys = keys.filter(key => typeof parentObj[key] === 'string');
  }
  
  return context;
}

/**
 * 计算两个上下文的相似度
 */
function calculateContextSimilarity(csvContext, jsonContext) {
  let score = 0;
  
  // 检查相邻文本的重复程度
  const csvTexts = csvContext.adjacentTexts;
  const jsonTexts = jsonContext.adjacentValues;
  
  let commonTexts = 0;
  csvTexts.forEach(csvText => {
    if (jsonTexts.includes(csvText)) {
      commonTexts++;
    }
  });
  
  // 相邻文本重复度评分（权重最高）
  if (csvTexts.length > 0 && jsonTexts.length > 0) {
    score += (commonTexts / Math.max(csvTexts.length, jsonTexts.length)) * 10;
  }
  
  // 位置相似性评分（如果都在开头或结尾）
  const csvPosition = csvContext.rowIndex;
  const isJsonStart = jsonContext.beforeKeys.length === 0;
  const isJsonEnd = jsonContext.afterKeys.length === 0;
  
  if ((csvPosition <= 3 && isJsonStart) || (csvPosition >= 120 && isJsonEnd)) {
    score += 2;
  }
  
  return score;
}

/**
 * 根据上下文相似度选择最佳翻译
 */
function selectBestTranslationByContext(translations, contexts, currentPath, templateJson, sourceValue, textUsageCount) {
  if (translations.length <= 1) {
    return 0; // 只有一个翻译，直接返回
  }
  
  const currentUsage = textUsageCount || 0;
  
  // 分析当前JSON位置的上下文
  const jsonContext = analyzeJsonContext(templateJson, currentPath, sourceValue);
  
  // 为每个翻译计算上下文相似度得分
  let bestIndex = currentUsage;
  let bestScore = -1;
  
  for (let i = 0; i < contexts.length; i++) {
    const csvContext = contexts[i];
    let score = 0;
    
    // 基于上下文相似度评分
    score += calculateContextSimilarity(csvContext, jsonContext);
    
    // 基于使用顺序的评分（避免跳跃太大）
    const indexDistance = Math.abs(i - currentUsage);
    score += Math.max(0, 3 - indexDistance);
    
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  
  // 如果最佳匹配得分太低，还是按顺序使用
  if (bestScore < 1) {
    bestIndex = Math.min(currentUsage, translations.length - 1);
  }
  
  return bestIndex;
}

/**
 * 创建与模板结构相同但值为空的JSON对象
 */
function createEmptyJsonStructure(templateJson) {
  function createEmptyNode(node) {
    if (typeof node === 'object' && node !== null && !Array.isArray(node)) {
      const emptyNode = {};
      for (const key in node) {
        emptyNode[key] = createEmptyNode(node[key]);
      }
      return emptyNode;
    } else if (typeof node === 'string') {
      return ''; // 字符串字段设为空字符串
    } else {
      return node; // 其他类型保持原样
    }
  }
  
  return createEmptyNode(templateJson);
}

async function processLanguageFiles(
  langCodes,
  outputDir,
  templateJson,
  zhToLangMap,
  translationContexts,
  templatePath,
  groupKey,
  useTemplateAsDefault
) {
  // 如果存在 groupKey，只处理该组的数据
  if (groupKey) {
    templateJson = { [groupKey]: templateJson[groupKey] };
  }

  // 4. 为每种语言创建或更新 JSON 文件
  const processedLangs = [];
  const totalStats = {
    updated: 0,
    unchanged: 0,
    languages: 0,
  };

  // 检查第一个语言文件路径是否与模板路径相同
  const primaryLangCode = langCodes[0];
  const primaryLangPath = path.join(outputDir, `${primaryLangCode}.json`);
  let skipPrimaryLang = false;

  // 如果模板路径与主语言文件路径相同，则跳过处理主语言
  if (path.resolve(templatePath) === path.resolve(primaryLangPath)) {
    skipPrimaryLang = true;
  }

  function updateNestedStructure(source, target, langCode, originalLangJson) {
    const stats = {
      updatedCount: 0,
      unchangedCount: 0,
      missingTranslations: [],
    };
    const processed = new WeakMap();
    // 用于跟踪每个中文文本的使用次数
    const textUsageCount = new Map();

    // 递归处理函数
    function processNode(sourceNode, targetNode, currentPath = []) {
      if (processed.has(sourceNode)) {
        return processed.get(sourceNode);
      }

      const newNode = { ...targetNode }; // 使用目标节点的现有结构
      processed.set(sourceNode, newNode);

      for (const key in sourceNode) {
        const sourceValue = sourceNode[key];
        const targetValue = targetNode?.[key];
        const fullPath = [...currentPath, key];

        if (typeof sourceValue === "object" && sourceValue !== null) {
          // 处理嵌套对象
          newNode[key] = processNode(sourceValue, targetValue, fullPath);
        } else {
          // 处理叶子节点（文本）
          const translationMap = zhToLangMap.get(langCode);
          const contextMap = translationContexts?.get(langCode);
          
          if (translationMap?.has(sourceValue)) {
            // 获取当前文本的使用次数
            const currentUsage = textUsageCount.get(sourceValue) || 0;
            const translations = translationMap.get(sourceValue);
            const contexts = contextMap?.get(sourceValue) || [];
            
            // 根据上下文选择最佳翻译
            const bestIndex = selectBestTranslationByContext(
              translations, 
              contexts, 
              fullPath, 
              source, // 传入完整的模板对象
              sourceValue,
              currentUsage
            );
            
            const translation = translations[bestIndex];
            
            // 更新使用次数
            textUsageCount.set(sourceValue, currentUsage + 1);
            
            newNode[key] = translation;
            if (targetValue !== translation || !originalLangJson) {
              stats.updatedCount++;
            } else {
              stats.unchangedCount++;
            }
          } else {
            // 没有找到翻译时的处理
            if (useTemplateAsDefault) {
              // 使用模板值作为默认值
              newNode[key] = sourceValue;
              stats.missingTranslations.push({
                path: fullPath.join('.'),
                sourceText: sourceValue,
                defaultValue: sourceValue,
              });
              if (targetValue !== sourceValue || !originalLangJson) {
                stats.updatedCount++;
              } else {
                stats.unchangedCount++;
              }
            } else {
              // 如果是新文件且目标值为空字符串，保持为空
              if (!originalLangJson && targetValue === '') {
                newNode[key] = '';
                stats.unchangedCount++;
              } else {
                // 保持原有值不变
                newNode[key] = targetValue;
                stats.missingTranslations.push({
                  path: fullPath.join('.'),
                  sourceText: sourceValue,
                });
                stats.unchangedCount++;
              }
            }
          }
        }
      }

      return newNode;
    }

    const newTarget = processNode(source, target);

    // 输出缺失翻译的提示信息
    if (stats.missingTranslations.length > 0) {
      console.warn(
        chalk.yellow(
          t("missingTranslationsWarning", {
            lang: langCode,
            count: stats.missingTranslations.length,
          })
        )
      );
      stats.missingTranslations.forEach((item) => {
        if (useTemplateAsDefault) {
          console.warn(
            chalk.yellow(
              t("missingTranslationItemWithDefault", {
                path: item.path,
                sourceText: item.sourceText,
                defaultValue: item.defaultValue,
              })
            )
          );
        } else {
          console.warn(
            chalk.yellow(
              t("missingTranslationItem", {
                path: item.path,
                sourceText: item.sourceText,
              })
            )
          );
        }
      });
    }

    return {
      newLangJson: newTarget,
      stats: {
        updatedCount: stats.updatedCount,
        unchangedCount: stats.unchangedCount,
        missingTranslationsCount: stats.missingTranslations.length,
      },
    };
  }

  // 修改循环起始索引，如果跳过主语言则从索引1开始
  for (let i = skipPrimaryLang ? 1 : 0; i < langCodes.length; i++) {
    const langCode = langCodes[i];
    const langJsonPath = path.join(outputDir, `${langCode}.json`);

    let langJson = {};
    let originalLangJson = null;

    try {
      if (fs.existsSync(langJsonPath)) {
        const fileContent = fs.readFileSync(langJsonPath, "utf8");
        langJson = JSON.parse(fileContent);
        originalLangJson = langJson;
        console.log(chalk.blue(t("existingJsonRead", { lang: langCode })));
      } else {
        // 创建空的JSON结构，而不是复制模板内容
        langJson = createEmptyJsonStructure(templateJson);
        console.log(chalk.blue(t("createNewJson", { lang: langCode })));
      }
    } catch (readError) {
      console.warn(
        chalk.yellow(
          t("readJsonWarning", { lang: langCode, message: readError.message })
        )
      );
      // 出错时也创建空结构
      langJson = createEmptyJsonStructure(templateJson);
    }

    const { newLangJson, stats } = updateNestedStructure(
      templateJson,
      langJson,
      langCode,
      originalLangJson
    );

    const { updatedCount, unchangedCount } = stats;

    // 检查是否有实际更改
    let hasChanges = updatedCount > 0;

    // 如果原始文件存在，比较整个对象是否有变化
    if (
      originalLangJson &&
      JSON.stringify(originalLangJson) === JSON.stringify(newLangJson)
    ) {
      hasChanges = false;
    }

    if (hasChanges) {
      try {
        fs.writeFileSync(
          langJsonPath,
          JSON.stringify(newLangJson, null, 2),
          "utf8"
        );
        processedLangs.push(`${langCode}(${updatedCount} ${t("items")})`);
        console.log(
          chalk.green(
            t("jsonGenerated", {
              lang: langCode,
              updated: chalk.bold(updatedCount),
              unchanged: unchangedCount,
            })
          )
        );
        totalStats.updated += updatedCount;
        totalStats.unchanged += unchangedCount;
        totalStats.languages++;
      } catch (writeError) {
        console.error(
          chalk.red(
            t("writeJsonError", { lang: langCode, message: writeError.message })
          )
        );
      }
    } else {
      processedLangs.push(`${langCode}(0 ${t("items")})`);
      console.log(
        chalk.gray(
          t("noUpdateNeeded", { lang: langCode, unchanged: unchangedCount })
        )
      );
      totalStats.unchanged += unchangedCount;
    }
  }

  return { processedLangs, totalStats };
}

function logProcessingResults(stats) {
  console.log(chalk.green(`\n${t("processingComplete")}`));
  console.log(
    chalk.green(
      t("processedLanguages", { langs: stats.processedLangs.join(", ") })
    )
  );
  console.log(
    chalk.green(
      t("totalUpdates", {
        updated: chalk.bold(stats.totalStats.updated),
        unchanged: stats.totalStats.unchanged,
      })
    )
  );
  console.log(
    chalk.green(t("filesUpdated", { count: stats.totalStats.languages }))
  );
}

module.exports = {
  processMultiLanguage,
};
