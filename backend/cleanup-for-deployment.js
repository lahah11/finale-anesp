const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage pour déploiement...\n');

// Fichiers à supprimer avant déploiement
const filesToDelete = [
  // Fichiers de test
  'test-*.js',
  'check-*.js',
  'debug-*.js',
  
  // Fichiers de configuration temporaire
  'env-*.txt',
  'config-smtp-*.js',
  '.env.local',
  '.env.development',
  
  // Fichiers de correction
  'fix-*.js',
  'add-*.js',
  'clean-*.js',
  'create-*.js',
  
  // Fichiers de lancement
  'launch-*.js',
  'launch-*.ps1',
  'restart-*.js',
  'restart-*.ps1',
  'start-*.js',
  
  // Fichiers de migration temporaire
  'run-*.js',
  'migrate-*.js',
  
  // Documentation temporaire
  'RESUME-*.md',
  '*.html',
  
  // Fichiers spécifiques identifiés
  'add-city-distances.js',
  'add-distance-aleg-bir-moghrein-correct.js',
  'add-document-columns.js',
  'add-document-permissions.js',
  'add-institution-role-column.js',
  'add-missing-distance-aleg-bir-moghrein.js',
  'add-missing-distances.js',
  'add-missing-statuses.js',
  'add-more-cities.js',
  'add-msgg-permissions.js',
  'add-real-images-to-pdf.js',
  'add-toyota-vehicles-and-drivers.js',
  'add-upload-permission-to-engineer.js',
  'add-workflow-permissions.js',
  'check-after-restart.js',
  'check-agent-permissions.js',
  'check-current-user-permissions.js',
  'check-daf-database.js',
  'check-daf-password.js',
  'check-daf-permissions-db.js',
  'check-daf-permissions-final.js',
  'check-daf-permissions.js',
  'check-daf-role-permissions.js',
  'check-daf-user.js',
  'check-dg-final-permission.js',
  'check-dg-missions-correct.js',
  'check-dg-password-correct.js',
  'check-dg-password.js',
  'check-drivers-structure.js',
  'check-final-mission.js',
  'check-institution-roles-structure.js',
  'check-institution-roles.js',
  'check-institutions.js',
  'check-latest-mission.js',
  'check-mission-0038.js',
  'check-mission-0039-unified.js',
  'check-mission-participants.js',
  'check-mission-tables.js',
  'check-missions-status.js',
  'check-missions-table-structure.js',
  'check-msgg-assign-permission.js',
  'check-msgg-permissions.js',
  'check-participants-table.js',
  'check-passwords.js',
  'check-pending-dg-missions.js',
  'check-permissions-structure.js',
  'check-specific-mission.js',
  'check-tables.js',
  'check-upload-permissions.js',
  'check-users-table-structure.js',
  'check-vehicles-structure.js',
  'clean-missions.js',
  'clean-restart.js',
  'cleanup-missions.js',
  'cleanup-pdf-files.js',
  'config-smtp-complet.js',
  'config-smtp-example.js',
  'configure-gmail-app-password.js',
  'create-dg-user.js',
  'create-engineer-accounts.js',
  'create-engineers-table.js',
  'create-final-test-mission.js',
  'create-fresh-mission.js',
  'create-hr-admin.js',
  'create-missing-tables.js',
  'create-mission-expenses-tables.js',
  'create-msgg-user.js',
  'create-super-admin.js',
  'create-test-employees.js',
  'create-test-mission-complete.js',
  'create-test-mission-for-upload.js',
  'create-test-users.js',
  'create-test-vehicles.js',
  'debug-auth.js',
  'debug-current-user.js',
  'debug-daf-profile.js',
  'debug-dg-access.js',
  'debug-dg-missions.js',
  'debug-dt-permissions.js',
  'debug-login.js',
  'debug-mission-service.js',
  'debug-permissions-middleware.js',
  'debug-permissions.js',
  'debug-unified-system.js',
  'debug-user-structure.js',
  'debug-validation-error.js',
  'demo-scenario-1.js',
  'env-anesp-outlook.txt',
  'env-config.txt',
  'env-outlook.txt',
  'example-pdf-preview.html',
  'final-system-test.js',
  'final-test-summary.js',
  'final-test.js',
  'fix-agent-permissions.js',
  'fix-all-permissions.js',
  'fix-anesp-name.js',
  'fix-daf-permissions-final.js',
  'fix-daf-permissions.js',
  'fix-daf-role-correct.js',
  'fix-daf-role-workflow.js',
  'fix-daf-role.js',
  'fix-dg-final-permission.js',
  'fix-drivers-table.js',
  'fix-duplicate-grades.js',
  'fix-employees-table.js',
  'fix-engineer-permissions-final.js',
  'fix-engineer-permissions-v2.js',
  'fix-engineer-permissions.js',
  'fix-ingenieur-permissions.js',
  'fix-logistics-tables.js',
  'fix-mission-permissions.js',
  'fix-mission-status.js',
  'fix-mission-steps.js',
  'fix-msgg-logistics-permission.js',
  'fix-msgg-validate-logistics-permission.js',
  'fix-permissions-simple.js',
  'fix-upload-permissions.js',
  'force-cache-clear-complete.js',
  'force-cache-clear-solution.js',
  'force-token-cleanup-final.js',
  'force-token-refresh.js',
  'force-unified-system.js',
  'generate-example-pdf.js',
  'launch-complete-system.js',
  'launch-frontend-final.ps1',
  'launch-frontend.js',
  'launch-frontend.ps1',
  'launch-system-final.js',
  'list-all-users-passwords.js',
  'list-all-users.js',
  'list-engineers.js',
  'list-users-passwords.js',
  'list-users.js',
  'prepare-mission-for-dg.js',
  'reset-daf-password.js',
  'reset-passwords.js',
  'restart-backend.js',
  'restart-complete-system.js',
  'restart-simple.js',
  'restart-system-simple.ps1',
  'restart-system.js',
  'restart-system.ps1',
  'RESUME-CORRECTION-VILLES.md',
  'RESUME-FINAL-COMPLET.md',
  'RESUME-FINAL-CORRECTION.md',
  'RESUME-FINAL-VILLES.md',
  'RESUME-VILLES-IMPLEMENTATION.md',
  'run-logistics-migration.js',
  'runSimpleMigration.js',
  'runUnifiedMissionsMigration.js',
  'runUnifiedMissionsMigrationFixed.js',
  'set-env-vars.js',
  'set-jwt-secret.js',
  'show-all-test-data.js',
  'simple-fix-database.js',
  'simple-fix-permissions.js',
  'simple-test.js',
  'som-backend-main',
  'start-backend-simple.js',
  'start-system-manual.js',
  'start-system-simple.js',
  'system-status-summary.js',
  'test-anesp-email.js',
  'test-api.ps1',
  'test-compact-pdf.js',
  'test-daf-access.js',
  'test-daf-api-step4.js',
  'test-daf-api.js',
  'test-daf-frontend.js',
  'test-daf-mission-access.js',
  'test-daf-missions-access.js',
  'test-daf-validation-logic.js',
  'test-daf-validation-simple.js',
  'test-daf-validation-workflow.js',
  'test-daf-validation.js',
  'test-dashboard-missions.js',
  'test-dg-api.js',
  'test-dg-correct-mission.js',
  'test-dg-final-validation.js',
  'test-dg-validation.js',
  'test-different-user.js',
  'test-email-direct.js',
  'test-email-mission-order.js',
  'test-email-simple.js',
  'test-email-with-pdf.js',
  'test-engineer-endpoint.js',
  'test-engineer-mission-creation.js',
  'test-engineer-pdf.js',
  'test-engineers-api.js',
  'test-env.js',
  'test-existing-mission.js',
  'test-final-fix.js',
  'test-final-system.js',
  'test-final-validation.js',
  'test-fixed-pdf.js',
  'test-frontend-engineer-integration.js',
  'test-frontend-missions.js',
  'test-ingenieur-access.js',
  'test-ingenieur-missions.js',
  'test-login-simple.js',
  'test-login-with-bcrypt.js',
  'test-login.js',
  'test-mission-service-validate.js',
  'test-msgg-assign-logistics.js',
  'test-msgg-logistics-access.js',
  'test-outlook-email.js',
  'test-process-final-validation.js',
  'test-routes.js',
  'test-simple-login.js',
  'test-simple-unified-system.js',
  'test-single-file-upload.js',
  'test-smtp-config.js',
  'test-unified-system-activated.js',
  'test-unified-system-fixed.js',
  'test-unified-system.js',
  'test-upload-documents.js',
  'test-upload-final-new-mission.js',
  'test-upload-final.js',
  'test-upload-new-mission.js',
  'test-upload-simple.js',
  'test-upload-without-multer.js',
  'test-user-routes.js',
  'test-validate-finance-simple.js',
  'test-validation-final.js',
  'ultimate-token-fix.js',
  'update-missions-status.js',
  'verify-and-launch.js',
  'view-engineer-pdf.html',
  'view-pdf-example.js',
  'view-pdf-simple.html',
  'cleanup-unnecessary-files.js',
  'cleanup-for-deployment.js'
];

