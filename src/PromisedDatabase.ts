import sqlite3 from 'sqlite3';

export class PromisedDatabase {

    /** @private */
    private _db: sqlite3.Database | undefined;

    constructor() { }

    /**
     * @returns The wrapped sqlite3.Database object.
     */
    get db(): sqlite3.Database | undefined { return this._db; }

    /**
     * Instantiate the wrapped sqlite3.Database and open the database.
     * @see {@link https://github.com/mapbox/node-sqlite3/wiki/API#new-sqlite3databasefilename-mode-callback | sqlite3.Database.open} for further information.
     * @param filename - filename used to instantiate sqlite3.Database.
     * @param mode - mode used to instantiate sqlite3.Database.
     */
    open(filename: string, mode: number = sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE): Promise<void> {
        return new Promise((resolve, reject) => {
            this._db = new sqlite3.Database(filename, mode,
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Close the database.
     * @see {@link https://github.com/mapbox/node-sqlite3/wiki/API#databaseclosecallback | sqlite3.Database.close} for further information.
     */
    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this._db) resolve();
            else {
                this._db.close(
                    function (err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            }
        });
    }

    /**
     * Execute a sql request.<br>
     * Used for request that return nothing (eg `INSERT INTO`, `CREATE TABLE`)
     * @see {@link https://github.com/mapbox/node-sqlite3/wiki/API#databaserunsql-param--callback | sqlite3.Database.run} for further information.
     * @param sql - The sql request.
     * @param params - Parameters for the request.
     */
    run(sql: string, ...params: any[]): Promise<sqlite3.RunResult> {
        return new Promise((resolve, reject) => {
            if (!this._db) reject(error_dbNotOpened())
            else {
                const p: any = params.length === 1 ? params[0] : params;
                this._db.run(sql, p,
                    function (err) {
                        if (err) reject(err);
                        else resolve(this);
                    }
                );
            }
        });
    }

    /**
     * Execute a sql request.<br>
     * Used for request that return data. (eg `SELECT`).<br>
     * Return only the first row that match the request.
     * @see {@link https://github.com/mapbox/node-sqlite3/wiki/API#databasegetsql-param--callback | sqlite3.Database.get} for further information.
     * @param sql - The sql request.
     * @param params - Parameters for the request.
     */
    get(sql: string, ...params: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this._db) reject(error_dbNotOpened())
            else {
                const p: any = params.length === 1 ? params[0] : params;
                this._db.get(sql, p,
                    function (err, row) {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            }
        });
    }

    /**
     * Execute a sql request.<br>
     * Used for request that return data. (eg `SELECT`).<br>
     * Return all rows that match the request in a array.
     * @see {@link https://github.com/mapbox/node-sqlite3/wiki/API#databaseallsql-param--callback | sqlite3.Database.all} for further information.
     * @param sql - The sql request.
     * @param params - Parameters for the request.
     */
    all(sql: string, ...params: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!this._db) reject(error_dbNotOpened())
            else {
                const p: any = params.length === 1 ? params[0] : params;
                this._db.all(sql, p,
                    function (e, rows) {
                        if (e) reject(e);
                        else resolve(rows);
                    }
                );
            }
        });
    }

    /**
     * Execute a sql request.<br>
     * Used for request that return data. (eg `SELECT`).<br>
     * Execute the callback `cb` for each row.<br>
     * Return the number of retrieved rows.<br>
     * @see {@link https://github.com/mapbox/node-sqlite3/wiki/API#databaseeachsql-param--callback-complete | sqlite3.Database.each} for further information.
     * @param sql - The sql request.
     * @param params - Parameters for the request.
     * @param cb - A callback that take a row.
     */
    each(sql: string, params: any, cb: (row: any) => void): Promise<number> {
        return new Promise((resolve, reject) => {
            if (!(cb instanceof Function))
                reject(new TypeError("cb must be a Function."));

            if (!this._db) reject(error_dbNotOpened())
            else {
                this._db.each(sql, params,
                    function (err, row) {
                        if (err) reject(err);
                        else {
                            try {
                                cb(row);
                            } catch (e) {
                                reject(e);
                            }
                        }
                    },
                    function (err, count) {
                        if (err) reject(err);
                        else resolve(count);
                    }
                );
            }
        });
    }

    /**
     * Runs all sql queries in sql argument.
     * @see {@link https://github.com/mapbox/node-sqlite3/wiki/API#databaseexecsql-callback | sqlite3.Database.exec} for further information.
     * @param sql - sql request.
     */
    exec(sql: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this._db) reject(error_dbNotOpened())
            else {
                this._db.exec(sql, function (err) {
                    if (err) reject(err);
                    else resolve();
                });
            }
        });
    }

    // ===[ SHORTCUT METHODS ]===============================================================

    /**
     * Add a table to the database.<br>
     * Shortcut for `CREATE TABLE [IF NOT EXISTS] tableName (...)`.
     * @category Shortcut
     * @param tableName - name of the table to create.
     * @param ifNotExists - if set to true, add `IF NOT EXISTS` clause to the request.
     * @param cols - column definitions.
     */
    async createTable(tableName: string, ifNotExists: boolean, ...cols: string[]) {
        const ifNotExistsClause = ifNotExists ? "IF NOT EXISTS" : "";
        return await this.run(`CREATE TABLE ${ifNotExistsClause} ${tableName} (${cols.join(",")})`);
    }

    /**
     * Delete a table from the database.<br>
     * Shortcut for `DROP TABLE [IF EXISTS] tableName`.
     * @category Shortcut
     * @param tableName - name of the table.
     * @param ifExists - if set to true, add `IF EXISTS` clause to the request.
     */
    async dropTable(tableName: string, ifExists: boolean = false) {
        const ifExistsClause = ifExists ? "IF EXISTS" : "";
        return await this.run(`DROP TABLE ${ifExistsClause} ${tableName}`);
    }

    /**
     * Insert `row`in table.<br>
     * Shortcut for `INSERT INTO tableName [(...)] VALUES (...)`.<br>
     * `row`'s keys are used for table columns in the request. (Map or Object).<br>
     * if `row` is an Array, column names are omitted in the request.
     * 
     * Exemple:
     * ```typescript
     * // table foo
     * // id INTEGER PRIMARY KEY AUTOINCREMENT
     * // name TEXT
     * // age INTEGER
     * 
     * await db.insert("foo", { name: "Alice", age: 20 });
     * await db.insert("foo", [50, "Bob", 32]); // Array => column names are omitted so all values must be given.
     * 
     * const m = new Map().set("name", "Conan").set("age", 53);
     * await db.insert("foo", m);
     * ```
     * 
     * @category Shortcut
     * @param tableName - name of table.
     * @param row - row to insert.
     */
    async insert(tableName: string, row: any) {
        const sql = `INSERT INTO ${tableName} ${sqlInsertParseObject(row)}`;
        try {
            return await this.run(sql);
        } catch (error) {
            throw { sql, error };
        }
    }

    /**
     * Replace or insert `row` in the table.<br>
     * Shortcut for `REPLACE INTO tableName [(...)] VALUES (...)`.
     * @see `insert` for parameters usage and exemple
     * @category Shortcut
     * @param tableName - name of table.
     * @param row - row to insert.
     */
    async replace(tableName: string, row: any) {
        const sql = `REPLACE INTO ${tableName} ${sqlInsertParseObject(row)}`;
        try {
            return await this.run(sql);
        } catch (error) {
            throw { sql, error };
        }
    }

    /**
     * Insert multiple rows in table.<br>
     * Shortcut for `REPLACE INTO tableName [(...)] VALUES (...),(...),...`.<br>
     * If `columnName` if `undefined` or empty, column names are omitted in the request.<br>
     * If `columnName` is defined, `culumnName`'s values are used as keys to get values from each row.<br>
     * Except if the row is an Array.<br>
     * **Warning**: if `columnName` is `undefined` or empty, use only Array in `rows`. With Object or Map, values order is not guaranteed.  
     * 
     * Exemple:
     * ```typescript
     * // table foo
     * // id INTEGER PRIMARY KEY AUTOINCREMENT
     * // name TEXT
     * // age INTEGER
     * 
     * const a = {name: "Alice", age: 20 };
     * const b = ["Bob", 32];
     * const c = new Map().set("name", "Conan").set("age", 53);
     * await db.insertMany("foo", ["name", "age"], a, b, c);
     * ```
     * @category Shortcut
     * @param tableName - name of table.
     * @param columnNames - column names.
     * @param rows - rows to insert.
     */
    async insertMany(tableName: string, columnNames: string[] | undefined | null, ...rows: any[]) {
        let colNames = "";
        if (columnNames && columnNames.length !== 0)
            colNames = `(${columnNames.join(",")})`;
        else
            columnNames = undefined;

        const values = [];
        for (let row of rows) {
            if (!Array.isArray(row))
                row = getKeysValues(row, columnNames ?? undefined).values;
            values.push(`(${row.map(sqlifyValue).join(",")})`);
        }

        const sql = `INSERT INTO ${tableName} ${colNames} VALUES ${values.join(",")}`;
        try {
            return await this.run(sql);
        } catch (error) {
            throw { sql, error };
        }
    }
}

// ===[ Helpers ] ====================================================================================

/** @ignore */
function error_dbNotOpened() { return new Error("The database is not open."); }

/** @ignore */
function sqlifyValue(o: any) {
    if (o == undefined)
        return "NULL";
    if (typeof o === "string")
        return `"${o}"`;
    return o;
}

/** @ignore */
function getKeysValues(o: any, keys?: any[]) {
    if (o instanceof Map) {
        keys = keys || Array.from(o.keys());
        const values = keys.map(k => o.get(k));
        return { keys, values };
    } else {
        keys = keys || Object.keys(o);
        const values = keys.map(k => o[k]);
        return { keys, values };
    }
}

/** @ignore */
function sqlInsertParseObject(row: any) {
    let colNames = "";
    let values = [];

    if (Array.isArray(row))
        values = row.map(sqlifyValue);
    else {
        const kv = getKeysValues(row);
        colNames = `(${kv.keys.join(",")})`;
        values = kv.values.map(sqlifyValue);
    }

    return `${colNames} VALUES (${values.join(",")})`;
}