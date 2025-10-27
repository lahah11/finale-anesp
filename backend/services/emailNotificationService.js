const nodemailer = require('nodemailer');

const EmailNotificationService = {
  // Configuration du transporteur email
  transporter: null,

  // Initialiser le transporteur
  initTransporter: () => {
    if (!EmailNotificationService.transporter) {
      // En mode développement, on simule l'envoi d'email
      if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-email@gmail.com') {
        console.log('📧 Mode développement : Simulation d\'envoi d\'email');
        EmailNotificationService.transporter = {
          sendMail: async (mailOptions) => {
            console.log('📧 Email simulé envoyé à:', mailOptions.to);
            console.log('📧 Sujet:', mailOptions.subject);
            console.log('📧 Contenu:', mailOptions.html ? 'HTML' : 'Texte');
            return { messageId: 'simulated-' + Date.now() };
          }
        };
      } else {
        EmailNotificationService.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          tls: {
            rejectUnauthorized: false
          },
          auth: {
            user: process.env.SMTP_USER || 'your-email@gmail.com',
            pass: process.env.SMTP_PASS || 'your-app-password'
          }
        });
      }
    }
    return EmailNotificationService.transporter;
  },

  // Envoyer notification de nouvelle mission
  sendMissionCreatedNotification: async (mission, participants, technicalValidator) => {
    try {
      const transporter = EmailNotificationService.initTransporter();
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@anesp.mr',
        to: technicalValidator.email,
        subject: `[ANESP] Nouvelle mission à valider - ${mission.mission_reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5aa0;">Nouvelle Mission à Valider</h2>
            <p>Bonjour,</p>
            <p>Une nouvelle mission nécessite votre validation technique :</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Détails de la mission :</h3>
              <p><strong>Référence :</strong> ${mission.mission_reference}</p>
              <p><strong>Objet :</strong> ${mission.mission_object}</p>
              <p><strong>Dates :</strong> ${mission.departure_date} → ${mission.return_date}</p>
              <p><strong>Moyen de transport :</strong> ${mission.transport_mode}</p>
              <p><strong>Participants :</strong> ${participants.length} personne(s)</p>
            </div>
            
            <p>Veuillez vous connecter au système pour valider ou refuser cette mission.</p>
            <p><a href="${process.env.FRONTEND_URL}/missions/${mission.id}" style="background-color: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Valider la mission</a></p>
            
            <p>Cordialement,<br>L'équipe ANESP</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Email de notification envoyé au Directeur Technique');
    } catch (error) {
      console.error('Erreur envoi email notification:', error);
    }
  },

  // Envoyer notification de validation technique
  sendTechnicalValidationNotification: async (mission, participants, logisticsValidator) => {
    try {
      const transporter = EmailNotificationService.initTransporter();
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@anesp.mr',
        to: logisticsValidator.email,
        subject: `[ANESP] Mission validée techniquement - ${mission.mission_reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Mission Validée Techniquement</h2>
            <p>Bonjour,</p>
            <p>La mission suivante a été validée techniquement et nécessite maintenant l'attribution des moyens logistiques :</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Détails de la mission :</h3>
              <p><strong>Référence :</strong> ${mission.mission_reference}</p>
              <p><strong>Objet :</strong> ${mission.mission_object}</p>
              <p><strong>Dates :</strong> ${mission.departure_date} → ${mission.return_date}</p>
              <p><strong>Moyen de transport :</strong> ${mission.transport_mode}</p>
            </div>
            
            <p>Veuillez vous connecter au système pour attribuer un véhicule et un chauffeur.</p>
            <p><a href="${process.env.FRONTEND_URL}/missions/${mission.id}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Attribuer les moyens</a></p>
            
            <p>Cordialement,<br>L'équipe ANESP</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Email de validation technique envoyé au Service Moyens Généraux');
    } catch (error) {
      console.error('Erreur envoi email validation technique:', error);
    }
  },

  // Cette fonction a été remplacée par sendMissionOrderWithPDF
  // L'ancienne fonction sendMissionOrderNotification a été supprimée

  // Envoyer notification de refus
  sendRejectionNotification: async (mission, participants, rejectionReason, rejectedBy) => {
    try {
      const transporter = EmailNotificationService.initTransporter();
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@anesp.mr',
        to: participants.map(p => p.email).join(', '),
        subject: `[ANESP] Mission refusée - ${mission.mission_reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Mission Refusée</h2>
            <p>Bonjour,</p>
            <p>La mission suivante a été refusée :</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Détails de la mission :</h3>
              <p><strong>Référence :</strong> ${mission.mission_reference}</p>
              <p><strong>Objet :</strong> ${mission.mission_object}</p>
              <p><strong>Dates :</strong> ${mission.departure_date} → ${mission.return_date}</p>
            </div>
            
            <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Motif du refus :</h3>
              <p>${rejectionReason}</p>
            </div>
            
            <p>Pour toute question, contactez le service des missions.</p>
            
            <p>Cordialement,<br>L'équipe ANESP</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Email de refus envoyé aux participants');
    } catch (error) {
      console.error('Erreur envoi email refus:', error);
    }
  },

  // Envoyer l'ordre de mission avec PDF en pièce jointe
  sendMissionOrderWithPDF: async (mission, participants, pdfPath) => {
    try {
      const transporter = EmailNotificationService.initTransporter();
      const fs = require('fs');
      const path = require('path');
      
      // Vérifier que le fichier PDF existe
      if (!fs.existsSync(pdfPath)) {
        console.error('❌ Fichier PDF non trouvé:', pdfPath);
        return;
      }
      
      // Lire le fichier PDF
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@anesp.mr',
        to: participants.map(p => p.email).join(', '),
        subject: `[ANESP] Ordre de Mission - ${mission.mission_reference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5aa0;">Ordre de Mission Validé</h2>
            <p>Bonjour,</p>
            <p>Votre mission a été validée définitivement par la Directrice Générale. L'ordre de mission officiel est joint à cet email.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c5aa0; margin-top: 0;">Détails de la Mission</h3>
              <p><strong>Référence :</strong> ${mission.mission_reference}</p>
              <p><strong>Objet :</strong> ${mission.mission_object}</p>
              <p><strong>Date de départ :</strong> ${new Date(mission.departure_date).toLocaleDateString('fr-FR')}</p>
              <p><strong>Date de retour :</strong> ${new Date(mission.return_date).toLocaleDateString('fr-FR')}</p>
              <p><strong>Moyen de transport :</strong> ${mission.transport_mode === 'car' ? 'Véhicule ANESP' : mission.transport_mode}</p>
              ${mission.departure_city ? `<p><strong>Ville de départ :</strong> ${mission.departure_city}</p>` : ''}
              ${mission.arrival_city ? `<p><strong>Ville d'arrivée :</strong> ${mission.arrival_city}</p>` : ''}
            </div>
            
            <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c5aa0; margin-top: 0;">📄 Document Officiel</h3>
              <p>L'<strong>Autorisation Préalable de Départ en Mission (APDM)</strong> est jointe à cet email en format PDF.</p>
              <p>Ce document officiel doit être présenté lors de votre départ en mission.</p>
            </div>
            
            <p><strong>Important :</strong> Conservez ce document avec vous pendant toute la durée de votre mission.</p>
            
            <p>Cordialement,<br>L'équipe ANESP</p>
          </div>
        `,
        attachments: [
          {
            filename: `Ordre-Mission-${mission.mission_reference}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };
      
      await transporter.sendMail(mailOptions);
      console.log('📧 Ordre de mission envoyé avec PDF en pièce jointe');
    } catch (error) {
      console.error('Erreur envoi ordre de mission:', error);
    }
  }
};

module.exports = EmailNotificationService;

