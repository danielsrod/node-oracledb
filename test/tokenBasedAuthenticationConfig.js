/* Copyright (c) 2022, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   dbConfigTokenBasedAuth.js
 *
 * PREREQUISITES
 *   Install Oracle cloud infrastructure command line interface (OCI-CLI).
 *     The command line interface (CLI) is a tool that enables you to work with
 *     Oracle Cloud Infrastructure objects and services at a command line.
 *     https://docs.oracle.com/en-us/iaas/Content/API/Concepts/cliconcepts.htm
 *   Oracle Client libraries 19.14 (or later), or 21.5 (or later).
 *   node-oracledb 5.4 or later.
 *
 * DESCRIPTION
 *   This file conduct the configuration work for token based authentication
 *   tests.
 *
 *   Environment variables used:
 *   NODE_ORACLEDB_USER,
 *   NODE_ORACLEDB_PASSWORD,
 *   NODE_ORACLEDB_CONNECTIONSTRING,
 *   NODE_ORACLEDB_ACCESS_TOKEN_LOC
 *   NODE_ORACLEDB_EXPIRED_ACCESS_TOKEN_LOC
 *
******************************************************************************/

const fs = require('fs');
const { execSync } = require('child_process');

var config = {
  test : {
    printDebugMsg : false
  }
};

// Execute the OCI-CLI command to generate a token.
// This should create two files "token" and "oci_db_key.pem"
// Default file location is ~/.oci/db-token
execSync('oci iam db-token get', { encoding: 'utf-8' });

if (process.env.NODE_ORACLEDB_CONNECTIONSTRING) {
  config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING;
} else {
  throw new Error('Database Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING.');
}

if (process.env.NODE_ORACLEDB_ACCESS_TOKEN_LOC) {
  config.tokenLocation = process.env.NODE_ORACLEDB_ACCESS_TOKEN_LOC;
} else {
  throw new Error('Db-token file location is not set! Try Set Environment Variable NODE_ORACLEDB_ACCESS_TOKEN_LOC');
}

if (process.env.NODE_ORACLEDB_USER) {
  config.user = process.env.NODE_ORACLEDB_USER;
} else {
  throw new Error('User is not Set! Try Set Environment Variable NODE_ORACLEDB_USER.');
}

if (process.env.NODE_ORACLEDB_PASSWORD) {
  config.password = process.env.NODE_ORACLEDB_PASSWORD;
} else {
  throw new Error('Password is not Set! Try Set Environment Variable NODE_ORACLEDB_PASSWORD.');
}

if (process.env.NODE_ORACLEDB_EXPIRED_ACCESS_TOKEN_LOC) {
  config.expiredToken = process.env.NODE_ORACLEDB_EXPIRED_ACCESS_TOKEN_LOC;
} else {
  throw new Error('Expired token location is not Set! Try Set Environment Variable NODE_ORACLEDB_EXPIRED_ACCESS_TOKEN_LOC.');
}

if (process.env.NODE_PRINT_DEBUG_MESSAGE) {
  var printDebugMsg = process.env.NODE_PRINT_DEBUG_MESSAGE;
  printDebugMsg = String(printDebugMsg);
  printDebugMsg = printDebugMsg.toLowerCase();
  if (printDebugMsg == 'true') {
    config.test.printDebugMsg = true;
  }
}

// User defined function for reading token and private key values generated by
// the OCI-CLI.
// NODE_ORACLEDB_DBTOKEN_LOC environment variable is used to provide directory
// path where token and private key files are stored.
function getToken(envName) {
  const tokenPath = process.env[envName] + '/' + 'token';
  const privateKeyPath = process.env[envName] + '/' + 'oci_db_key.pem';

  let token = '';
  let privateKey = '';
  try {
    // Read token file
    token = fs.readFileSync(tokenPath, 'utf8');
    // Read private key file
    const privateKeyFileContents = fs.readFileSync(privateKeyPath, 'utf-8');
    privateKeyFileContents.split(/\r?\n/).forEach(line => {
      if (line != '-----BEGIN PRIVATE KEY-----' &&
        line != '-----END PRIVATE KEY-----')
        privateKey = privateKey.concat(line);
    });
  } catch (err) {
    console.error(err);
  }

  const tokenBasedAuthData = {
    token         : token,
    privateKey    : privateKey
  };
  return tokenBasedAuthData;
}

config.accessToken = getToken('NODE_ORACLEDB_ACCESS_TOKEN_LOC');
config.expiredAccessToken = getToken('NODE_ORACLEDB_EXPIRED_ACCESS_TOKEN_LOC');

// callback function with vlid data
// privateKey and token having valid data
function callbackValid() {
  return config.accessToken;
}

// callback function with invalid data
// privateKey and token having invalid data
function callbackInvalid1() {
  const obj1 = config.accessToken;
  const obj2 = {
    token       : obj1.privateKey,
    privateKey  : obj1.token
  };
  return obj2;
}

// callback function with invalid data
// dbtoken attribute is missing
function callbackInvalid2() {
  const obj1 = config.accessToken;
  const obj2 = {
    privateKey  : obj1.privateKey
  };
  return obj2;
}

// callback function with invalid data
// dbtoken is empty
function callbackInvalid3() {
  const obj1 = config.accessToken;
  const obj2 = {
    token         : '',
    privateKey    : obj1.privateKey
  };
  return obj2;
}

// callback function with invalid data
// dbtokenPrivateKeyattribute is missing
function callbackInvalid4() {
  const obj1 = config.accessToken;
  const obj2 = {
    token: obj1.token
  };
  return obj2;
}

// callback function with invalid data
// dbtokenPrivateKey is empty
function callbackInvalid5() {
  const obj1 = config.accessToken;
  const obj2 = {
    token       : obj1.token,
    privateKey  : ''
  };
  return obj2;
}

config.callbackValid = callbackValid();
config.callbackInvalid1 = callbackInvalid1();
config.callbackInvalid2 = callbackInvalid2();
config.callbackInvalid3 = callbackInvalid3();
config.callbackInvalid4 = callbackInvalid4();
config.callbackInvalid5 = callbackInvalid5();

module.exports = config;