# intl-csv2json

[![npm version](https://img.shields.io/npm/v/intl-csv2json.svg)](https://www.npmjs.com/package/intl-csv2json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A command-line tool for converting CSV format multilingual files to JSON format.

[中文文档](./README.zh.md) | English

## Installation

```bash
npm install -g intl-csv2json
```

## Usage

### Basic Usage

```bash
intl-csv2json --input <CSV_FILE_PATH> --template <TEMPLATE_JSON_PATH>
```

Or use the shorthand form:

```bash
intl-csv2json -i <CSV_FILE_PATH> -t <TEMPLATE_JSON_PATH>
```

#### Interactive Command

You can also use the interactive command to run the tool:

```bash
# This will start an interactive interface to guide you through the required parameters
intl-csv2json
```

### Parameters

- `--input`, `-i`: CSV file path (required)
- `--template`, `-t`: Template JSON file path (required)
- `--output`, `-o`: Output directory (optional, default is current directory)
- `--lang-codes`, `-l`: Language code list, comma separated, according to the order of the language columns in the CSV file (optional, default is 'zh,en')
- `--group`, `-g`: JSON group to process (optional, default is empty)
- `--trim`: Whether to trim values (optional, default is false)
- `--lang`: Display language (optional, 'zh' or 'en', default is auto-detect)

### Example

```bash
intl-csv2json -i "./translations.csv" -t "./zh.json" -o "./" -l "zh,en,ar"
```

## CSV File Format

The first line of the CSV file should contain language names, and translation content should start from the second line. The first column contains the source language values corresponding to the JSON template, and subsequent columns contain translations in other languages.

Example:
| Chinese | English | Arabic |
| ---- | ---- | -------- |
| {{num}}金币 | {{num}} Coins | {{num}} عملات |
| 奖励 | Reward | مكافأة |
| {{num}}倍收益，{{goldNum}}金币 | {{num}}x earnings, {{goldNum}} coins | {{num}}× {{goldNum}} عملات |
| {{num}}人 | {{num}} People | {{num}} شخصًا |
| 获胜排行 | Winning Rank | ترتيب الفائزين |

## Template JSON File Format

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

## Output

The tool will generate JSON files for corresponding languages in the specified output directory, such as `en.json`, `tr.json`, etc.

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

## License

MIT
