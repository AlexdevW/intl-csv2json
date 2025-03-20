# intl-csv2json

[![npm version](https://img.shields.io/npm/v/intl-csv2json.svg)](https://www.npmjs.com/package/intl-csv2json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个将 CSV 格式的多语言文件转换为 JSON 格式的命令行工具。

中文 | [English](./README.md)

## 安装

```bash
npm install -g intl-csv2json
```

## 使用方法

### 基本用法

```bash
intl-csv2json --input <CSV文件路径> --template <模板JSON文件路径>
```

或者使用简写形式:

```bash
intl-csv2json -i <CSV文件路径> -t <模板JSON文件路径>
```

#### 交互式命令

你也可以使用交互式命令来运行工具:

```bash
# 这将启动一个交互式界面，引导你输入所需的参数
intl-csv2json
```

### 参数说明

- `--input`, `-i`: CSV 文件路径（必需）
- `--template`, `-t`: 模板 JSON 文件路径（必需）
- `--output`, `-o`: 输出目录（可选，默认为当前目录）
- `--lang-codes`, `-l`: 语言代码列表，用逗号分隔, 按照 CSV 文件中的语言列顺序填写（可选，默认为 'zh,en'）
- `--group`, `-g`: 要处理的 JSON 分组 （可选，默认为空）
- `--trim`: 是否对值进行 trim 处理（可选，默认为 false）
- `--lang`: 显示语言（可选，'zh'或'en'，默认为自动检测）
- `--use-template-default`, `-d`: 无翻译时是否使用模板值作为默认值（可选，默认为 false）

### 示例

```bash
intl-csv2json -i "./language_translations.csv" -t "./zh.json" -o "./" -l "zh,en,ar"

# 使用模板值作为缺失翻译的默认值
intl-csv2json -i "./language_translations.csv" -t "./zh.json" -d
```

## CSV 文件格式

CSV 文件的第一行应包含语言名称，从第二行开始包含翻译内容。第一列为 JSON 模版对应的源语言值，后续列为对应的其他语言翻译。

示例:
| 中文 | 英语 | 阿拉伯语 |
| ---- | ---- | -------- |
| {{num}}金币 | {{num}} Coins | {{num}} عملات |
| 奖励 | Reward | مكافأة |
| {{num}}倍收益，{{goldNum}}金币 | {{num}}x earnings, {{goldNum}} coins | {{num}}× {{goldNum}} عملات |
| {{num}}人 | {{num}} People | {{num}} شخصًا |
| 获胜排行 | Winning Rank | ترتيب الفائزين |

## 模板 JSON 文件格式

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

工具会在指定的输出目录中生成对应语言的 JSON 文件，例如 `en.json`、`ar.json` 等。

en.json

```json
{
  "price": "{{num}} Coins",
  "reward": "Reward",
  "earnings": "{{num}}x earnings, {{goldNum}} coins",
  "winningRank": "Winning Rank",
  "common": {
    "people": "{{num}} People"
  }
}
```

ar.json

```json
{
  "price": "{{num}} عملات",
  "reward": "مكافأة",
  "earnings": "{{num}}× {{goldNum}} عملات",
  "winningRank": "ترتيب الفائزين",
  "common": {
    "people": "{{num}} شخصًا"
  }
}
```

## 许可证

MIT
