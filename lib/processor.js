const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { parse } = require("csv-parse/sync");

/**
 * 处理多语言 CSV 文件并生成对应的 JSON 文件
 * @param {Object} options - 处理选项
 */
async function processMultiLanguage(options) {
  const {
    csvPath,
    templatePath,
    outputDir,
    groupKey = "",
    trim = false,
    langCodes = ["zh", "en"],
  } = options;

  try {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      console.log(chalk.yellow(`输出目录 "${outputDir}" 不存在，正在创建...`));
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. 读取模板 JSON 文件
    let templateJson;
    try {
      templateJson = JSON.parse(fs.readFileSync(templatePath, "utf8"));
    } catch (error) {
      throw new Error(`无法解析模板 JSON 文件: ${error.message}`);
    }

    // 修改组键存在性检查逻辑
    if (groupKey) {
      if (!templateJson[groupKey]) {
        throw new Error(`模板JSON文件中不存在组键 "${groupKey}"`);
      }
    } else {
      console.log(chalk.blue("直接处理翻译项（JSON未分组）"));
    }

    // 2. 读取 CSV 文件
    let csvContent;
    try {
      csvContent = fs.readFileSync(csvPath, "utf8");
      // 校验文件扩展名
      if (path.extname(csvPath).toLowerCase() !== ".csv") {
        throw new Error(`文件 "${csvPath}" 不是CSV格式`);
      }
    } catch (error) {
      throw new Error(`无法读取 CSV 文件: ${error.message}`);
    }

    // 抽取 CSV 解析逻辑到单独的函数
    const { zhToLangMap, recordCount } = parseCSVContent(
      csvContent, // 直接使用原始内容
      langCodes,
      trim
    );

    console.log(chalk.blue(`CSV 文件包含 ${recordCount} 行翻译数据`));

    // 抽取文件处理逻辑到单独的函数
    const stats = await processLanguageFiles(
      langCodes,
      outputDir,
      templateJson,
      zhToLangMap
    );

    // 输出统计信息
    logProcessingResults(stats);
  } catch (error) {
    console.error(chalk.red("处理多语言文件时出错:"), chalk.red(error.message));
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
    throw new Error("CSV 文件格式不正确，至少需要标题行和一行数据");
  }

  const zhToLangMap = new Map();

  // 处理每一行翻译
  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    if (!values[0]) continue;

    const zhText = values[0];
    for (let j = 1; j < Math.min(langCodes.length, values.length); j++) {
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
  zhToLangMap
) {
  // 4. 为每种语言创建或更新 JSON 文件
  const processedLangs = [];
  const totalStats = {
    updated: 0,
    unchanged: 0,
    languages: 0,
  };

  function updateNestedStructure(source, target, langCode) {
    let updates = 0;
    let unchanged = 0;
    
    // 创建一个新对象来保持源对象的键顺序
    const newTarget = {};

    for (const key in source) {
      if (typeof source[key] === "object" && source[key] !== null) {
        // 如果是对象，确保目标对象中有对应的结构
        const existingNestedObj = target[key] && typeof target[key] === "object" ? target[key] : {};
        newTarget[key] = {};
        
        // 递归处理嵌套对象
        const { updatedCount, unchangedCount } = updateNestedStructure(
          source[key],
          existingNestedObj,
          langCode
        );
        
        // 将处理结果赋值给新目标对象的对应键
        Object.assign(newTarget[key], existingNestedObj);
        
        updates += updatedCount;
        unchanged += unchangedCount;
      } else {
        const zhText = source[key];
        if (langCode === "zh") {
          if (target[key] !== zhText) {
            newTarget[key] = zhText;
            updates++;
          } else {
            newTarget[key] = zhText;
            unchanged++;
          }
        } else if (
          zhToLangMap.has(langCode) &&
          zhToLangMap.get(langCode).has(zhText)
        ) {
          const translatedText = zhToLangMap.get(langCode).get(zhText);
          if (target[key] !== translatedText) {
            newTarget[key] = translatedText;
            updates++;
          } else {
            newTarget[key] = translatedText;
            unchanged++;
          }
        } else {
          // 如果没有翻译，保留原值或使用中文值
          newTarget[key] = target[key] !== undefined ? target[key] : zhText;
        }
      }
    }
    
    // 将新对象的所有键值复制到目标对象
    // 清空目标对象
    for (const key in target) {
      delete target[key];
    }
    
    // 按照源对象的键顺序复制到目标对象
    for (const key in newTarget) {
      target[key] = newTarget[key];
    }

    return { updatedCount: updates, unchangedCount: unchanged };
  }

  for (let i = 0; i < langCodes.length; i++) {
    const langCode = langCodes[i];
    const langJsonPath = path.join(outputDir, `${langCode}.json`);

    let langJson = {};
    let originalLangJson = null;

    try {
      if (fs.existsSync(langJsonPath)) {
        const fileContent = fs.readFileSync(langJsonPath, "utf8");
        langJson = JSON.parse(fileContent);
        originalLangJson = JSON.parse(fileContent);
        console.log(chalk.blue(`已读取现有的 ${langCode}.json 文件`));
      } else {
        langJson = JSON.parse(JSON.stringify(templateJson));
        console.log(chalk.blue(`将为 ${langCode} 创建新的 JSON 文件`));
      }
    } catch (readError) {
      console.warn(
        chalk.yellow(
          `警告: 无法读取 ${langCode}.json 文件，将创建新文件: ${readError.message}`
        )
      );
      langJson = JSON.parse(JSON.stringify(templateJson));
    }

    // 使用新的嵌套结构更新函数
    const { updatedCount, unchangedCount } = updateNestedStructure(
      templateJson,
      langJson,
      langCode
    );

    // 检查是否有实际更改
    let hasChanges = updatedCount > 0;

    // 如果原始文件存在，比较整个对象是否有变化
    if (
      originalLangJson &&
      JSON.stringify(originalLangJson) === JSON.stringify(langJson)
    ) {
      hasChanges = false;
    }

    // 只有在有更改时才写入文件
    if (hasChanges) {
      try {
        fs.writeFileSync(
          langJsonPath,
          JSON.stringify(langJson, null, 2),
          "utf8"
        );
        processedLangs.push(`${langCode}(${updatedCount}项)`);
        console.log(
          chalk.green(
            `✓ 已生成 ${langCode}.json 文件，更新了 ${chalk.bold(
              updatedCount
            )} 项翻译，${unchangedCount} 项保持不变`
          )
        );
        totalStats.updated += updatedCount;
        totalStats.unchanged += unchangedCount;
        totalStats.languages++;
      } catch (writeError) {
        console.error(
          chalk.red(`写入 ${langCode}.json 文件时出错: ${writeError.message}`)
        );
      }
    } else {
      processedLangs.push(`${langCode}(0项)`);
      console.log(
        chalk.gray(
          `- ${langCode}.json 文件无需更新，所有 ${unchangedCount} 项翻译保持不变`
        )
      );
      totalStats.unchanged += unchangedCount;
    }
  }

  return { processedLangs, totalStats };
}

function logProcessingResults(stats) {
  console.log(chalk.green(`\n多语言处理完成！`));
  console.log(chalk.green(`✓ 处理了 ${stats.processedLangs.join(", ")} 语言`));
  console.log(
    chalk.green(
      `✓ 总计更新了 ${chalk.bold(stats.totalStats.updated)} 项翻译，${
        stats.totalStats.unchanged
      } 项保持不变`
    )
  );
  console.log(chalk.green(`✓ ${stats.totalStats.languages} 个语言文件被更新`));
}

module.exports = {
  processMultiLanguage,
};

