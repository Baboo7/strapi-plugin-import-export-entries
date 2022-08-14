const fs = require('fs');
const fse = require('fs-extra');
const trim = require('lodash/trim');
const os = require('os');
const path = require('path');
const request = require('request');

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
    const file = await importByUrl({ url: fileData }, allowedFileTypes, user);
    return file;
  } else if (isObjectSafe(fileData)) {
    let file = null;
    if (!file && fileData.id) {
      file = await importById(fileData.id, allowedFileTypes);
    }
    if (!file && fileData.name) {
      file = await importByName(fileData.name, allowedFileTypes);
    }
    if (!file && fileData.url) {
      file = await importByUrl(fileData, allowedFileTypes, user);
    }
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

const importByName = async (name, allowedFileTypes) => {
  let file = await findFile({ name });

  if (file && !isExtensionAllowed(file.ext.substring(1), allowedFileTypes)) {
    file = null;
  }

  return file;
};

const importByUrl = async ({ url, alternativeText, caption }, allowedFileTypes, user) => {
  const checkResult = isValidFileUrl(url, allowedFileTypes);
  if (!checkResult.isValid) {
    return null;
  }

  let file = await findFile({ name: checkResult.fileData.fileName });
  if (!file) {
    file = await importFile({ url: checkResult.fileData.rawUrl, alternativeText, caption }, user);
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

const importFile = async ({ url, alternativeText, caption }, user) => {
  let file;
  try {
    file = await fetchFile(url);

    const [uploadedFile] = await strapi
      .plugin('upload')
      .service('upload')
      .upload(
        {
          files: {
            name: file.name,
            type: file.type,
            size: file.size,
            path: file.path,
          },
          data: {
            fileInfo: {
              name: file.name,
              alternativeText: alternativeText || file.name,
              caption,
            },
          },
        },
        { user },
      );

    return uploadedFile;
  } catch (err) {
    strapi.log.error(err);
    throw err;
  } finally {
    deleteFileIfExists(file?.path);
  }
};

const fetchFile = (url) => {
  return new Promise((resolve, reject) => {
    request({ url, method: 'GET', encoding: null }, async (err, res, body) => {
      if (err) {
        reject(err);
        return;
      }

      if (res.statusCode < 200 || 300 <= res.statusCode) {
        throw new Error(`Tried to fetch file from url ${url} but failed with status code ${res.statusCode}`);
      }

      const type = res.headers['content-type'].split(';').shift();
      const size = parseInt(res.headers['content-length']) | 0;

      const fileData = getFileDataFromRawUrl(url);
      const filePath = await writeFile(fileData.name, body);

      resolve({
        name: fileData.name,
        type,
        size,
        path: filePath,
      });
    });
  });
};

const writeFile = async (name, content) => {
  const tmpWorkingDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-upload-'));

  const filePath = path.join(tmpWorkingDirectory, name);
  try {
    fs.writeFileSync(filePath, content);
    return filePath;
  } catch (err) {
    strapi.log.error(err);
    throw err;
  }
};

const deleteFileIfExists = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.rmSync(filePath);
  }
};

const isValidFileUrl = (url, allowedFileTypes) => {
  try {
    const fileData = getFileDataFromRawUrl(url);

    return {
      isValid: isExtensionAllowed(fileData.extension, allowedFileTypes),
      fileData: {
        fileName: fileData.name,
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

  const name = trim(parsedUrl.pathname.toLowerCase(), '/').replace(/\//g, '-');

  return {
    name,
    extension: parsedUrl.pathname.split('.').pop().toLowerCase(),
  };
};

module.exports = {
  findOrImportFile,
};
