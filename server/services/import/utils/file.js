const fs = require('fs');
const fse = require('fs-extra');
const last = require('lodash/last');
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
  let obj = {};
  if (typeof fileData === 'number') {
    obj.id = fileData;
  } else if (typeof fileData === 'string') {
    obj.url = fileData;
  } else if (isObjectSafe(fileData)) {
    obj = fileData;
  } else {
    throw new Error(`Invalid data format '${typeof fileData}' to import media. Only 'string', 'number', 'object' are accepted.`);
  }

  let file = await findFile(obj, user, allowedFileTypes);

  if (file && !isExtensionAllowed(file.ext.substring(1), allowedFileTypes)) {
    file = null;
  }

  return file;
};

/**
 * Find a file.
 * @param {Object} filters
 * @param {number} [filters.id] - File id.
 * @param {string} [filters.hash] - File hash.
 * @param {string} [filters.name] - File name.
 * @param {string} [filters.url]
 * @param {string} [filters.alternativeText]
 * @param {string} [filters.caption]
 * @param {Object} user
 * @returns
 */
const findFile = async ({ id, hash, name, url, alternativeText, caption }, user, allowedFileTypes) => {
  let file = null;

  if (!file && id) {
    file = await strapi.entityService.findOne('plugin::upload.file', id);
  }
  if (!file && hash) {
    [file] = await strapi.entityService.findMany('plugin::upload.file', { filters: { hash }, limit: 1 });
  }
  if (!file && name) {
    [file] = await strapi.entityService.findMany('plugin::upload.file', { filters: { name }, limit: 1 });
  }
  if (!file && url) {
    const checkResult = isValidFileUrl(url, allowedFileTypes);
    if (checkResult.isValid) {
      file = await findFile({ hash: checkResult.fileData.hash, name: checkResult.fileData.fileName }, user, allowedFileTypes);

      if (!file) {
        file = await importFile({ id, url: checkResult.fileData.rawUrl, name, alternativeText, caption }, user);
      }
    }
  }

  return file;
};

const importFile = async ({ id, url, name, alternativeText, caption }, user) => {
  let file;
  try {
    file = await fetchFile(url);

    let [uploadedFile] = await strapi
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
              name: name || file.name,
              alternativeText: alternativeText || '',
              caption: caption || '',
            },
          },
        },
        { user },
      );

    if (id) {
      uploadedFile = await strapi.db.query('plugin::upload.file').update({
        where: { id: uploadedFile.id },
        data: { id },
      });
    }

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
    request({ url: encodeURI(url), method: 'GET', encoding: null }, async (err, res, body) => {
      if (err) {
        reject(err);
        return;
      }

      if (res.statusCode < 200 || 300 <= res.statusCode) {
        reject(new Error(`Tried to fetch file from url ${url} but failed with status code ${res.statusCode}`));
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
        hash: fileData.hash,
        fileName: fileData.name,
        rawUrl: url,
      },
    };
  } catch (err) {
    strapi.log.error(err);
    return {
      isValid: false,
      fileData: {
        hash: '',
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
  any: (ext) => true,
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

  const name = trim(parsedUrl.pathname, '/').replace(/\//g, '-');
  const extension = parsedUrl.pathname.split('.').pop().toLowerCase();
  const hash = last(parsedUrl.pathname.split('/')).slice(0, -(extension.length + 1));

  return {
    hash,
    name,
    extension,
  };
};

module.exports = {
  findOrImportFile,
};
