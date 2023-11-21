/**
 * @author https://github.com/cford256
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * @param {number} bytes Byte size number
   * @param {number} decimals Number to round the result to.
   * @returns A formated string of the size given.
   */
  formatBytes: (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  isDir: (file) => fs.lstatSync(file).isDirectory(),
  fileStats: (file) => fs.statSync(file),
  readFile: (filepath) => fs.readFileSync(filepath, 'utf8'),
  saveFile: (filepath, data) => fs.writeFileSync(filepath, data),
  copyFile: (filepath, data) => fs.copyFileSync(filepath, data),
  fileExists: (file) => fs.existsSync(file),
  deleteFile: (dirPath, recursive = false, force = false) => fs.rmSync(dirPath, { recursive, force }),

  dirExists: (dir) => module.exports.isDir(dir) && module.exports.fileExists(dir),
  ensureDirExists: (dirPath) => fs.existsSync(dirPath) || fs.mkdirSync(dirPath, { recursive: true }),
  deleteDir: (dirPath, recursive = false, force = false) => fs.rmdirSync(dirPath, { recursive, force }),

  renameFile: (oldPath, newPath) => fs.renameSync(oldPath, newPath),
  moveFile: (oldPath, newPath) => {
    module.exports.ensureDirExists(newPath.split('\\').slice(0, -1).join('\\'));
    module.exports.renameFile(oldPath, newPath); // could check if dir empty and remove it.
  }, // Could create a move Dir
  renameInPlace: (dirPath, currentName, newName) => fs.renameSync(path.join(dirPath, currentName), path.join(dirPath, newName)),

  saveJson: (filepath, data) => fs.writeFileSync(filepath, JSON.stringify(data, null, 2)),
  saveJsonMin: (filepath, data) => fs.writeFileSync(filepath, JSON.stringify(data)),
  ensureSaveJson: (dirPath, name, json) => {
    module.exports.ensureDirExists(dirPath);
    if (!name.includes('.json')) name += '.json';
    module.exports.saveJson(path.join(dirPath, name), json);
  },
  loadJson: (filepath) => JSON.parse(fs.readFileSync(filepath, 'utf8')),
  fetchJson: async (url) => await fetch(url).then((res) => res.json()),
  sanitizeFilename: (filename) => filename.replaceAll(/[^a-zA-Z0-9\\.\\-]/g, '_'),
  isFilenameLong: (filename) => path.basename(filename).length > 143,
  logObject: (obj) => console.dir(obj, { depth: null, colors: true }),

  /**
   * Get info about the files inside the dir.
   * @param dir
   * @returns [ { filename, filePath, basename, ext, isDir } ]
   */
  getDirFilesInfo: (dir) => {
    const files = fs.readdirSync(dir);
    const fileInfo = [];
    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const filepath = path.resolve(path.join(dir, filename));
      const ext = path.extname(filename);
      const isDir = module.exports.isDir(filepath);
      const basename = isDir ? path.basename(filename) : path.basename(filename, ext);
      const stats = module.exports.fileStats(filepath);
      const birthtime = String(stats.birthtime);
      const size = module.exports.formatBytes(stats.size);
      const dirPath = isDir ? filepath : filepath.replace(filename, '');
      const parentDirName = `${filepath.split('\\').slice(-2)[0]}`;
      fileInfo.push({ filename, filepath, basename, ext, isDir, dirPath, parentDirName, birthtime, size });
    }
    return fileInfo;
  },
  alphabetize: (sortable) => sortable.sort((a, b) => a.localeCompare(b)),
  filterUnique: (arr) => [...new Set(arr)],

  /**
   * Run a function for each file that is passed to it.
   * It won't go into a directory called ignore looking for more files.
   * @param files Expects info from getDirFilesInfo()
   * @param callback The function to run for each file passed to it.
   * @param opt Extra setting options. These can be set in the call back to modify the function behavior.
   * @example options{
   *  break: can be set in the callback to tell it to stop going though all the files.
   *  breakDir: can stop executing for each file in the current directory that it is in.
   *  notRecursive: tell it to not execute the function for each file in every directory it finds.
   *  ignoreExt: Extentions that you want to not run the function for.
   * }
   *
   */
  runForEachFile: (files, callback, opt = { break: false, breakDir: false, notRecursive: false, ignoreExt: [] }) => {
    for (let file of files) {
      if (opt.break) break;
      if (opt.breakDir && (opt.breakDir = false)) break; // Sets it back to false after the first dir.
      if (!opt.ignoreExt?.includes(file.ext) && file.filename != 'ignore') {
        if (file.isDir) {
          if (!opt.notRecursive) module.exports.runForEachFile(module.exports.getDirFilesInfo(file.filepath), callback, opt);
        } else {
          callback(file, opt);
        }
      }
    }
  },
  /**
   * Run a function for every directory in the files that are passed to it.
   * It will skip any directory called ignore.
   * @param files Expects info from getDirFilesInfo()
   * @param callback The function to run for each file passed to it.
   * @param opt Extra setting options. These can be set in the call back to modify the function behavior.
   * @example options{
   *  break: can be set in the callback to tell it to stop going though all the files.
   *  breakDir: can stop executing for each file in the current directory that it is in.
   *  notRecursive: tell it to not execute the function for each file in every directory it finds.
   *  ignoreExt: Extentions that you want to not run the function for.
   * }
   */
  runForEachDir: (files, callback, opt = { break: false, breakDir: false, notRecursive: false }) => {
    files = files.filter((file) => file.filename != 'ignore');
    for (let file of files) {
      if (opt.break) break;
      if (opt.breakDir && (opt.breakDir = false)) break;
      if (file.isDir && !opt.notRecursive) module.exports.runForEachDir(module.exports.getDirFilesInfo(file.filepath), callback, opt);
    }
    callback(files, opt);
  },
  /**
   * Run a function for ecery file in directories that don't have any subfolders.
   * @param files Expects info from getDirFilesInfo()
   * @param callback The function to run for each file passed to it.
   * @param opt Extra setting options. These can be set in the call back to modify the function behavior.
   * @example options{
   *  break: can be set in the callback to tell it to stop going though all the files.
   *  breakDir: can stop executing for each file in the current directory that it is in.
   *  notRecursive: tell it to not execute the function for each file in every directory it finds.
   *  ignoreExt: Extentions that you want to not run the function for.
   * }
   */
  runForEachLeafDir: (files, callback, opt = { break: false, breakDir: false, notRecursive: false }) => {
    module.exports.runForEachDir(
      files,
      (dir) => {
        // check for sub directories and don't run in that case.
        hasDirs = false;
        dir.forEach((file) => {
          if (file.isDir === true) hasDirs = true;
        });
        if (!hasDirs) callback(dir, opt);
      },
      opt
    );
  },
  createLogger: () => {
    return {
      log: () => console.log.apply(console, Array.prototype.slice.call(arguments)),
    };
  },

  getIndexPercentage: (i, length) => `(${i}/${length} - ${Math.floor(((i + 1) / length) * 100)}%)`,
  randomRange: (min, max) => Math.floor(Math.random() * (max - min) + min),
  wait: (t = 1000) => new Promise((resolve) => setTimeout(resolve, t)),
  randomWait: (min, max) => module.exports.wait(module.exports.randomRange(min, max)),
  /**
   *  Wait a random amount of time base on the index passed.
   *  Wait between 1 and 10 second after every index.
   *  Every 20 indexes wait between 3 and 5 minuites.
   *  Every 100 indexes wait between 10 and 20 minuites.
   */
  randomWaitOnIndex: async (index, logger = createLogger()) => {
    await module.exports.customRandomWaitOnIndex(index, 1_000, 10_000, 20, 60_000 * 3, 60_000 * 5, 100, 60_000 * 10, 60_000 * 20, logger);
  },
  /**
   *  Create your own random wait on index function.
   * @param index The index to base the wait time off of.
   * @param constantWaitMin The minimum amount ot time to wait after each index.
   * @param constantWaitMax The maximum amount of time to waint after each index.
   * @param shorterWaitEvery Wait a longer amount of time when the index is evenly divisible by this number.
   * @param shorterWaitMin The minimum amount of time to wait when index reaches a multiple of shorterWaitEvery
   * @param shorterWaitMax The maximum amount of time to wait when index reaches a multiple of shorterWaitEvery
   * @param longerWaitEvery Wait a logesxt amount of time when the index is evenly divisible by this number.
   * @param longerWiatMin The minimum amount of time to wait for the longest random wait.
   * @param longerWaitMax The maximum amount of time to wait for the longest random wait.
   * @param logger An option to pass the function your own logger to use.
   */
  customRandomWaitOnIndex: async (
    index,
    constantWaitMin,
    constantWaitMax,
    shorterWaitEvery,
    shorterWaitMin,
    shorterWaitMax,
    longerWaitEvery,
    longerWiatMin,
    longerWaitMax,
    logger = createLogger()
  ) => {
    await module.exports.randomWait(constantWaitMin, constantWaitMax);
    if (index % longerWaitEvery === 0) {
      let waitTime = module.exports.randomRange(longerWiatMin, longerWaitMax);
      logger.log(`\tWaiting ${module.exports.secondsToFormatedTime(waitTime)}`);
      await module.exports.wait(waitTime);
    } else if (index % shorterWaitEvery == 0) {
      let waitTime = module.exports.randomRange(shorterWaitMin, shorterWaitMax);
      logger.log(`\tWaiting ${module.exports.secondsToFormatedTime(waitTime)}`);
      await module.exports.wait(waitTime);
    }
  },
  /**
   *  Format the passed miliseconds to a string like 5 Days 4 Hours 32 Minites 9 Seconds.
   *  It will leave of the larger time lengths if it did not wait that long.
   */
  secondsToFormatedTime: (time) => {
    let totalSeconds = Math.round(time / 1000);
    const d = Math.floor(totalSeconds / 60 / 60 / 24) | 0;
    let days = d >= 1 ? `${d} Days ` : '';
    totalSeconds -= d * 60 * 60 * 24;
    const h = Math.floor(totalSeconds / 60 / 60) | 0;
    let hours = h >= 1 ? `${h} Hours ` : '';
    totalSeconds -= h * 60 * 60;
    let m = Math.floor(totalSeconds / 60) | 0;
    let mins = m >= 1 ? `${m} Minites ` : '';
    totalSeconds -= m * 60;
    let sec = (h === 0 && m === 0) || totalSeconds >= 1 ? `${totalSeconds} Seconds` : '';
    return `${days}${hours}${mins}${sec}`;
  },
  /**
   * Get a string to show the amount of time passed between two times.
   */
  elapsedTime: (startTime, endTime) => {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    let timeDiff = endDate - startDate;
    let elapsedString = module.exports.secondsToFormatedTime(timeDiff);
    let timeString = `\n\t  Start Time:   ${startDate.toLocaleString()}`;
    timeString += `\n\t    End Time:   ${endDate.toLocaleString()}`;
    timeString += `\n\tTime Elapsed:   ${elapsedString}`;
    return timeString;
  },
  clone: (obj) => structuredClone(obj),
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  getFullMonthName: (date) => module.exports.monthNames[date.getMonth()],
  /** Get the date formatted as YYYY-MM-DD */
  getDateFormatedYMD: (date) => {
    date = new Date(date);
    let y = date.getFullYear();
    let d = `${date.getDay()}`.padStart(2, '0');
    let m = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * @param template A string with `{{Some Value}}`
   * @param value The new value to place in the string.
   * Currently only expects there to be one thing to replace in the template
   * Should change to take an array of a match and what to replace it with.
   * Could make it work with simple handlebar templates.
   */
  insertIntoTemplate: (template, value) => template.replace(/\{\{\}\}/, value),

  regex: {
    url: /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g,
    filepath: /^(?:[a-zA-Z]\:|\\\\[\w\.]+\\[\w.$]+)\\(?:[\w]+\\)*\w([\w.])+$/g,
  },

  /**
   * Adds time to a date. Modelled after MySQL DATE_ADD function.
   * Example: dateAdd(new Date(), 'minute', 30)  // returns 30 minutes from now.
   * https://stackoverflow.com/a/1214753/18511
   * @param date  Date to start with
   * @param interval  One of: year, quarter, month, week, day, hour, minute, second
   * @param units  Number of units of the given interval to add.
   */ // prettier-ignore
  dateAdd: (date, interval, units) => {
    if(!(date instanceof Date)) return undefined;
    const ret = new Date(date); // don't change original date  
    const checkRollover = () => ret.getDate() != date.getDate() ? ret.setDate(0) : null;
    switch(String(interval).toLowerCase()) {
      case 'year'   :  ret.setFullYear(ret.getFullYear() + units); checkRollover();  break;
      case 'quarter':  ret.setMonth(ret.getMonth() + 3*units); checkRollover();  break;
      case 'month'  :  ret.setMonth(ret.getMonth() + units); checkRollover();  break;
      case 'week'   :  ret.setDate(ret.getDate() + 7*units);  break;
      case 'day'    :  ret.setDate(ret.getDate() + units);  break;
      case 'hour'   :  ret.setTime(ret.getTime() + units*3600000);  break;
      case 'minute' :  ret.setTime(ret.getTime() + units*60000);  break;
      case 'second' :  ret.setTime(ret.getTime() + units*1000);  break;
      default       :  ret = undefined;  break;
    }
    return ret;
  },
  modifyCurrentDate: (y, m, d, h, min, s) => {
    let date = new Date();
    if (y) date = module.exports.dateAdd(date, 'year', y);
    if (m) date = module.exports.dateAdd(date, 'month', m);
    if (d) date = module.exports.dateAdd(date, 'day', d);
    if (h) date = module.exports.dateAdd(date, 'hour', h);
    if (min) date = module.exports.dateAdd(date, 'minute', min);
    if (s) date = module.exports.dateAdd(date, 'second', s);
    return date;
  },
};
