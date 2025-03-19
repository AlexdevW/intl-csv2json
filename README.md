# i18n-csv2json

[![npm version](https://img.shields.io/npm/v/i18n-csv2json.svg)](https://www.npmjs.com/package/i18n-csv2json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个将 CSV 格式的多语言文件转换为 JSON 格式的命令行工具。

## 安装

```bash
npm install -g i18n-csv2json
```

## 使用方法

### 基本用法

```bash
i18n-csv2json --input <CSV文件路径> --template <模板JSON文件路径> --output <输出目录> --lang-codes <语言代码列表> --group <JSON分组名> --trim
```

或者使用简写形式：

```bash
i18n-csv2json -i <CSV文件路径> -t <模板JSON文件路径> -o <输出目录> -l <语言代码列表> -g <JSON分组名> -t
```

#### 交互式命令

你也可以使用交互式命令来运行工具

```bash
# 这将启动一个交互式界面，引导你输入所需的参数
i18n-csv2json 
```

### 参数说明

- `--input`, `-i`: CSV 文件路径（必需）
- `--template`, `-t`: 模板 JSON 文件路径（必需）
- `--output`, `-o`: 输出目录（必需）
- `--lang-codes`, `-l`: 语言代码列表，用逗号分隔（可选，默认为 'zh,en'）
- `--group`, `-g`: 要处理的 JSON 分组 （可选，默认为空）
- `--trim`: 是否对值进行 trim 处理（可选，默认为 false）

### 示例

```bash
i18n-csv2json -i "./多语言.csv" -t "./zh.json" -o "./locales"
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
tr.json

```json
{
  "price": "{{num}} Coins",
  "reward": "Ödül",
  "earnings": "{{num}}x kazanç, {{goldNum}} coins",
  "winningRank": "Kazanan Sıralama",
  "common": {
    "people": "{{num}} Kişi"
  }
}
```
...id.json, ar.json, ...