const fse = require('fs-extra');
const os = require('os');
const path = require('path');
const request = require('request');
const { Readable } = require('stream');

const { isObjectSafe } = require('../../../../libs/objects');

/**
 * Find or import a file.
 * @param {*} fileData - Strapi file data.
 * @param {*} user - Strapi user.
 * @param {Object} options
 * @param {Array<string>} options.allowedFileTypes - File types the file should match (see Strapi file allowedTypes).
 * @returns
 */
const findOrImportFile = async (fileData, user, { allowedFileTypes }) => {
  if (typeof fileData === 'number') {
    let file = await importById(fileData, allowedFileTypes);
    return file;
  } else if (typeof fileData === 'string') {
    const file = await importByUrl(fileData, allowedFileTypes, user);
    return file;
  } else if (isObjectSafe(fileData)) {
    const file = await importByUrl(fileData.url, allowedFileTypes, user);
    return file;
  }
};

const importById = async (id, allowedFileTypes) => {
  let file = await findFile({ id });

  if (file && !isExtensionAllowed(file.ext.substring(1), allowedFileTypes)) {
    file = null;
  }

  return file;
};

const importByUrl = async (url, allowedFileTypes, user) => {
  const checkResult = isValidFileUrl(url, allowedFileTypes);
  if (!checkResult.isValid) {
    return null;
  }

  let file = await findFile({ name: checkResult.fileData.fileName });
  if (!file) {
    file = await importFile({ url: checkResult.fileData.rawUrl }, user);
  }

  return file;
};

/**
 * Find a file.
 * @param {Object} filters
 * @param {number} [filters.id] - File id.
 * @param {string} [filters.name] - File name.
 * @returns
 */
const findFile = async ({ id, name }) => {
  let file = null;

  if (id) {
    file = await strapi.entityService.findOne('plugin::upload.file', id, { populate: '*' });
  } else if (name) {
    [file] = await strapi.entityService.findMany('plugin::upload.file', { filters: { name }, limit: 1 });
  }

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

      const fileData = getFileDataFromRawUrl(url);

      resolve({
        filename: fileData.fileName,
        name: fileData.name,
        hash: fileData.name,
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
    const fileData = getFileDataFromRawUrl(url);

    return {
      isValid: isExtensionAllowed(fileData.extension, allowedFileTypes),
      fileData: {
        fileName: fileData.fileName,
        rawUrl: url,
      },
    };
  } catch (err) {
    strapi.log.error(err);
    return {
      isValid: false,
      fileData: {
        fileName: '',
        rawUrl: '',
      },
    };
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

const getFileDataFromRawUrl = (rawUrl) => {
  const parsedUrl = new URL(decodeURIComponent(rawUrl));

  const fileName = parsedUrl.pathname.toLowerCase().replace(/\//g, '-');

  return {
    fileName: fileName,
    name: fileName.replace(/\.[a-zA-Z]*$/, ''),
    extension: parsedUrl.pathname.split('.').pop().toLowerCase(),
  };
};

module.exports = {
  findOrImportFile,
};
