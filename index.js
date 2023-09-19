#!/usr/bin/env node
// need to run npm -link to globally use this script (nls command as defined in package.json)
// nodejs.org/api
// corefile system module
const fs = require("fs");
const util = require("util");
const chalk = require("chalk");
const path = require("path");

// lstat option #1 use the api without imported promise wrapper
// const lstat = fs.lstat;
// lstat option #2 or implement the utils promise wrapper by passing the necessary function in
const lstat = util.promisify(fs.lstat);
// option #3 or use the promise wrapped lstat by destructuring from the fs.promises API
// const { lstat } = fs.promises;

// use the extra command line argument if provided
const targetDir = process.argv[2] || process.cwd();

// option #1 can  either use a custom lstat promise wrapper or manual callback on each lstat read
const customLstatWrapper = (filename) => {
  return new Promise((resolve, reject) => {
    fs.lstat(filename, (err, statsObj) => {
      if (err) {
        console.log(`custom promise wrapper reject with : ${err} `);
        reject(err);
      }
      console.log(`custom promise wrapper resolve with : ${statsObj} `);
      resolve(statsObj);
    });
  });
};

// ES6 / CommonJs syntax throws error if used outside of a nodejs module
//import * as fs from "node:fs";
// params: current directory (process is global scope in all node),callback
fs.readdir(targetDir, async (err, filenames) => {
  if (err) {
    console.log(error);
    return; //don't continue process with error
  }

  //Solution #1 use a custom callback to sequently evaluate each filename associated lstat read
  // fill allStats array items by null null values to start with
  const allStats = Array(filenames.length).fill(null);
  const manualCallback = (filenames) => {
    for (let filename of filenames) {
      const index = filenames.indexOf(filename);
      // use manual callback with fs.lstat or util wrapper util.promisify(fs.lstat)
      // calling a custom promise wrapped lstat (returning a resolved promise) instead will not fire the callback
      lstat(path.join(targetDir, filename), (err, filestat) => {
        if (err) {
          console.log(err);
        }
        //populate with the stats objects that associate with filesystem
        allStats[index] = filestat;
        // if any of the stats is null, return value of every() will evaluate to false.
        const ready = allStats.every((stats) => {
          return stats; // returns null when the current value not updated from the initial null
        });
        // once every
        if (ready) {
          allStats.forEach((stat, index) => {
            if (stat.isFile()) {
              console.log(`${filenames[index]}`);
            }
            if (allStats[index].isDirectory()) {
              console.log(chalk.bold(`${filenames[index]}`));
            }
          });
        }
      });
    }
  };
  //manualCallback(filenames);

  // 2# ,3# use promises wrapper with error handling
  // sequential processing needs to wait for every promise to resolve before able to continue
  const sequentialPromises = async (filenames) => {
    for (let filename of filenames) {
      const index = filenames.indexOf(filename);
      try {
        // use fs.promises.lstat;
        const stats = await fs.promises.lstat(path.join(targetDir, filename));
        if (stats.isDirectory()) {
          console.log(chalk.bold(filenames[index]));
        }
        if (stats.isFile()) {
          console.log(`${filenames[index]} is file`);
        }
      } catch (err) {
        console.log(err);
      }
    }
  };
  //sequentialPromises(filenames);

  // #4 Use promise.all to resolve an array of parallel fs.promises.lstat processes
  // this should be the best & most efficient option for the simplicity and no need to wait for sequential lstat operations
  const statPromises = filenames.map((filename) => {
    return lstat(path.join(targetDir, filename));
  });
  const allstats = await Promise.all(statPromises);
  //iterate once all resolved
  for (let stats of allstats) {
    const index = allstats.indexOf(stats);
    if (stats.isDirectory()) {
      console.log(chalk.bold(`${filenames[index]}`));
    } else {
      console.log(`${filenames[index]}`);
    }
  }
});
