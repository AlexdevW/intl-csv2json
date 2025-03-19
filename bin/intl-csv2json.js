#!/usr/bin/env node

const { processMultiLanguage } = require("../lib/processor");
const fs = require("fs");
const path = require("path");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const chalk = require("chalk");
const { input, confirm } = require("@inquirer/prompts");
const os = require("os");
const { t, setLanguage } = require("../lib/i18n");

const CONFIG_PATH = path.join(os.homedir(), ".intl-csv2jsonrc");

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
  console.log(chalk.cyan(t("welcome")));
  console.log(chalk.cyan(t("configPrompt") + "\n"));

  const answers = {
    csvPath: await input({
      message: t("csvPathPrompt"),
      default: lastConfig.csvPath,
      validate: (value) => {
        if (!value) return t("pathEmpty");
        if (path.extname(value).toLowerCase() !== ".csv")
          return t("notCsvFile");
        if (!fs.existsSync(value)) return t("csvNotExist");
        return true;
      },
    }),
    templatePath: await input({
      message: t("templatePathPrompt"),
      default: lastConfig.templatePath,
      validate: (value) => {
        if (!value) return t("pathEmpty");
        if (!fs.existsSync(value)) return t("templateNotExist");
        if (path.extname(value).toLowerCase() !== ".json")
          return t("notJsonFile");
        return true;
      },
    }),
    outputDir: await input({
      message: t("outputDirPrompt"),
      default: lastConfig.outputDir || "./",
    }),
    groupKey: await input({
      message: t("groupKeyPrompt"),
      default: lastConfig.groupKey || "",
    }),
    trim: await confirm({
      message: t("trimPrompt"),
      default: lastConfig.trim !== undefined ? lastConfig.trim : false,
    }),
    langCodes: await input({
      message: t("langCodesPrompt"),
      default: lastConfig.langCodes || "zh,en",
      validate: (value) => {
        if (!value) return t("langCodeEmpty");
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
    .usage(t("usage"))
    .option("i", {
      alias: ["input", "csv"],
      describe: t("csvOption"),
      type: "string",
    })
    .option("t", {
      alias: ["template"],
      describe: t("templateOption"),
      default: "./zh.json",
      type: "string",
    })
    .option("o", {
      alias: ["output"],
      describe: t("outputOption"),
      default: "./",
      type: "string",
    })
    .option("g", {
      alias: ["group"],
      describe: t("groupOption"),
      default: "",
      type: "string",
    })
    .option("trim", {
      describe: t("trimOption"),
      default: false,
      type: "boolean",
    })
    .option("lang-codes", {
      alias: "l",
      describe: t("langCodesOption"),
      default: "zh,en",
      type: "string",
    })
    .option("lang", {
      describe: t("langOption"),
      default: "auto",
      type: "string",
    })
    .example('$0 -i "./language_translations.csv"', t("example1"))
    .example('$0 -i "./language_translations.csv" -g "common"', t("example2"))
    .help()
    .alias("help", "h")
    .version()
    .alias("version", "v").argv;

  // 设置显示语言
  if (argv.lang && argv.lang !== "auto") {
    setLanguage(argv.lang);
  }

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
  console.log(chalk.cyan("\n" + t("startProcessing")));
  console.log(chalk.cyan(`${t("csvFile")} ${chalk.yellow(config.csvPath)}`));
  console.log(chalk.cyan(`${t("templateFile")} ${chalk.yellow(config.templatePath)}`));
  console.log(chalk.cyan(`${t("outputDir")} ${chalk.yellow(config.outputDir)}`));
  console.log(chalk.cyan(`${t("groupName")} ${chalk.yellow(config.groupKey)}`));
  console.log(chalk.cyan(`${t("langCodes")} ${chalk.yellow(langCodes.join(", "))}`));
  console.log(
    chalk.cyan(`${t("trimProcess")} ${chalk.yellow(config.trim ? t("yes") : t("no"))}`)
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
    console.log(chalk.green("✓ " + t("completed")));
  } catch (error) {
    console.error(chalk.red(t("processFailed")));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(chalk.red(err));
  process.exit(1);
});
