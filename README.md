# i18n-transformer

[![npm version](https://img.shields.io/npm/v/i18n-transformer.svg)](https://www.npmjs.com/package/i18n-transformer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个将 CSV 格式的多语言文件转换为 JSON 格式的命令行工具。

## 安装

```bash
npm install -g i18n-transformer
```

## 使用方法

### 基本用法

```bash
i18n-transformer --csv <CSV文件路径> --template <模板JSON文件路径> --output <输出目录> --group <JSON分组名>
```

或者使用简写形式：

```bash
i18n-transformer -c <CSV文件路径> -t <模板JSON文件路径> -o <输出目录> -g <JSON分组名>
```

### 参数说明

- `--csv`, `-c`: CSV 文件路径（必需）
- `--template`, `-t`: 模板 JSON 文件路径（必需）
- `--output`, `-o`: 输出目录（必需）
- `--group`, `-g`: 要处理的 JSON 分组 （可选，默认为空）
- `--trim`: 是否对值进行 trim 处理（可选，默认为 false）
- `--lang-codes`, `-l`: 语言代码列表，用逗号分隔（可选，默认为 'zh,en,tr,id,ar'）

### 示例

```bash
i18n-transformer -c "./多语言.csv" -t "./zh.json" -o "./locales" -g "common"
```

## CSV 文件格式

CSV 文件的第一行应包含语言名称，从第二行开始包含翻译内容。第一列为中文文本，后续列为对应的其他语言翻译。

示例：
| 中文 | 英语 | 土耳其语 | 印度尼西亚语 | 阿拉伯语 |
| ---- | ---- | -------- | ------------ | -------- |
| {{num}}金币 | {{num}} Coins | {{num}} Coins | {{num}} Koin | {{num}} عملات |
| 奖励 | Reward | Ödül | Hadiah | مكافأة |
| {{num}}倍收益，{{goldNum}}金币 | {{num}}x earnings, {{goldNum}} coins | {{num}}x kazanç, {{goldNum}} coins | {{num}}x penghasilan, {{goldNum}} koin | {{num}}× {{goldNum}} عملات |
| {{num}}人 | {{num}} People | {{num}} Kişi | {{num}} orang | {{num}} شخصًا |
| 获胜排行 | Winning Rank | Kazanan Sıralama | Pemenang peringkat | ترتيب الفائزين |

## 模板 JSON 文件格式

模板 JSON 文件应该包含要处理的组键，例如：

```json
{
  "price": "{{num}}金币",
  "reward": "奖励",
  "earnings": "{{num}}倍收益，{{goldNum}}金币",
  "winningRank": "获胜排行",
  "common": {
    "people": "{{num}}人"
  }
}
```

## 输出

工具会在指定的输出目录中生成对应语言的 JSON 文件，例如 `en.json`、`tr.json` 等。

```json
// en.json
{
  "price": "{{num}} Coins",
  "reward": "Reward",
  "earnings": "{{num}}x earnings, {{goldNum}} coins",
  "winningRank": "Winning Rank",
  "common": {
    "people": "{{num}} People"
  }
}

// tr.json
{
  "price": "{{num}} Coins",
  "reward": "Ödül",
  "earnings": "{{num}}x kazanç, {{goldNum}} coins",
  "winningRank": "Kazanan Sıralama",
  "common": {
    "people": "{{num}} Kişi"
  }
}
// ...id.json, ar.json, ...
```
