# promised-sqlite3

[<img alt="github" src="https://img.shields.io/badge/github-tguichaoua/promised--sqlite3-8da0cb?style=for-the-badge&labelColor=555555&logo=github" height="20">](https://github.com/tguichaoua/promised-sqlite3)
[<img alt="crates.io" src="https://img.shields.io/npm/v/promised-sqlite3?style=for-the-badge&logo=npm&logoColor=white" height="20">](https://www.npmjs.com/package/promised-sqlite3)

A thin wrapper for [`sqlite3`](https://www.npmjs.com/package/sqlite3) database that expose an async API.

## Install

**Note**: `sqlite3` is marked as a [peer dependency](https://flaviocopes.com/npm-peer-dependencies/), you must also install it.

```
npm install promised-sqlite3 sqlite3
```

## Usage

`AsyncDatabase` is a wrapper that expose an async version of the `sqlite3.Database`'s API.

### Async API

The following methods of `sqlite3.Database` are available as async methods in `AsyncDatabase` :

- `open`
- `close`
- `run`
- `get`
- `all`
- `each`
- `exec`

These methods accept the same arguments as their sync version except for the `callback` one.
Refer to the [`sqlite3`'s API reference](https://github.com/TryGhost/node-sqlite3/wiki/API) for further information on their usage.

### The rest of the API

`AsyncDatabase` only exposes the async methods listed above. You can access to the `sqlite3.Database` object with the `AsyncDatabase.inner` property (see example below).

### Example

```javascript
const { AsyncDatabase } = require("promised-sqlite3");

(async () => {
  try {
    // Create the AsyncDatabase object and open the database.
    const db = await AsyncDatabase.open("./db.sqlite");

    // Access the inner sqlite3.Database object to use the API that is not exposed by AsyncDatabase.
    db.inner.on("trace", (sql) => console.log("[TRACE]", sql));

    // Run some sql request.
    await db.run(
      "CREATE TABLE IF NOT EXISTS foo (id INTEGER PRIMARY KEY AUTOINCREMENT, a TEXT NOT NULL, b TEXT)"
    );
    await db.run("INSERT INTO foo (a, b) VALUES (?, ?)", "alpha", "beta");
    await db.run("INSERT INTO foo (a, b) VALUES ($goo, $hoo)", {
      $goo: "GOO !",
      $hoo: "HOO :",
    });
    await db.run("INSERT INTO foo (a, b) VALUES (?, ?)", [
      "Value of a",
      "Value of b",
    ]);

    // Read database.
    const row = await db.get("SELECT * FROM foo WHERE id = ?", 2);
    const rows = await db.all("SELECT * FROM foo");
    await db.each("SELECT * FROM foo WHERE id > ?", 5, (row) =>
      console.log(row)
    );

    // Close the database.
    await db.close();
  } catch (err) {
    console.error(err);
  }
})();
```
