/**
 * @author https://github.com/cford256
 * Requires functions from the utils file.
 */

const path = require('path');
const AdmZip = require('adm-zip'); // https://github.com/cthackers/adm-zip/wiki/ADM-ZIP
const utils = require('./utils');

module.exports = {
  getZip: (filepath) => new AdmZip(filepath),
  getZipFiles: (filepath) => new AdmZip(filepath).getEntries(),
  getZipAndFiles: (filepath) => {
    const zip = module.exports.getZip(filepath);
    return { zip, files: zip.getEntries() };
  },
  extractToAndRemoveSubfolder: (zipData, outputPath) => {
    zipData.files.forEach((entry) => {
      if (!entry.isDirectory) {
        zipData.zip.extractEntryTo(entry.name, outputPath, /*maintainEntryPath*/ false, /*overwrite*/ true);
      }
    });
    utils.runForEachFile(utils.getDirFilesInfo(outputPath), (file) => {
      utils.renameFile(file.filepath, path.join(file.dirPath, utils.sanitizeFilename(file.filename)));
    });
  },
  hasSubfolders: (zip) => {
    let dirFound = false;
    const files = zip.getEntries();
    files.forEach((entry) => (entry.isDirectory ? (dirFound = true) : null));
    return dirFound;
  },
  removeSubFolder: (filepath, outputPath = filepath) => {
    const zip = new AdmZip(filepath);
    const outZip = new AdmZip();
    const files = zip.getEntries();
    const dirFound = module.exports.hasSubfolders(zip);
    if (dirFound) {
      files.forEach((entry) => (!entry.isDirectory ? outZip.addFile(entry.name, entry.getData()) : null));
    }
    if (dirFound || outputPath !== filepath) outZip.writeZip(filepath);
  },
  createZipFile: (dirPath, outputPath) => {
    const zip = new AdmZip();
    const files = utils.getDirFilesInfo(dirPath);
    files.forEach((file) => {
      zip.addLocalFile(file.filepath);
    });
    if (outputPath) zip.writeZip(outputPath);
    return { zip, files: zip.getEntries() };
  },
};
