/**
 * @author https://github.com/cford256
 * Requires exiftool https://exiftool.org/install.html
 *
 * Get and set the exif metadata of an image.
 */

const path = require('path');
const shell = require('shelljs');
const scriptName = path.basename(__filename);

class ImgMetadata {
  constructor(logger) {
    if (logger) {
      this.logger = logger.clone();
      this.logger.prefix = scriptName;
      this.logger.emoji = '💻 ';
    } else {
      // If not using logFile.js provide a stub.
      this.logger = {
        log: () => {},
        setLogColor: () => {},
        logToFile: () => {},
      };
    }
  }

  /**
   * Pass a command to exiftool in the terminal.
   */
  shellExec = (command, exiftoolDir = './tools') => {
    this.logger.setLogColor('blue');
    this.logger.log(command);
    // if (exiftoolDir) shell.cd(exiftoolDir);
    const executed = shell.exec(`exiftool -overwrite_original ${command}`);
    this.logger.logToFile(executed.stdout);
    return executed;
  };
  cd = (dir) => shell.cd(dir);

  /** Log part of the metadata of a file. */
  logMetadata = (fn, filter) => this.shellExec(`${filter} "${fn}"`);
  /** Get the exif tool output */
  getShellOutputValue = (shell) => shell.stdout.split(':').slice(1).join(':').trim();
  /** Get a files metatada */
  getMetadata = (fn, filter) => this.getShellOutputValue(this.logMetadata(fn, filter));
  logAllMetadata = (fn) => this.shellExec(`"${fn}"`);
  /**
   * Get the metadata from a file.
   * Expects the terminal to already be in the directory of the file.
   */
  getAllMetadata = (fn) => {
    const data = this.logAllMetadata(fn).stdout;
    const lines = data.split('\r\n').slice(0, -1);
    const keys = [];
    const values = [];
    lines.forEach((line) => keys.push(line.split(':')[0].trim()));
    lines.forEach((line) => values.push(line.split(':')[1].trim()));
    const metadata = {};
    keys.forEach((key, i) => (metadata[key] = values[i]));
    let tags = metadata['Subject'];
    tags = tags?.split(', ');
    metadata.tags = tags ?? '';

    let date = data.split('Date/Time Original')[1] ?? '';
    if (date) date = date?.split('\r\n')[0].replace(':', '').trim();
    metadata.dateTaken = date;

    const photoshop = data.includes('adobe') || data.includes('photoshop');
    metadata.photoshop = photoshop;
    return metadata;
  };

  /** Search a files metadata for a string */
  metadataIncludes = (fn, search, filter) => {
    const data = this.shellExec(`exiftool ${filter} "${fn}"`).toLowerCase();
    return Array.isArray(search) ? search.some((v) => data.includes(v.toLowerCase())) : data.includes(search.toLowerCase());
  };
  /** See if it has data from being in photoshop. Would not be that accurate. */
  hasPhotoshopData = (fn) => this.metadataIncludes(fn, ['adobe', 'photoshop']);

  setTitle = (fn, title) => this.shellExec(`-title="${title}" "${fn}"`);
  getTitle = (fn) => this.getMetadata(fn, '-title');
  setArtist = (fn, artist) => this.shellExec(`-artist="${artist}" "${fn}"`);
  getArtist = (fn) => this.getMetadata(fn, '-artist');
  setCopyright = (fn, copyright) => this.shellExec(`-copyright="${copyright}" "${fn}"`);
  getCopyright = (fn) => this.getMetadata(fn, '-copyright');
  setImageDescription = (fn, des) => this.shellExec(`-ImageDescription="${des}" "${fn}"`); // Sets title and subject
  getImageDescription = (fn) => this.getMetadata(fn, '-ImageDescription');
  setRating = (fn, rating) => this.shellExec(`-rating="${rating}" "${fn}"`);
  getRating = (fn) => this.getMetadata(fn, '-rating');
  setUserComment = (fn, userComment) => this.shellExec(`-UserComment="${userComment}" "${fn}"`);
  getUserComment = (fn) => this.getMetadata(fn, '-UserComment');
  getTags = (fn) => this.getMetadata(fn, '-subject');
  setTag = (fn, subject) => this.shellExec(`-subject="${subject}" "${fn}"`);
  addTags = (fn, subject) => {
    const tag = (tag) => `-subject+="${tag}" `;
    const tags = Array.isArray(subject) ? subject.reduce((t, v) => (t += tag(v)), '') : tag(subject);
    this.shellExec(`${tags} "${fn}"`);
  };

  getLocalISODateString = () => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toISOString();
  setDateTimeOriginal = (fn, date) => this.shellExec(`"-DateTimeOriginal=${date}" "${fn}"`);
  getDateTimeOrignial = (fn) => this.getMetadata(fn, '-DateTimeOriginal');
  addToDateTimeOriginal = (fn, y = 0, m = 0, d = 0, h = 0, min = 0) =>
    this.shellExec(`"-DateTimeOriginal+=${y}:${m}:${d} ${h}:${min}:0" "${fn}"`);

  setDateAcquiredToFileCreation = (fn) => this.shellExec(`"-DateAcquired<FileCreateDate" "${fn}"`);
  setDateAcquired = (fn, da) => this.shellExec(`-dateAcquired="${da}" "${fn}"`);
  setFileCreated = (fn, da) => this.shellExec(`-FileCreateDate="${da}" "${fn}"`);
  setImageUniqueID = (fn, id) => this.shellExec(`-ImageUniqueID="${id}" "${fn}"`);
}
module.exports = ImgMetadata;