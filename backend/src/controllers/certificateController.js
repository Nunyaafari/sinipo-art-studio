import { v4 as uuidv4 } from 'uuid';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

// In-memory storage for certificates (replace with database in production)
let certificates = new Map();

// Initialize with sample data
const initializeCertificates = () => {
  certificates.set(1, [
    {
      id: 1,
      orderId: 1,
      productId: 1,
      productTitle: "Golden Horizon",
      artist: "Layla Mansour",
      purchaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      certificateNumber: "SIN-2026-001-4567",
      authenticity: "Verified",
      dimensions: "80 × 100 cm",
      medium: "Giclée fine art print",
      frame: "Gold hardwood",
      edition: "Limited Edition",
      issuedAt: new Date().toISOString()
    }
  ]);
};

initializeCertificates();

// Get user certificates
export const getCertificates = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userCertificates = certificates.get(userId) || [];
    
    res.json({
      success: true,
      data: userCertificates
    });

  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      error: 'Failed to get certificates',
      message: error.message
    });
  }
};

// Generate certificate for order
export const generateCertificate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId, productId, productTitle, artist, dimensions, medium, frame } = req.body;

    if (!orderId || !productId || !productTitle || !artist) {
      return res.status(400).json({
        error: 'Missing required certificate fields'
      });
    }

    const userCertificates = certificates.get(userId) || [];
    
    // Check if certificate already exists for this product in this order
    const existingCert = userCertificates.find(c => 
      c.orderId === parseInt(orderId) && c.productId === parseInt(productId)
    );

    if (existingCert) {
      return res.status(400).json({
        error: 'Certificate already exists for this item'
      });
    }

    // Generate unique certificate number
    const certificateNumber = `SIN-${new Date().getFullYear()}-${String(userCertificates.length + 1).padStart(3, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const newCertificate = {
      id: Math.max(...userCertificates.map(c => c.id), 0) + 1,
      orderId: parseInt(orderId),
      productId: parseInt(productId),
      productTitle,
      artist,
      purchaseDate: new Date().toISOString(),
      certificateNumber,
      authenticity: "Verified",
      dimensions: dimensions || "N/A",
      medium: medium || "Giclée fine art print",
      frame: frame || "Standard",
      edition: "Limited Edition",
      issuedAt: new Date().toISOString()
    };

    userCertificates.push(newCertificate);
    certificates.set(userId, userCertificates);

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: newCertificate
    });

  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({
      error: 'Failed to generate certificate',
      message: error.message
    });
  }
};

// Download certificate as PDF
export const downloadCertificate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const userCertificates = certificates.get(userId) || [];
    const certificate = userCertificates.find(c => c.id === parseInt(id));

    if (!certificate) {
      return res.status(404).json({
        error: 'Certificate not found'
      });
    }

    // Create PDF certificate
    const pdfBuffer = await generateCertificatePDF(certificate);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificateNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({
      error: 'Failed to download certificate',
      message: error.message
    });
  }
};

// Generate certificate as image
export const generateCertificateImage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const userCertificates = certificates.get(userId) || [];
    const certificate = userCertificates.find(c => c.id === parseInt(id));

    if (!certificate) {
      return res.status(404).json({
        error: 'Certificate not found'
      });
    }

    // Create certificate image
    const imageBuffer = await generateCertificateImageBuffer(certificate);

    // Set headers for image download
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.certificateNumber}.png"`);
    res.setHeader('Content-Length', imageBuffer.length);

    res.send(imageBuffer);

  } catch (error) {
    console.error('Generate certificate image error:', error);
    res.status(500).json({
      error: 'Failed to generate certificate image',
      message: error.message
    });
  }
};

