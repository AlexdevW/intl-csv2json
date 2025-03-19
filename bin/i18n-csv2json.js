#!/usr/bin/env node

const { processMultiLanguage } = require("../lib/processor");
const fs = require("fs");
const path = require("path");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const chalk = require("chalk");
const { input, confirm } = require("@inquirer/prompts");
const os = require("os");

const CONFIG_PATH = path.join(os.homedir(), ".i18n-csv2jsonrc");

// 新增配置管理函数
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch (e) {}
  return {};
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// 交互式问题函数
async function promptQuestions() {
  const lastConfig = loadConfig();
  console.log(chalk.cyan("欢迎使用多语言转换工具！"));
  console.log(chalk.cyan("请回答以下问题来配置转换过程...\n"));

  const answers = {
    csvPath: await input({
      message: "请输入 CSV 文件路径:",
      default: lastConfig.csvPath,
      validate: (value) => {
        if (!value) return "文件路径不能为空";
        if (path.extname(value).toLowerCase() !== ".csv")
          return "不是CSV格式文件";
        if (!fs.existsSync(value)) return "CSV文件不存在";
        return true;
      },
    }),
    templatePath: await input({
      message: "请输入模板 JSON 文件路径:",
      default: lastConfig.templatePath,
      validate: (value) => {
        if (!value) return "文件路径不能为空";
        if (!fs.existsSync(value)) return "模板文件不存在";
        if (path.extname(value).toLowerCase() !== ".json")
          return "不是JSON格式文件";
        return true;
      },
    }),
    outputDir: await input({
      message: "请输入输出目录:",
      default: lastConfig.outputDir || "./",
    }),
    groupKey: await input({
      message: "要处理的组键名（只对指定的组键名进行遍历，留空则处理根级）:",
      default: lastConfig.groupKey || "",
    }),
    trim: await confirm({
      message: "是否对值进行 trim 处理?",
      default: lastConfig.trim !== undefined ? lastConfig.trim : false,
    }),
    langCodes: await input({
      message: "请输入语言代码列表(用逗号分隔, 顺序和csv文件中的语言列一致, 根据语言代码生成对应的json文件):",
      default: lastConfig.langCodes || "zh,en",
      validate: (value) => {
        if (!value) return "语言代码不能为空";
        return true;
      },
    }),
  };

  saveConfig(answers);
  return answers;
}

// 主函数
async function main() {
  const argv = yargs(hideBin(process.argv))
    .usage("用法: $0 [选项]")
    .option("i", {
      alias: ["input", "csv"],
      describe: "CSV 文件路径",
      type: "string",
    })
    .option("t", {
      alias: ["template"],
      describe: "模板 JSON 文件路径",
      default: "./zh.json",
      type: "string",
    })
    .option("o", {
      alias: ["output"],
      describe: "输出目录",
      default: "./",
      type: "string",
    })
    .option("g", {
      alias: ["group"],
      describe: "要处理的组键名（只对指定的组键名数据进行遍历，留空则遍历整个json数据）",
      default: "",
      type: "string",
    })
    .option("trim", {
      describe: "是否对值进行 trim 处理",
      default: false,
      type: "boolean",
    })
    .option("lang-codes", {
      alias: "l",
      describe: "语言代码列表, 顺序和CSV文件中的语言列顺序一致, 根据语言代码生成对应的json文件",
      default: "zh,en",
      type: "string",
    })
    .example('$0 -i "./多语言.csv"', "使用默认配置处理多语言文件")
    .example('$0 -i "./多语言.csv" -g "common"', "指定组键名处理多语言文件")
    .help()
    .alias("help", "h")
    .version()
    .alias("version", "v").argv;

  let config;

  // 如果没有提供任何参数，启动交互式模式
  if (!argv.i && !argv.input && !argv.csv) {
    config = await promptQuestions();
  } else {
    // 使用命令行参数
    config = {
      csvPath: argv.i,
      templatePath: argv.t,
      outputDir: argv.o,
      groupKey: argv.g,
      trim: argv.trim,
      langCodes: argv.langCodes,
    };
  }

  // 处理语言代码
  const langCodes = config.langCodes.split(",").map((code) => code.trim());

  // 显示处理信息
  console.log(chalk.cyan("\n开始处理多语言文件..."));
  console.log(chalk.cyan(`CSV 文件: ${chalk.yellow(config.csvPath)}`));
  console.log(chalk.cyan(`模板文件: ${chalk.yellow(config.templatePath)}`));
  console.log(chalk.cyan(`输出目录: ${chalk.yellow(config.outputDir)}`));
  console.log(chalk.cyan(`分组名: ${chalk.yellow(config.groupKey)}`));
  console.log(chalk.cyan(`语言代码: ${chalk.yellow(langCodes.join(", "))}`));
  console.log(
    chalk.cyan(`Trim 处理: ${chalk.yellow(config.trim ? "是" : "否")}`)
  );
  console.log(chalk.cyan("-----------------------------------"));

  try {
    // 调用处理函数
    await processMultiLanguage({
      csvPath: config.csvPath,
      templatePath: config.templatePath,
      outputDir: config.outputDir,
      groupKey: config.groupKey,
      trim: config.trim,
      langCodes: langCodes,
    });
    console.log(chalk.green("✓ 处理完成！"));
  } catch (error) {
    console.error(chalk.red("处理失败："));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red(err));
  process.exit(1);
});