let deletedCount = 0;
let errorCount = 0;
let notFoundCount = 0;

console.log(`📊 ${filesToDelete.length} fichiers identifiés pour suppression\n`);

filesToDelete.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✅ Supprimé: ${file}`);
      deletedCount++;
    } else {
      notFoundCount++;
    }
  } catch (error) {
    console.error(`❌ Erreur suppression ${file}:`, error.message);
    errorCount++;
  }
});

console.log('\n📊 Résumé du nettoyage:');
console.log(`✅ Fichiers supprimés: ${deletedCount}`);
console.log(`⚠️  Fichiers non trouvés: ${notFoundCount}`);
console.log(`❌ Erreurs: ${errorCount}`);

console.log('\n🎉 Nettoyage terminé !');
console.log('\n📁 Fichiers essentiels conservés:');
console.log('  ✅ server.js');
console.log('  ✅ package.json & package-lock.json');
console.log('  ✅ database.sqlite');
console.log('  ✅ config/, controllers/, middleware/, routes/, services/');
console.log('  ✅ templates/, utils/, migrations/');
console.log('  ✅ assets/, fonts/, uploads/, logs/');

console.log('\n🚀 Votre application est maintenant prête pour le déploiement !');
console.log('\n📋 Checklist pré-déploiement:');
console.log('  ✅ Fichiers de test supprimés');
console.log('  ✅ Fichiers de debug supprimés');
console.log('  ✅ Fichiers de configuration temporaire supprimés');
console.log('  ✅ Documentation temporaire supprimée');
console.log('  ✅ Scripts de développement supprimés');