// Verify certificate
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    // Search through all user certificates
    let foundCertificate = null;
    for (const [userId, userCerts] of certificates.entries()) {
      const cert = userCerts.find(c => c.certificateNumber === certificateNumber);
      if (cert) {
        foundCertificate = cert;
        break;
      }
    }

    if (!foundCertificate) {
      return res.status(404).json({
        error: 'Certificate not found',
        valid: false
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        certificateNumber: foundCertificate.certificateNumber,
        productTitle: foundCertificate.productTitle,
        artist: foundCertificate.artist,
        authenticity: foundCertificate.authenticity,
        purchaseDate: foundCertificate.purchaseDate,
        edition: foundCertificate.edition
      }
    });

  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({
      error: 'Failed to verify certificate',
      message: error.message
    });
  }
};

// Get certificate statistics
export const getCertificateStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userCertificates = certificates.get(userId) || [];

    const stats = {
      total: userCertificates.length,
      verified: userCertificates.filter(c => c.authenticity === "Verified").length,
      limitedEdition: userCertificates.filter(c => c.edition === "Limited Edition").length,
      artists: [...new Set(userCertificates.map(c => c.artist))].length
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get certificate stats error:', error);
    res.status(500).json({
      error: 'Failed to get certificate statistics',
      message: error.message
    });
  }
};

// Helper function to generate certificate PDF
const generateCertificatePDF = async (certificate) => {
  // Create a simple PDF-like buffer (in production, use a proper PDF library like PDFKit)
  const content = `
    CERTIFICATE OF AUTHENTICITY
    
    Certificate Number: ${certificate.certificateNumber}
    
    This certifies that the following artwork is an authentic piece:
    
    Title: ${certificate.productTitle}
    Artist: ${certificate.artist}
    Dimensions: ${certificate.dimensions}
    Medium: ${certificate.medium}
    Frame: ${certificate.frame}
    Edition: ${certificate.edition}
    
    Purchase Date: ${new Date(certificate.purchaseDate).toLocaleDateString()}
    Authenticity: ${certificate.authenticity}
    
    Issued by: Sinipo Art Studio
    Issue Date: ${new Date(certificate.issuedAt).toLocaleDateString()}
    
    This certificate serves as proof of authenticity for the above artwork.
    Please retain this certificate for your records.
  `;

  return Buffer.from(content, 'utf-8');
};

// Helper function to generate certificate image
const generateCertificateImageBuffer = async (certificate) => {
  // Create canvas
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#fafaf8';
  ctx.fillRect(0, 0, 800, 600);

  // Border
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 760, 560);

  // Inner border
  ctx.strokeStyle = '#0a0a0a';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, 740, 540);

  // Title
  ctx.fillStyle = '#0a0a0a';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF AUTHENTICITY', 400, 80);

  // Subtitle
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#c8a830';
  ctx.fillText('SINIPO ART STUDIO', 400, 110);

  // Certificate number
  ctx.font = '14px monospace';
  ctx.fillStyle = '#666';
  ctx.fillText(`Certificate No: ${certificate.certificateNumber}`, 400, 150);

  // Artwork details
  ctx.textAlign = 'left';
  ctx.font = 'bold 24px serif';
  ctx.fillStyle = '#0a0a0a';
  ctx.fillText(certificate.productTitle, 80, 200);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(`by ${certificate.artist}`, 80, 230);

  // Details grid
  const details = [
    ['Dimensions', certificate.dimensions],
    ['Medium', certificate.medium],
    ['Frame', certificate.frame],
    ['Edition', certificate.edition],
    ['Purchase Date', new Date(certificate.purchaseDate).toLocaleDateString()],
    ['Authenticity', certificate.authenticity]
  ];

  let y = 280;
  details.forEach(([label, value]) => {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(`${label}:`, 80, y);
    
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(value, 200, y);
    
    y += 30;
  });

  // Footer
  ctx.textAlign = 'center';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#999';
  ctx.fillText('This certificate serves as proof of authenticity for the above artwork.', 400, 500);
  ctx.fillText('Please retain this certificate for your records.', 400, 520);

  // Issue date
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(`Issued: ${new Date(certificate.issuedAt).toLocaleDateString()}`, 400, 550);

  return canvas.toBuffer('image/png');
};

// Export for use in other modules
export { certificates };