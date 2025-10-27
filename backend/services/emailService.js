const transporter = require('../config/email');
const { query } = require('../config/database');
const path = require('path');
const fs = require('fs');

const emailService = {
  sendMissionOrder: async (missionId) => {
    try {
      // Skip email in development if no email config
      if (process.env.NODE_ENV === 'development' && !process.env.GMAIL_USER) {
        console.log('⚠️ Email skipped in development (no GMAIL_USER configured)');
        return { success: false, reason: 'No email config in development' };
      }

      // Get mission and employee data
      const result = await query(
        `SELECT m.*, e.full_name, e.email, i.name as institution_name
         FROM missions m
         JOIN employees e ON m.employee_id = e.id
         JOIN institutions i ON m.institution_id = i.id
         WHERE m.id = $1`,
        [missionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Mission not found');
      }

      const mission = result.rows[0];

      if (!mission.email) {
        console.warn(`⚠️ No email address for employee ${mission.full_name}`);
        return { success: false, reason: 'No employee email' };
      }

      const pdfPath = path.join(__dirname, '..', mission.pdf_url);

      if (!fs.existsSync(pdfPath)) {
        console.warn(`⚠️ PDF file not found: ${pdfPath}`);
        return { success: false, reason: 'PDF not found' };
      }

      const mailOptions = {
        from: {
          name: mission.institution_name,
          address: process.env.GMAIL_USER
        },
        to: mission.email,
        subject: `Ordre de Mission N° ${mission.mission_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #006233, #FFD700); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Ordre de Mission</h1>
              <p style="color: white; margin: 5px 0;">République Islamique de Mauritanie</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #006233;">Bonjour ${mission.full_name},</h2>
              
              <p>Votre ordre de mission a été validé et approuvé.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #006233;">
                <h3 style="margin: 0 0 15px 0; color: #006233;">Détails de la Mission</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #333;">N° Mission:</td>
                    <td style="padding: 8px; color: #666;">${mission.mission_number}</td>
                  </tr>
                  <tr style="background: #f8f8f8;">
                    <td style="padding: 8px; font-weight: bold; color: #333;">Destination:</td>
                    <td style="padding: 8px; color: #666;">${mission.destination}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #333;">Dates:</td>
                    <td style="padding: 8px; color: #666;">Du ${new Date(mission.departure_date).toLocaleDateString('fr-FR')} au ${new Date(mission.return_date).toLocaleDateString('fr-FR')}</td>
                  </tr>
                  <tr style="background: #f8f8f8;">
                    <td style="padding: 8px; font-weight: bold; color: #333;">Transport:</td>
                    <td style="padding: 8px; color: #666;">${mission.transport_mode}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #006233;"><strong>📎 Votre ordre de mission officiel est en pièce jointe.</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Veuillez l'imprimer et le conserver pour vos déplacements.</p>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
                <p style="margin: 0; color: #856404;"><strong>🔒 Code QR de Vérification</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #856404;">Votre ordre de mission contient un code QR pour vérification par les autorités.</p>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Pour toute question concernant votre mission, veuillez contacter le service des ressources humaines.
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
            filename: `Ordre_Mission_${mission.mission_number}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf'
          }
        ]
      };

      // Add timeout to prevent hanging
      const emailPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 10000)
      );

      await Promise.race([emailPromise, timeoutPromise]);
      console.log(`✅ Mission order sent to ${mission.email}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Email sending error:', error.message);
      
      // Don't throw error - just log it and return status
      return { 
        success: false, 
        reason: error.code === 'ESOCKET' ? 'Network connection failed' : error.message 
      };
    }
  },

  sendUserCredentials: async (userEmail, username, password, institutionName) => {
    try {
      // Skip email in development if no email config
      if (process.env.NODE_ENV === 'development' && !process.env.GMAIL_USER) {
        console.log('⚠️ Email skipped in development (no GMAIL_USER configured)');
        return { success: false, reason: 'No email config in development' };
      }

      const mailOptions = {
        from: {
          name: 'Mission Order System',
          address: process.env.GMAIL_USER
        },
        to: userEmail,
        subject: 'Vos identifiants d\'accès - Système d\'Ordre de Mission',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #006233, #FFD700); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Système d'Ordre de Mission</h1>
              <p style="color: white; margin: 5px 0;">République Islamique de Mauritanie</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #006233;">Bienvenue!</h2>
              
              <p>Votre compte a été créé dans le système d'ordre de mission pour <strong>${institutionName}</strong>.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #006233;">
                <h3 style="margin: 0 0 15px 0; color: #006233;">Vos identifiants de connexion</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #333;">Nom d'utilisateur:</td>
                    <td style="padding: 8px; color: #666; font-family: monospace; background: #f8f8f8; border-radius: 4px;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; font-weight: bold; color: #333;">Mot de passe:</td>
                    <td style="padding: 8px; color: #666; font-family: monospace; background: #f8f8f8; border-radius: 4px;">${password}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
                <p style="margin: 0; color: #856404;"><strong>🔒 Sécurité</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #856404;">Nous vous recommandons fortement de changer votre mot de passe lors de votre première connexion.</p>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Pour accéder au système, contactez votre administrateur pour obtenir l'URL de connexion.
              </p>
            </div>
            
            <div style="background: #006233; padding: 20px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 14px;">Système d'Ordre de Mission</p>
              <p style="color: #FFD700; margin: 5px 0 0 0; font-size: 12px;">République Islamique de Mauritanie</p>
            </div>
          </div>
        `
      };

      // Add timeout to prevent hanging
      const emailPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 10000)
      );

      await Promise.race([emailPromise, timeoutPromise]);
      console.log(`✅ User credentials sent to ${userEmail}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Credentials email error:', error.message);
      return { 
        success: false, 
        reason: error.code === 'ESOCKET' ? 'Network connection failed' : error.message 
      };
    }
  }
};

module.exports = emailService;