const transporter = require('../config/email');
const { query } = require('../config/database');
const fs = require('fs');

const emailService = {
  sendMissionOrder: async (missionId) => {
    try {
      if (process.env.NODE_ENV === 'development' && !process.env.GMAIL_USER) {
        console.log('⚠️ Email skipped in development (no GMAIL_USER configured)');
        return { success: false, reason: 'No email config in development' };
      }

      const missionResult = await query(
        `SELECT m.*, i.name AS institution_name
         FROM missions_unified m
         JOIN institutions i ON m.institution_id = i.id
         WHERE m.id = ?`,
        [missionId]
      );

      if (!missionResult.rows.length) {
        throw new Error('Mission not found');
      }

      const mission = missionResult.rows[0];

      const creatorResult = await query(
        'SELECT username, email FROM users WHERE id = ? LIMIT 1',
        [mission.created_by]
      );
      const creator = creatorResult.rows[0] || {};

      const documentResult = await query(
        `SELECT file_path
         FROM mission_unified_documents
         WHERE mission_id = ? AND document_type = 'mission_order'
         ORDER BY generated_at DESC
         LIMIT 1`,
        [missionId]
      );

      if (!documentResult.rows.length) {
        console.warn(`⚠️ No mission order document found for mission ${mission.mission_reference}`);
        return { success: false, reason: 'Mission order PDF missing' };
      }

      const pdfPath = documentResult.rows[0].file_path;
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        console.warn(`⚠️ PDF file not found: ${pdfPath}`);
        return { success: false, reason: 'PDF not found' };
      }

      const recipientEmail = creator.email;
      if (!recipientEmail) {
        console.warn(`⚠️ No email address for mission creator ${creator.username || mission.created_by}`);
        return { success: false, reason: 'No recipient email' };
      }

      const mailOptions = {
        from: {
          name: mission.institution_name,
          address: process.env.GMAIL_USER
        },
        to: recipientEmail,
        subject: `Ordre de Mission ${mission.mission_reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #006233, #FFD700); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Ordre de Mission</h1>
              <p style="color: white; margin: 5px 0;">République Islamique de Mauritanie</p>
            </div>

            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #006233;">Bonjour ${creator.username || 'Madame/Monsieur'},</h2>

              <p>Votre ordre de mission <strong>${mission.mission_reference}</strong> a été validé et approuvé.</p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #006233;">
                <h3 style="margin: 0 0 15px 0; color: #006233;">Détails de la mission</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #333;">Destination:</td>
                    <td style="padding: 8px; color: #666;">${mission.arrival_city_name || 'À préciser'}</td>
                  </tr>
                  <tr style="background: #f8f8f8;">
                    <td style="padding: 8px; font-weight: bold; color: #333;">Période:</td>
                    <td style="padding: 8px; color: #666;">Du ${new Date(mission.departure_date).toLocaleDateString('fr-FR')} au ${new Date(mission.return_date).toLocaleDateString('fr-FR')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #333;">Transport:</td>
                    <td style="padding: 8px; color: #666;">${mission.transport_mode}</td>
                  </tr>
                  <tr style="background: #f8f8f8;">
                    <td style="padding: 8px; font-weight: bold; color: #333;">Objet:</td>
                    <td style="padding: 8px; color: #666;">${mission.mission_object}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #006233;"><strong>📎 Votre ordre de mission officiel est en pièce jointe.</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Veuillez l'imprimer et le conserver durant vos déplacements.</p>
              </div>

              <p style="color: #666; font-size: 14px;">
                Pour toute question concernant votre mission, veuillez contacter le service des ressources humaines ou les Moyens Généraux.
              </p>
            </div>

            <div style="background: #006233; padding: 20px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 14px;">${mission.institution_name}</p>
              <p style="color: #FFD700; margin: 5px 0 0 0; font-size: 12px;">Honneur - Fraternité - Justice</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `Ordre_Mission_${mission.mission_reference}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf'
          }
        ]
      };

      const emailPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email timeout')), 10000)
      );

      await Promise.race([emailPromise, timeoutPromise]);

      return { success: true };
    } catch (error) {
      console.error('Send mission order email error:', error);
      return { success: false, reason: error.message };
    }
  }
};

module.exports = emailService;
