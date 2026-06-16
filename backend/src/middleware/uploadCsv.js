const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadsPath = path.resolve(__dirname, '../../../uploads');

fs.mkdirSync(uploadsPath, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsPath,
  filename: (req, file, callback) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    callback(null, `dados-${timestamp}.csv`);
  }
});

function validarCsv(req, file, callback) {
  const extensao = path.extname(file.originalname || '').toLowerCase();

  if (extensao !== '.csv') {
    callback(new Error('Envie um arquivo com extensao .csv.'));
    return;
  }

  callback(null, true);
}

const uploadCsv = multer({
  storage,
  fileFilter: validarCsv,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = {
  uploadCsv,
  uploadsPath
};
