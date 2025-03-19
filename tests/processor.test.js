const { processMultiLanguage } = require("../lib/processor");
const fs = require("fs");
const path = require("path");
const os = require("os");

describe("processMultiLanguage", () => {
  // 创建临时目录用于测试
  const tempDir = path.join(os.tmpdir(), "i18n-csv2json-test-" + Date.now());

  // 测试用的CSV内容
  const csvContent = `中文,英语,土耳其,印度尼西亚,阿拉伯
{{num}}金币,{{num}} Coins,{{num}} Coins,{{num}} Koin,{{num}} عملات
奖励,Reward,Ödül,Hadiah,المكافأة
{{num}}倍收益，{{goldNum}}金币,"{{num}}x earnings, {{goldNum}} coins","{{num}}x kazanç, {{goldNum}} coins","{{num}}x penghasilan, {{goldNum}} koin",أرباح {{num}}x، {{goldNum}} عملات
{{num}}人,{{num}} People,{{num}} Kişi,{{num}} orang,{{num}} أشخاص
获胜排行,Winning Rank,Kazanan Sıralama,Pemenang peringkat,الترتيب الفائز`;

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
      langCodes: ["zh", "en", "tr", "id", "ar"],
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

    // 验证生成的土耳其语文件
    const trJsonPath = path.join(tempDir, "tr.json");
    expect(fs.existsSync(trJsonPath)).toBe(true);

    const trJson = JSON.parse(fs.readFileSync(trJsonPath, "utf8"));
    expect(trJson).toEqual({
      price: "{{num}} Coins",
      reward: "Ödül",
      earnings: "{{num}}x kazanç, {{goldNum}} coins",
      winningRank: "Kazanan Sıralama",
      common: {
        people: "{{num}} Kişi",
      },
    });

    // 验证生成的印度尼西亚语文件
    const idJsonPath = path.join(tempDir, "id.json");
    expect(fs.existsSync(idJsonPath)).toBe(true);

    const idJson = JSON.parse(fs.readFileSync(idJsonPath, "utf8"));
    expect(idJson).toEqual({
      price: "{{num}} Koin",
      reward: "Hadiah",
      earnings: "{{num}}x penghasilan, {{goldNum}} koin",
      winningRank: "Pemenang peringkat",
      common: {
        people: "{{num}} orang",
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
      langCodes: ["zh", "en", "tr"],
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

  test("应该在CSV中没有对应翻译时保留原值", async () => {
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
    // 确保没有翻译的项保留中文原值
    expect(enJson.earnings).toBe("{{num}}倍收益，{{goldNum}}金币");
    expect(enJson.winningRank).toBe("获胜排行");
    expect(enJson.common.people).toBe("{{num}}人");
  });
});
