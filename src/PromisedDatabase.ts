import sqlite3 from 'sqlite3';

function error_dbNotOpened() { return new Error("The database is not open."); }

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
     * Execute a sql request. Used for request that return nothing (eg `INSERT INTO`, `CREATE TABLE`)
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
     * Execute a sql request. Used for request that return data. (eg `SELECT`).
     * Return only the first row that match the request.
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
     * Execute a sql request. Used for request that return data. (eg `SELECT`).
     * Return all rows that match the request in a array.
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
     * Execute a sql request. Used for request that return data. (eg `SELECT`).
     * Execute the callback cb for each row.
     * Return the number of retrieved rows.
     * @param sql - The sql request.
     * @param params - Parameters for the request.
     * @param {RowCallback} cb - A callback that take a row.
     */
    each(sql: string, ...params: any[]): Promise<number> {
        return new Promise((resolve, reject) => {
            if (params.length === 0)
                reject(new TypeError("Missing argument : callback"));
            const cb: ((row: any) => void) = params.pop();
            if (!(cb instanceof Function))
                reject(new TypeError("Missing argument : callback"));

            if (!this._db) reject(error_dbNotOpened())
            else {
                const p: any = params.length === 1 ? params[0] : params;
                this._db.each(sql, p,
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
     * Add a table to the database.
     * Shortcut for `CREATE TABLE`.
     * @param tableName - name of the table to create.
     * @param ifNotExists - if set to true, add `IF NOT EXISTS` clause to the request.
     * @param cols - column definitions.
     */
    async createTable(tableName: string, ifNotExists: boolean, ...cols: string[]) {
        const ifNotExistsClause = ifNotExists ? "IF NOT EXISTS" : "";
        return await this.run(`CREATE TABLE ${ifNotExistsClause} ${tableName} (${cols.join(",")})`);
    }

    /**
     * Delete a table from the database.
     * Shortcut for `DROP TABLE`.
     * @param tableName - name of the table.
     * @param ifExists - if set to true, add `IF EXISTS` clause to the request.
     */
    async dropTable(tableName: string, ifExists: boolean = false) {
        const ifExistsClause = ifExists ? "IF EXISTS" : "";
        return await this.run(`DROP TABLE ${ifExistsClause} ${tableName}`);
    }
}