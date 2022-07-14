const fse = require('fs-extra');
const os = require('os');
const path = require('path');
const request = require('request');
const { Readable } = require('stream');

/**
 * Find or import a file.
 * @param {*} fileData - Strapi file data.
 * @param {*} user - Strapi user.
 * @param {Object} options
 * @param {Array<string>} options.allowedFileTypes - File types the file should match (see Strapi file allowedTypes).
 * @returns
 */
const findOrImportFile = async (fileData, user, { allowedFileTypes }) => {
  if (!isValidFileUrl(fileData.url, allowedFileTypes)) {
    return null;
  }

  let file = await findFile(fileData.name);

  if (!file) {
    file = await importFile(fileData, user);
  }

  return file;
};

const findFile = async (name) => {
  const [file] = await strapi.entityService.findMany('plugin::upload.file', {
    filters: { name },
    limit: 1,
  });
  return file;
};

const importFile = async ({ url }, user) => {
  try {
    let file = await fetchFile(url);

    if (isOptimizable(file.filename)) {
      file = await strapi.plugin('upload').service('image-manipulation').optimize(file);
    }

    const uploadService = strapi.plugin('upload').service('upload');
    const formattedFileInfo = uploadService.formatFileInfo(file, { name: file.filename, alternativeText: file.filename, caption: file.filename });

    const uploadedFile = await uploadService.uploadFileAndPersist({ ...file, ...formattedFileInfo }, { user });

    if (!uploadedFile?.id) {
      return null;
    }
    return uploadedFile;
  } catch (err) {
    strapi.log.error(err);
    return null;
  }
};

const FORMATS_TO_PROCESS = ['jpeg', 'png', 'webp', 'tiff'];
const isOptimizable = (fileName) => {
  const ext = fileName.split('.')[-1];
  return FORMATS_TO_PROCESS.includes(ext);
};

const fetchFile = (url) => {
  return new Promise((resolve, reject) => {
    request({ url, method: 'GET', encoding: null }, async (err, res, body) => {
      if (err) {
        reject(err);
        return;
      }

      const tmpWorkingDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-upload-'));

      const type = res.headers['content-type'].split(';').shift();
      const size = parseInt(res.headers['content-length']) | 0;

      const parsed = new URL(decodeURIComponent(url));
      const filename = parsed.pathname.split('/').pop().toLowerCase();
      const name = filename.replace(/\.[a-zA-Z]*$/, '');

      resolve({
        filename,
        name,
        hash: name,
        type,
        size,
        tmpWorkingDirectory,
        getStream: () => Readable.from(body),
      });
    });
  });
};

const isValidFileUrl = (url, allowedFileTypes) => {
  try {
    const parsed = new URL(url);
    const extension = parsed.pathname.split('.').pop().toLowerCase();
    return isExtensionAllowed(extension, allowedFileTypes);
  } catch (err) {
    strapi.log.error(err);
    return false;
  }
};

const isExtensionAllowed = (ext, allowedFileTypes) => {
  const checkers = allowedFileTypes.map(getFileTypeChecker);
  return checkers.some((checker) => checker(ext));
};

const ALLOWED_AUDIOS = ['mp3', 'wav', 'ogg'];
const ALLOWED_IMAGES = ['png', 'gif', 'jpg', 'jpeg', 'svg', 'bmp', 'tif', 'tiff'];
const ALLOWED_VIDEOS = ['mp4', 'avi'];

/** See Strapi file allowedTypes for object keys. */
const fileTypeCheckers = {
  audios: (ext) => ALLOWED_AUDIOS.includes(ext),
  files: (ext) => true,
  images: (ext) => ALLOWED_IMAGES.includes(ext),
  videos: (ext) => ALLOWED_VIDEOS.includes(ext),
};

const getFileTypeChecker = (type) => {
  const checker = fileTypeCheckers[type];
  if (!checker) {
    throw new Error(`Strapi file type ${type} not handled.`);
  }
  return checker;
};

module.exports = {
  findOrImportFile,
};
