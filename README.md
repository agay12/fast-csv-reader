# fast-csv-reader

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/agay12/fast-csv-reader/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/agay12/fast-csv-reader/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for csv-reader 1.0.0 with byte-identical answers: one pass of char codes,
whole-field slices instead of per-character building, and a per-character slow path only for
fields that actually hold broken sequences (stray CR, junk after a closing quote).
3.5x the house baseline on the practice set.

## Run it

```sh
node main.ts          # reads $MAKEFUN_INPUT_DIR/cases.json (or /input), writes answers.json (or /output)
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=jtd7n6hg&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
---
