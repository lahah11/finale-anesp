const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de multer simple
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Middleware simple pour tester
const uploadTest = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Middleware pour uploader les documents de mission
const uploadMissionDocuments = uploadTest.fields([
  { name: 'mission_report', maxCount: 1 },
  { name: 'stamped_mission_orders', maxCount: 1 }
]);

const uploadMissionTicket = uploadTest.single('ticket');

module.exports = {
  uploadMissionDocuments,
  uploadMissionTicket
};


