/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   204. dbObject5.js
 *
 * DESCRIPTION
 *   Test the Oracle data type Object on TIMESTAMP WITH LOCAL TIME ZONE.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('204. dbObject5.js', () => {
  let conn;
  const TYPE = 'NODB_TYP_OBJ_4';
  const TABLE  = 'NODB_TAB_OBJ4';

  let proc1 =
    `create or replace procedure nodb_getDataCursor1(p_cur out sys_refcursor) is      begin
        open p_cur for
          SELECT
            * FROM
            ${TABLE}
        WHERE num >= 100;
      end; `;

  let proc2 =
    `create or replace procedure nodb_getDataCursor2(p_cur out sys_refcursor) is
       begin
         open p_cur for
           SELECT
             * FROM
             ${TABLE}
         WHERE num >= 101;
       end; `;

  let proc3 =
      `create or replace procedure nodb_getDataCursor3(
          p_cur1 out sys_refcursor,
          p_cur2 out sys_refcursor
       ) is
       begin
         nodb_getDataCursor1(p_cur1);
         nodb_getDataCursor2(p_cur2);
       end;`;

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);

    let sql =
      `CREATE OR REPLACE TYPE ${TYPE} AS OBJECT (
        entry DATE,
        exit  DATE
      );`;
    await conn.execute(sql);

    sql =
      `CREATE TABLE ${TABLE} (
        num NUMBER,
        person ${TYPE}
      )`;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await conn.execute(plsql);
  }); // before()

  after(async () => {
    let sql = `DROP TABLE ${TABLE} PURGE`;
    await conn.execute(sql);

    sql = `DROP TYPE ${TYPE}`;
    await conn.execute(sql);

    await conn.execute(`DROP PROCEDURE nodb_getDataCursor3`);
    await conn.execute(`DROP PROCEDURE nodb_getDataCursor2`);
    await conn.execute(`DROP PROCEDURE nodb_getDataCursor1`);

    await conn.close();
  }); // after()

  it('204.1 insert an object with DATE type attribute', async () => {
    const seq = 101;
    let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

    const date1 = new Date (1986, 8, 18);
    const date2 = new Date (1989, 3, 4);
    const objData = {
      ENTRY: date1,
      EXIT : date2
    };
    const objClass = await conn.getDbObjectClass(TYPE);
    const testObj = new objClass(objData);

    let result = await conn.execute(sql, [seq, testObj]);
    assert.strictEqual(result.rowsAffected, 1);
    await conn.commit();

    sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
    result = await conn.execute(sql);

    assert.strictEqual(result.rows[0][1]['ENTRY'].getTime(), date1.getTime());
    assert.strictEqual(result.rows[0][1]['EXIT'].getTime(), date2.getTime());
    assert.strictEqual(result.rows[0][0], seq);
  }); // 204.1

  it('204.2 insert null value for DATE type attribute', async () => {
    const seq = 102;
    let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

    const objData = {
      ENTRY: null,
      EXIT : null
    };
    const objClass = await conn.getDbObjectClass(TYPE);
    const testObj = new objClass(objData);

    let result = await conn.execute(sql, [seq, testObj]);
    assert.strictEqual(result.rowsAffected, 1);
    await conn.commit();

    sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
    result = await conn.execute(sql);

    assert.strictEqual(result.rows[0][1]['ENTRY'], null);
    assert.strictEqual(result.rows[0][1]['EXIT'], null);
    assert.strictEqual(result.rows[0][0], seq);
  }); // 204.2

  it('204.3 insert undefined value for DATE type attribute', async () => {
    const seq = 102;
    let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

    const objData = {
      ENTRY: null,
      EXIT : null
    };
    const objClass = await conn.getDbObjectClass(TYPE);
    const testObj = new objClass(objData);

    let result = await conn.execute(sql, [seq, testObj]);
    assert.strictEqual(result.rowsAffected, 1);
    await conn.commit();

    sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
    result = await conn.execute(sql);

    assert.strictEqual(result.rows[0][1]['ENTRY'], null);
    assert.strictEqual(result.rows[0][1]['EXIT'], null);
    assert.strictEqual(result.rows[0][0], seq);
  }); // 204.3

  it('204.4 insert an empty JSON', async () => {
    const seq = 104;
    let sql = `INSERT INTO ${TABLE} VALUES (:1, :2)`;

    const objClass = await conn.getDbObjectClass(TYPE);
    const testObj = new objClass({});

    let result = await conn.execute(sql, [seq, testObj]);
    assert.strictEqual(result.rowsAffected, 1);
    await conn.commit();

    sql = `SELECT * FROM ${TABLE} WHERE num = ${seq}`;
    result = await conn.execute(sql);

    assert.strictEqual(result.rows[0][1]['ENTRY'], null);
    assert.strictEqual(result.rows[0][1]['EXIT'], null);
  }); // 204.4

  it('204.5 call procedure with 2 OUT binds of DbObject', async function() {
    await conn.execute(proc1);
    await conn.execute(proc2);
    await conn.execute(proc3);

    let result = await conn.execute(
      `BEGIN nodb_getDataCursor3(p_cur1 => :p_cur1,
          p_cur2 => :p_cur2); end;`,
      {
        p_cur1: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT},
        p_cur2: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}
      }
    );

    let resultSet = await result.outBinds.p_cur1.getRows();
    assert.equal(resultSet.length, 4);
    result.outBinds.p_cur1.close();

    resultSet = await result.outBinds.p_cur2.getRows();
    assert.equal(resultSet.length, 4);
    result.outBinds.p_cur2.close();
  }); // 204.5;

});
