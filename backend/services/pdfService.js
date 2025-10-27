const puppeteer = require("puppeteer");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const { query } = require("../config/database");
const moment = require("moment");

const htmlPdfService = {
  generateMissionPDF: async (missionId) => {
    try {
      // Get mission data with all related information
      const result = await query(
        `SELECT m.*, 
                e.full_name, e.matricule, e.position, e.passport_number,
                i.name as institution_name, i.type as institution_type, i.header_text, i.footer_text, i.logo_url,
                sdg.signed_by as dg_signed_by, sdg.title as dg_title, sdg.signature_url as dg_signature_url, sdg.stamp_url as dg_stamp_url,
                smsgg.signed_by as msgg_signed_by, smsgg.title as msgg_title, smsgg.signature_url as msgg_signature_url
         FROM missions m
         JOIN employees e ON m.employee_id = e.id
         JOIN institutions i ON m.institution_id = i.id
         LEFT JOIN signatures sdg ON i.id = sdg.institution_id AND sdg.role = 'dg' AND sdg.is_active = true
         LEFT JOIN signatures smsgg ON i.id = smsgg.institution_id AND smsgg.role = 'msgg' AND smsgg.is_active = true
         WHERE m.id = $1`,
        [missionId]
      );

      if (result.rows.length === 0) {
        throw new Error("Mission not found");
      }

      const mission = result.rows[0];

      // Generate QR Code
      const qrCodeData = mission.id.toString();
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
        width: 80,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: 'M'
      });

      // Read HTML template
      const templatePath = path.join(__dirname, "..", "templates", "mission-order.html");
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      // Format dates
      const frenchMonths = {
        '01': 'JANV', '02': 'FÉVR', '03': 'MARS', '04': 'AVR', '05': 'MAI', '06': 'JUIN',
        '07': 'JUIL', '08': 'AOÛT', '09': 'SEPT', '10': 'OCT', '11': 'NOV', '12': 'DÉC'
      };
      
      const dateObj = moment(mission.issue_date);
      const day = dateObj.format("DD");
      const month = frenchMonths[dateObj.format("MM")];
      const year = dateObj.format("YYYY");
      const formattedDate = `${day} ${month} ${year}`;

      // Format mission number
      const formattedMissionNumber = mission.mission_number.toString().padStart(5, "0");
      const displayNumber = `${formattedMissionNumber}`;

      // Format departure and return dates
      const departureDate = moment(mission.departure_date).format("DD/MM/YYYY");
      const returnDate = moment(mission.return_date).format("DD/MM/YYYY");

      // Load images as base64
      const getImageAsBase64 = (imagePath) => {
        try {
          if (imagePath && fs.existsSync(path.join(__dirname, "..", imagePath))) {
            const imageBuffer = fs.readFileSync(path.join(__dirname, "..", imagePath));
            const ext = path.extname(imagePath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          }
        } catch (error) {
          console.warn(`Could not load image: ${imagePath}`, error.message);
        }
        return null;
      };

      const coatOfArmsBase64 = getImageAsBase64("assets/mauritania-coat-of-arms.png");
      const agencyLogoBase64 = getImageAsBase64(mission.logo_url);
      const signatureBase64 = getImageAsBase64(mission.dg_signature_url);
      const stampBase64 = getImageAsBase64(mission.dg_stamp_url);

      // Replace placeholders in HTML template
      const replacements = {
        '{{DATE_VALUE}}': formattedDate,
        '{{MISSION_NUMBER}}': displayNumber,
        '{{FULL_NAME}}': mission.full_name || '',
        '{{MATRICULE}}': mission.matricule || '',
        '{{PASSPORT_NUMBER}}': mission.passport_number || 'N/A',
        '{{POSITION}}': mission.position || '',
        '{{DESTINATION}}': mission.destination || '',
        '{{TRANSPORT_MODE}}': mission.transport_mode || '',
        '{{OBJECTIVE}}': mission.objective || '',
        '{{DEPARTURE_DATE}}': departureDate,
        '{{RETURN_DATE}}': returnDate,
        '{{SIGNER_NAME}}': mission.dg_signed_by || '',
        '{{QR_CODE_DATA_URL}}': qrCodeDataURL,
        '{{COAT_OF_ARMS_BASE64}}': coatOfArmsBase64 || '',
        '{{AGENCY_LOGO_BASE64}}': agencyLogoBase64 || '',
        '{{SIGNATURE_BASE64}}': signatureBase64 || '',
        '{{STAMP_BASE64}}': stampBase64 || ''
      };

      // Apply replacements
      Object.entries(replacements).forEach(([placeholder, value]) => {
        htmlTemplate = htmlTemplate.replace(new RegExp(placeholder, 'g'), value);
      });

      // Update HTML template with actual images
      if (coatOfArmsBase64) {
        htmlTemplate = htmlTemplate.replace(
          'background: url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23006600" stroke="%23004400" stroke-width="2"/><polygon points="50,20 60,40 40,40" fill="%23FFD700"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="8">COAT</text><text x="50" y="75" text-anchor="middle" fill="white" font-size="8">ARMS</text></svg>\') no-repeat center;',
          `background: url('${coatOfArmsBase64}') no-repeat center;`
        );
      }

      if (qrCodeDataURL) {
        htmlTemplate = htmlTemplate.replace(
          'background: url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><rect x="0" y="0" width="20" height="20" fill="black"/><rect x="40" y="0" width="20" height="20" fill="black"/><rect x="80" y="0" width="20" height="20" fill="black"/><rect x="0" y="40" width="20" height="20" fill="black"/><rect x="80" y="40" width="20" height="20" fill="black"/><rect x="0" y="80" width="20" height="20" fill="black"/><rect x="40" y="80" width="20" height="20" fill="black"/><rect x="80" y="80" width="20" height="20" fill="black"/></svg>\') no-repeat center;',
          `background: url('${qrCodeDataURL}') no-repeat center;`
        );
      }

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set page content
      await page.setContent(htmlTemplate, {
        waitUntil: 'networkidle0'
      });

      // Generate PDF
      const fileName = `mission-${mission.mission_number}-${Date.now()}.pdf`;
      const filePath = path.join(
        process.env.UPLOAD_PATH || "./uploads",
        "pdfs",
        fileName
      );

      // Ensure directory exists
      const pdfDir = path.dirname(filePath);
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      await page.pdf({
        path: filePath,
        format: 'A4',
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        },
        printBackground: true,
        preferCSSPageSize: true
      });

      await browser.close();

      return `/uploads/pdfs/${fileName}`;

    } catch (error) {
      console.error("HTML PDF generation error:", error);
      throw error;
    }
  },

  // Alternative method using HTML template with data injection
  generateMissionPDFWithTemplate: async (missionId) => {
    try {
      // Get mission data
      const result = await query(
        `SELECT m.*, 
                e.full_name, e.matricule, e.position, e.passport_number,
                i.name as institution_name, i.type as institution_type, i.header_text, i.footer_text, i.logo_url,
                sdg.signed_by as dg_signed_by, sdg.title as dg_title, sdg.signature_url as dg_signature_url, sdg.stamp_url as dg_stamp_url
         FROM missions m
         JOIN employees e ON m.employee_id = e.id
         JOIN institutions i ON m.institution_id = i.id
         LEFT JOIN signatures sdg ON i.id = sdg.institution_id AND sdg.role = 'dg' AND sdg.is_active = true
         WHERE m.id = $1`,
        [missionId]
      );

      if (result.rows.length === 0) {
        throw new Error("Mission not found");
      }

      const mission = result.rows[0];

      // Generate QR Code
      const qrCodeDataURL = await QRCode.toDataURL(mission.id.toString(), {
        width: 80,
        margin: 1,
        errorCorrectionLevel: 'M'
      });

      // Create HTML content with embedded data
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            /* Include your CSS here - copy from the artifact above */
            ${this.getCSS()}
          </style>
        </head>
        <body>
          ${this.getHTMLBody(mission, qrCodeDataURL)}
          
          <script>
            // Auto-populate data
            document.addEventListener('DOMContentLoaded', function() {
              populateMissionData(${JSON.stringify(mission)});
            });
          </script>
        </body>
        </html>
      `;

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const fileName = `mission-${mission.mission_number}-${Date.now()}.pdf`;
      const filePath = path.join(
        process.env.UPLOAD_PATH || "./uploads",
        "pdfs",
        fileName
      );

      // Ensure directory exists
      const pdfDir = path.dirname(filePath);
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      await page.pdf({
        path: filePath,
        format: 'A4',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        printBackground: true
      });

      await browser.close();
      return `/uploads/pdfs/${fileName}`;

    } catch (error) {
      console.error("Template PDF generation error:", error);
      throw error;
    }
  },

  getCSS: () => {
    // Return the CSS from the HTML artifact
    return `
      /* Copy the CSS from the HTML artifact above */
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
      /* ... rest of CSS ... */
    `;
  },

  getHTMLBody: (mission, qrCodeDataURL) => {
    // Return the HTML body with dynamic data
    return `
      <div class="page">
        <!-- Copy the HTML structure from the artifact above -->
        <!-- Replace static values with mission data -->
      </div>
    `;
  }
};

module.exports = htmlPdfService;