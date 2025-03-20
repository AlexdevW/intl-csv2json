const { processMultiLanguage } = require("../lib/processor");
const fs = require("fs");
const path = require("path");
const os = require("os");

describe("processMultiLanguage", () => {
  // 创建临时目录用于测试
  const tempDir = path.join(os.tmpdir(), "intl-csv2json-test-" + Date.now());

  // 测试用的CSV内容
  const csvContent = `中文,英语,阿拉伯
{{num}}金币,{{num}} Coins,{{num}} عملات
奖励,Reward,المكافأة
{{num}}倍收益，{{goldNum}}金币,"{{num}}x earnings, {{goldNum}} coins",أرباح {{num}}x، {{goldNum}} عملات
{{num}}人,{{num}} People,{{num}} أشخاص
获胜排行,Winning Rank,الترتيب الفائز`;

  // 测试用的模板JSON
  const templateJson = {
    price: "{{num}}金币",
    reward: "奖励",
    earnings: "{{num}}倍收益，{{goldNum}}金币",
    winningRank: "获胜排行",
    common: {
      people: "{{num}}人",
    },
  };

  // 在每个测试前设置环境
  beforeEach(() => {
    // 创建临时目录
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 写入测试CSV文件
    fs.writeFileSync(path.join(tempDir, "test.csv"), csvContent, "utf8");

    // 写入测试模板文件
    fs.writeFileSync(
      path.join(tempDir, "zh.json"),
      JSON.stringify(templateJson, null, 2),
      "utf8"
    );
  });

  // 在每个测试后清理环境
  afterEach(() => {
    // 删除临时目录及其内容
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);
    }
  });

  test("应该正确处理多语言文件并生成对应的JSON文件", async () => {
    // 设置测试参数
    const options = {
      csvPath: path.join(tempDir, "test.csv"),
      templatePath: path.join(tempDir, "zh.json"),
      outputDir: tempDir,
      langCodes: ["zh", "en", "ar"],
      trim: false,
    };

    // 执行处理函数
    await processMultiLanguage(options);

    // 验证生成的英语文件
    const enJsonPath = path.join(tempDir, "en.json");
    expect(fs.existsSync(enJsonPath)).toBe(true);

    const enJson = JSON.parse(fs.readFileSync(enJsonPath, "utf8"));
    expect(enJson).toEqual({
      price: "{{num}} Coins",
      reward: "Reward",
      earnings: "{{num}}x earnings, {{goldNum}} coins",
      winningRank: "Winning Rank",
      common: {
        people: "{{num}} People",
      },
    });

    // 验证生成的阿拉伯语文件
    const arJsonPath = path.join(tempDir, "ar.json");
    expect(fs.existsSync(arJsonPath)).toBe(true);

    const arJson = JSON.parse(fs.readFileSync(arJsonPath, "utf8"));
    expect(arJson).toEqual({
      price: "{{num}} عملات",
      reward: "المكافأة",
      earnings: "أرباح {{num}}x، {{goldNum}} عملات",
      winningRank: "الترتيب الفائز",
      common: {
        people: "{{num}} أشخاص",
      },
    });
  });

  test("应该处理指定的组键", async () => {
    // 设置测试参数，指定只处理common组
    const options = {
      csvPath: path.join(tempDir, "test.csv"),
      templatePath: path.join(tempDir, "zh.json"),
      outputDir: tempDir,
      groupKey: "common",
      langCodes: ["zh", "en", "ar"],
      trim: false,
    };

    // 执行处理函数
    await processMultiLanguage(options);

    // 验证生成的英语文件
    const enJsonPath = path.join(tempDir, "en.json");
    expect(fs.existsSync(enJsonPath)).toBe(true);

    const enJson = JSON.parse(fs.readFileSync(enJsonPath, "utf8"));
    // 确保common组被正确处理
    expect(enJson.common.people).toBe("{{num}} People");
  });

  test("应该在CSV中没有对应翻译时保留空字符串", async () => {
    // 创建一个不完整的CSV文件（缺少某些翻译）
    const incompleteCsvContent = `中文,英语
{{num}}金币,{{num}} Coins
奖励,Reward`;

    fs.writeFileSync(
      path.join(tempDir, "incomplete.csv"),
      incompleteCsvContent,
      "utf8"
    );

    // 设置测试参数
    const options = {
      csvPath: path.join(tempDir, "incomplete.csv"),
      templatePath: path.join(tempDir, "zh.json"),
      outputDir: tempDir,
      langCodes: ["zh", "en"],
      trim: false,
    };

    // 执行处理函数
    await processMultiLanguage(options);

    // 验证生成的英语文件
    const enJsonPath = path.join(tempDir, "en.json");
    expect(fs.existsSync(enJsonPath)).toBe(true);

    const enJson = JSON.parse(fs.readFileSync(enJsonPath, "utf8"));
    // 确保有翻译的项被正确处理
    expect(enJson.price).toBe("{{num}} Coins");
    expect(enJson.reward).toBe("Reward");
    // 确保没有翻译的项保留空字符串
    expect(enJson.earnings).toBe("");
    expect(enJson.winningRank).toBe("");
    expect(enJson.common.people).toBe("");
  });
});
