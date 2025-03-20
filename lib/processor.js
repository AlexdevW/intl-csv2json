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
    const { zhToLangMap, recordCount } = parseCSVContent(
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

  // 处理每一行翻译
  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    if (!values[0]) continue;

    const zhText = values[0];
    for (let j = 0; j < Math.min(langCodes.length, values.length); j++) {
      if (!zhToLangMap.has(langCodes[j])) {
        zhToLangMap.set(langCodes[j], new Map());
      }
      const translation = values[j] || zhText;
      zhToLangMap.get(langCodes[j]).set(zhText, translation);
    }
  }

  return { zhToLangMap, recordCount: records.length - 1 };
}

async function processLanguageFiles(
  langCodes,
  outputDir,
  templateJson,
  zhToLangMap,
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

    // 递归处理函数
    function processNode(sourceNode, targetNode, currentPath = []) {
      if (processed.has(sourceNode)) {
        return processed.get(sourceNode);
      }

      const newNode = {};
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
          if (translationMap?.has(sourceValue)) {
            // 有翻译
            const translation = translationMap.get(sourceValue);
            newNode[key] = translation;
            if (targetValue !== translation || !originalLangJson) {
              stats.updatedCount++;
            } else {
              stats.unchangedCount++;
            }
          } else {
            // 无翻译时根据 useTemplateAsDefault 决定使用空字符串还是模板值
            newNode[key] = useTemplateAsDefault ? sourceValue : "";
            stats.missingTranslations.push({
              path: fullPath.join("."),
              sourceText: sourceValue,
              language: langCode,
              defaultValue: useTemplateAsDefault ? sourceValue : "",
            });
            stats.updatedCount++;
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
                defaultValue: item.defaultValue
              })
            )
          );
        } else {
          console.warn(
            chalk.yellow(
              t("missingTranslationItem", {
                path: item.path,
                sourceText: item.sourceText
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
        langJson = JSON.parse(JSON.stringify(templateJson));
        console.log(chalk.blue(t("createNewJson", { lang: langCode })));
      }
    } catch (readError) {
      console.warn(
        chalk.yellow(
          t("readJsonWarning", { lang: langCode, message: readError.message })
        )
      );
      langJson = JSON.parse(JSON.stringify(templateJson));
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
